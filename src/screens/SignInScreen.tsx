import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";
import Input from "../components/Input";
import Button from "../components/Button";
import { showToast, hideToast } from "../store/toast-slice";
import type { AppDispatch } from "../store/store";
import { resolveSafeReturnTo } from "../utils/safe-return-to";
import { warmBackend } from "../utils/warm-backend";

function getAuthErrorMessage(code: string): string {
  if (code === "INVALID_CREDENTIALS")
    return "이메일 또는 비밀번호가 올바르지 않습니다";
  if (code === "USER_NOT_FOUND") return "존재하지 않는 계정입니다";
  return "로그인 중 오류가 발생했습니다";
}

function getGoogleErrorMessage(code: string): string {
  if (code === "NETWORK_ERROR")
    return "서버 응답이 지연되고 있어요. 첫 요청은 최대 1분 걸릴 수 있으니, 끝날 때까지 Google 버튼을 다시 누르지 말아 주세요";
  if (code === "INVALID_GOOGLE_TOKEN")
    return "Google 인증에 실패했어요. 다시 시도해주세요";
  if (code === "ACCESS_DENIED") return "미검증 이메일로는 연결할 수 없어요";
  if (code === "GOOGLE_ACCOUNT_IN_USE")
    return "이 Google 계정은 다른 사용자에게 이미 연결되어 있어요";
  if (code === "INVALID_CREDENTIALS") return "비밀번호가 올바르지 않아요";
  if (code === "TOO_MANY_REQUESTS")
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요";
  return "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요";
}

/** Google ID Token 페이로드에서 이메일만 표시용으로 추출 (서명 검증 없음) */
function readEmailFromGoogleIdToken(idToken: string): string | null {
  try {
    const part = idToken.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized)) as { email?: unknown };
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}

const signInSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식이 아니에요" }),
  password: z
    .string()
    .min(8, { message: "비밀번호는 8자 이상이어야 해요" })
    .max(72, { message: "비밀번호는 72자 이하여야 해요" }),
});

interface LocationState {
  from?: string;
  intent?: "save";
}

