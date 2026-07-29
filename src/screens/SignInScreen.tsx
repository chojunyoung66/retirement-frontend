import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";
import Input from "../components/Input";
import Button from "../components/Button";
import { showToast, showPersistentToast } from "../store/toast-slice";
import type { AppDispatch } from "../store/store";

function getAuthErrorMessage(code: string): string {
  if (code === "INVALID_CREDENTIALS")
    return "이메일 또는 비밀번호가 올바르지 않습니다";
  if (code === "USER_NOT_FOUND") return "존재하지 않는 계정입니다";
  return "로그인 중 오류가 발생했습니다";
}

function getGoogleErrorMessage(code: string): string {
  if (code === "POPUP_CLOSED")
    return "로그인 팝업이 닫혔어요. 다시 시도해주세요";
  if (code === "NETWORK_ERROR") return "네트워크 오류가 발생했어요";
  if (code === "INVALID_GOOGLE_TOKEN")
    return "Google 인증에 실패했어요. 다시 시도해주세요";
  if (code === "ACCESS_DENIED") return "미검증 이메일로는 연결할 수 없어요";
  return "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요";
}

// 회원가입/API 요청 스키마(8자 이상)와 동일하게 통일
const signInSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식이 아니에요" }),
  password: z.string().min(8, { message: "비밀번호는 8자 이상이어야 해요" }),
});

interface LocationState {
  from?: string;
}

export default function SignInScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, googleLogin } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [googleStatus, setGoogleStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [googleError, setGoogleError] = useState<string | null>(null);

  const getReturnTo = () => {
    const state = location.state as LocationState | null;
    return state?.from ?? searchParams.get("returnTo") ?? "/result";
  };

  const handleGoogleLogin = () => {
    if (!window.google) {
      setGoogleError(
        "Google 로그인을 불러오는 중이에요. 잠시 후 다시 시도해주세요",
      );
      return;
    }
    setGoogleStatus("loading");
    setGoogleError(null);

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
      callback: async ({ credential }) => {
        try {
          await googleLogin(credential);
          setGoogleStatus("success");
          dispatch(showToast("Google 계정으로 로그인되었어요"));
          navigate(getReturnTo(), { replace: true });
        } catch (err) {
          setGoogleStatus("error");
          const code = err instanceof ApiError ? err.errorCode : "UNKNOWN";
          setGoogleError(getGoogleErrorMessage(code));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.prompt((n) => {
      if (n.isNotDisplayed() || n.isSkippedMoment()) {
        setGoogleStatus("error");
        setGoogleError(getGoogleErrorMessage("POPUP_CLOSED"));
      }
    });
  };

  const handleSubmit = async () => {
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === "email") fieldErrors.email = issue.message;
        if (key === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    dispatch(showPersistentToast("로그인 중..."));
    try {
      await login(result.data);
      dispatch(showToast("로그인되었어요"));
      navigate(getReturnTo(), { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? getAuthErrorMessage(err.errorCode)
          : "로그인 중 오류가 발생했습니다";
      dispatch(showToast(message));
    }
  };

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">로그인</h2>
      <p className="card-subtitle mb-16">결과 저장을 위해 로그인해주세요.</p>

      <Input
        label="이메일"
        type="text"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        error={errors.email}
      />
      <Input
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="8자 이상"
        error={errors.password}
      />

      <div className="mt-16">
        <Button onClick={handleSubmit}>로그인</Button>
      </div>

      <div className="mt-8">
        <Button
          variant="secondary"
          onClick={handleGoogleLogin}
          disabled={googleStatus === "loading"}
        >
          {googleStatus === "loading" ? "구글 로그인 중..." : "Google로 로그인"}
        </Button>
        {googleError && (
          <p
            style={{
              color: "var(--error, #e74c3c)",
              fontSize: 13,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            {googleError}
          </p>
        )}
      </div>

      <div className="mt-8">
        <Button
          variant="secondary"
          onClick={() => navigate("/signup", { state: location.state })}
        >
          회원가입
        </Button>
      </div>
      <div className="mt-8">
        <Button variant="secondary" onClick={() => navigate("/")}>
          홈으로
        </Button>
      </div>
    </div>
  );
}
