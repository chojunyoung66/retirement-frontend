import { useState, useEffect, useRef } from "react";
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
  if (code === "NETWORK_ERROR") return "네트워크 오류가 발생했어요";
  if (code === "INVALID_GOOGLE_TOKEN")
    return "Google 인증에 실패했어요. 다시 시도해주세요";
  if (code === "ACCESS_DENIED") return "미검증 이메일로는 연결할 수 없어요";
  if (code === "GOOGLE_ACCOUNT_IN_USE")
    return "이 Google 계정은 다른 사용자에게 이미 연결되어 있어요";
  if (code === "INVALID_CREDENTIALS")
    return "비밀번호가 올바르지 않아요";
  return "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요";
}

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
  const { login, googleLogin, linkGoogleAccount } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  // Google 연결 대기: ACCOUNT_LINK_REQUIRED 시 idToken 보관
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<
    string | null
  >(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkError, setLinkError] = useState<string | undefined>();
  const [linkLoading, setLinkLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  // 미설정·빈 문자열이면 GSI 초기화 생략 (콘솔 "client ID is not found" 방지)
  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  )?.trim();

  const getReturnTo = () => {
    const state = location.state as LocationState | null;
    return state?.from ?? searchParams.get("returnTo") ?? "/result";
  };

  useEffect(() => {
    if (!googleClientId) return;

    const container = googleBtnRef.current;
    if (!container) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const initBtn = () => {
      if (!window.google || !container) return false;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setGoogleLoading(true);
          setGoogleError(null);
          setPendingGoogleIdToken(null);
          try {
            await googleLogin(credential);
            dispatch(showToast("Google 계정으로 로그인되었어요"));
            navigate(getReturnTo(), { replace: true });
          } catch (err) {
            setGoogleLoading(false);
            const code = err instanceof ApiError ? err.errorCode : "UNKNOWN";
            // 기존 이메일 계정이면 비밀번호 재인증 연결 UI로 전환
            if (code === "ACCOUNT_LINK_REQUIRED") {
              setPendingGoogleIdToken(credential);
              setLinkPassword("");
              setLinkError(undefined);
              return;
            }
            setGoogleError(getGoogleErrorMessage(code));
          }
        },
      });

      // requestAnimationFrame으로 DOM 렌더 후 실제 width 측정
      requestAnimationFrame(() => {
        window.google!.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "ko",
          width: container.offsetWidth || 350,
        });
      });

      return true;
    };

    // client ID가 있을 때만 GSI 스크립트 로드
    const ensureGsi = () => {
      if (window.google) {
        initBtn();
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-gsi-client="true"]',
      );
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.dataset.gsiClient = "true";
        document.head.appendChild(script);
      }
      let attempts = 0;
      pollTimer = setInterval(() => {
        if (cancelled) {
          clearInterval(pollTimer);
          return;
        }
        attempts += 1;
        if (initBtn() || attempts >= 12) clearInterval(pollTimer);
      }, 250);
    };

    ensureGsi();
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId]);

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

  const handleLinkGoogle = async () => {
    if (!pendingGoogleIdToken) return;
    if (linkPassword.length < 8) {
      setLinkError("비밀번호는 8자 이상이어야 해요");
      return;
    }
    setLinkLoading(true);
    setLinkError(undefined);
    try {
      await linkGoogleAccount(pendingGoogleIdToken, linkPassword);
      dispatch(showToast("Google 계정이 연결되었어요"));
      navigate(getReturnTo(), { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : "UNKNOWN";
      setLinkError(getGoogleErrorMessage(code));
    } finally {
      setLinkLoading(false);
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

      {googleClientId && !pendingGoogleIdToken && (
        <div className="mt-8" style={{ position: "relative" }}>
          {/* Google renderButton이 여기에 마운트됨 */}
          <div ref={googleBtnRef} style={{ width: "100%", minHeight: 44 }} />

          {googleLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(255,255,255,0.92)",
                borderRadius: 4,
              }}
            >
              <div className="btn-google-spinner" />
              <span style={{ fontSize: 15, color: "#3c4043", fontWeight: 500 }}>
                로그인 중...
              </span>
            </div>
          )}

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
      )}

      {pendingGoogleIdToken && (
        <div className="mt-16">
          <p className="card-subtitle mb-8">
            이미 이메일로 가입된 계정이에요. 비밀번호를 확인하면 Google 계정을
            연결합니다.
          </p>
          <Input
            label="계정 비밀번호 확인"
            type="password"
            value={linkPassword}
            onChange={setLinkPassword}
            placeholder="8자 이상"
            error={linkError}
          />
          <div className="mt-8">
            <Button onClick={handleLinkGoogle} disabled={linkLoading}>
              {linkLoading ? "연결 중..." : "비밀번호 확인 후 Google 연결"}
            </Button>
          </div>
          <div className="mt-8">
            <Button
              variant="secondary"
              onClick={() => {
                setPendingGoogleIdToken(null);
                setLinkPassword("");
                setLinkError(undefined);
              }}
            >
              취소
            </Button>
          </div>
        </div>
      )}

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