// StrictMode/재진입 시 initialize 중복 호출 방지
let gsiInitializedClientId: string | null = null;

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
  const [googleSlowHint, setGoogleSlowHint] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  // Google 연결 대기: ACCOUNT_LINK_REQUIRED 시 idToken 보관
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<
    string | null
  >(null);
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState<string | null>(
    null,
  );
  const [linkPassword, setLinkPassword] = useState("");
  const [linkError, setLinkError] = useState<string | undefined>();
  const [linkLoading, setLinkLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const linkPanelRef = useRef<HTMLDivElement>(null);
  // 콜드스타트 중 중복 Google 콜백 무시
  const googleInFlightRef = useRef(false);
  // 미설정·빈 문자열이면 GSI 초기화 생략 (콘솔 "client ID is not found" 방지)
  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  )?.trim();

  useEffect(() => {
    // Render 슬립 대비 — 로그인 화면 진입 시 백엔드 깨우기
    warmBackend();
    // 이전 화면에서 남은 지속 토스트가 비밀번호 패널 없이 메시지만 남는 현상 방지
    dispatch(hideToast());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google 요청이 5초 넘으면 콜드스타트 안내로 전환
  useEffect(() => {
    if (!googleLoading) {
      setGoogleSlowHint(false);
      return;
    }
    const timer = window.setTimeout(() => setGoogleSlowHint(true), 5000);
    return () => window.clearTimeout(timer);
  }, [googleLoading]);

  const getReturnTo = () => {
    const state = location.state as LocationState | null;
    return resolveSafeReturnTo(
      state?.from ?? searchParams.get("returnTo"),
      "/result",
    );
  };

  // 로그인 후 복귀 시 저장 intent 유지
  const navigateAfterAuth = () => {
    const state = location.state as LocationState | null;
    navigate(getReturnTo(), {
      replace: true,
      state: state?.intent ? { intent: state.intent } : undefined,
    });
  };

  // initialize 콜백은 최신 핸들러를 참조 (재initialize 불필요)
  const googleCredentialHandlerRef = useRef<(credential: string) => void>(
    () => {},
  );
  googleCredentialHandlerRef.current = async (credential: string) => {
    // 콜드스타트 대기 중 2·3회 연타는 무시
    if (googleInFlightRef.current) return;
    googleInFlightRef.current = true;
    setGoogleLoading(true);
    setGoogleError(null);
    setPendingGoogleIdToken(null);
    try {
      await googleLogin(credential);
      dispatch(showToast("Google 계정으로 로그인되었어요"));
      navigateAfterAuth();
    } catch (err) {
      setGoogleLoading(false);
      const code = err instanceof ApiError ? err.errorCode : "UNKNOWN";
      // 기존 이메일 계정이면 비밀번호 재인증 연결 UI로 전환
      if (code === "ACCOUNT_LINK_REQUIRED") {
        const linkedEmail = readEmailFromGoogleIdToken(credential);
        setPendingGoogleIdToken(credential);
        setPendingGoogleEmail(linkedEmail);
        if (linkedEmail) setEmail(linkedEmail);
        setLinkPassword("");
        setLinkError(undefined);
        // 지속 토스트 대신 아래 비밀번호 확인 패널이 주 UI
        dispatch(hideToast());
        requestAnimationFrame(() => {
          linkPanelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        return;
      }
      setGoogleError(getGoogleErrorMessage(code));
    } finally {
      googleInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!googleClientId || pendingGoogleIdToken) return;

    const container = googleBtnRef.current;
    if (!container) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const initBtn = () => {
      if (cancelled || !window.google || !container) return false;

      // client ID당 initialize는 한 번만
      if (gsiInitializedClientId !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            googleCredentialHandlerRef.current(credential);
          },
        });
        gsiInitializedClientId = googleClientId;
      }

      // 재마운트 시 버튼 중복 렌더 방지
      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        locale: "ko",
        width: container.offsetWidth || 350,
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
  }, [googleClientId, pendingGoogleIdToken]);

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

    dispatch(showToast("로그인 중..."));
    try {
      await login(result.data);
      dispatch(showToast("로그인되었어요"));
      navigateAfterAuth();
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
      dispatch(
        showToast(
          "Google 연결 완료. 다음부터는 Google 버튼만으로 로그인돼요",
        ),
      );
      navigateAfterAuth();
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : "UNKNOWN";
      if (code === "INVALID_GOOGLE_TOKEN") {
        setLinkError(
          "인증 유효 시간이 지났어요. 취소 후 Google 버튼을 다시 눌러 주세요",
        );
      } else {
        setLinkError(getGoogleErrorMessage(code));
      }
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">로그인</h2>

      <p className="card-subtitle mb-16">
        결과 확인은 로그인 없이 가능해요. 저장하려면 로그인해주세요.
      </p>

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
          <p className="form-hint mb-8" style={{ textAlign: "center" }}>
            이미 이메일로 가입했다면, Google 로그인 후{" "}
            <strong>비밀번호 확인</strong>이 한 번 더 필요할 수 있어요.
          </p>
          <p className="form-hint mb-8" style={{ textAlign: "center" }}>
            첫 접속·새벽 이후에는 서버 준비에 최대 1분 걸릴 수 있어요. 응답이
            올 때까지 Google 버튼을 다시 누르지 말아 주세요.
          </p>
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
                padding: 8,
              }}
            >
              <div className="btn-google-spinner" />
              <span style={{ fontSize: 14, color: "#3c4043", fontWeight: 500 }}>
                {googleSlowHint
                  ? "서버를 깨우는 중이에요. 최대 1분 걸릴 수 있어요"
                  : "로그인 중..."}
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
        <div
          ref={linkPanelRef}
          className="card mt-16"
          style={{
            borderColor: "var(--primary)",
            background: "var(--primary-light, #eef6f4)",
          }}
        >
          <div className="card-title" style={{ fontSize: "1.1rem" }}>
            Google 연결 — 비밀번호 확인
          </div>
          <p className="card-subtitle mt-8">
            Google 계정 선택은 끝났어요.{" "}
            <strong>이메일 가입 때 사용한 비밀번호</strong>를 입력한 뒤 아래
            연결 버튼을 눌러 주세요. (Google 비밀번호가 아니에요)
          </p>
          {pendingGoogleEmail && (
            <p className="form-hint mt-8">
              연결할 이메일: <strong>{pendingGoogleEmail}</strong>
            </p>
          )}
          <div className="mt-12">
            <Input
              label="이메일 계정 비밀번호"
              type="password"
              value={linkPassword}
              onChange={setLinkPassword}
              placeholder="가입할 때 사용한 비밀번호"
              hint="이 단계의 「비밀번호 확인 후 Google 연결」을 눌러야 연결이 완료돼요"
              error={linkError}
              autoFocus
            />
          </div>
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
                setPendingGoogleEmail(null);
                setLinkPassword("");
                setLinkError(undefined);
                dispatch(hideToast());
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
