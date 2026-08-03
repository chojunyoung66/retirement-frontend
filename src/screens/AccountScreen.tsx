import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import { useDiagnosis } from "../hooks/useDiagnosis";
import {
  deleteAccountRequest,
  getUserProfile,
  WITHDRAWAL_PHRASE,
  type UserProfile,
} from "../api/user-api";
import { ApiError } from "../api/client";
import Input from "../components/Input";
import Button from "../components/Button";
import { showToast } from "../store/toast-slice";
import type { AppDispatch } from "../store/store";
import { clearClientRetirementSession } from "../utils/pension-draft";

function getDeleteErrorMessage(code: string): string {
  if (code === "INVALID_CREDENTIALS") return "비밀번호가 올바르지 않아요";
  if (code === "INVALID_REQUEST") return "탈퇴 확인 정보가 올바르지 않아요";
  return "탈퇴 처리 중 오류가 발생했어요";
}

export default function AccountScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { dispatch: diagnosisDispatch } = useDiagnosis();
  const dispatch = useDispatch<AppDispatch>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [phrase, setPhrase] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch((err: unknown) => {
        const code = err instanceof ApiError ? err.errorCode : undefined;
        setLoadError(
          code === "UNAUTHORIZED"
            ? "로그인이 필요해요. 다시 로그인해 주세요."
            : code
              ? `계정 정보를 불러오지 못했어요 (${code})`
              : "계정 정보를 불러오지 못했어요",
        );
      });
  }, []);

  const handleDelete = async () => {
    if (!profile) return;
    setFormError(undefined);

    if (profile.hasPassword) {
      if (password.length < 8) {
        setFormError("비밀번호는 8자 이상이어야 해요");
        return;
      }
    } else {
      if (emailConfirm !== profile.email || phrase !== WITHDRAWAL_PHRASE) {
        setFormError(
          `이메일을 정확히 입력하고, 확인 문구에 「${WITHDRAWAL_PHRASE}」를 입력해 주세요`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (profile.hasPassword) {
        await deleteAccountRequest({ password });
      } else {
        await deleteAccountRequest({
          emailConfirm,
          phrase: WITHDRAWAL_PHRASE,
        });
      }
      // 로컬 진단 세션·연금/시뮬 초안 정리 (서버 cascade와 별개로 기기 잔여 제거)
      diagnosisDispatch({ type: "RESET" });
      clearClientRetirementSession();
      await logout();
      dispatch(showToast("계정이 삭제되었어요"));
      navigate("/", { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : "UNKNOWN";
      setFormError(getDeleteErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="screen-content">
        <h2 className="card-title mb-8">계정</h2>
        <p className="card-subtitle">{loadError}</p>
        <div className="mt-16">
          <Button variant="secondary" onClick={() => navigate("/")}>
            홈으로
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="screen-content">
        <h2 className="card-title mb-8">계정</h2>
        <p className="card-subtitle">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">계정</h2>
      <p className="card-subtitle mb-16">
        {profile.name} · {profile.email}
      </p>

      <h3 className="card-title mb-8" style={{ fontSize: "1.1rem" }}>
        회원 탈퇴
      </h3>
      <p className="card-subtitle mb-16">
        진단·시뮬레이션 데이터가 즉시 삭제되며 복구할 수 없습니다.
      </p>

      {profile.hasPassword ? (
        <Input
          label="현재 비밀번호"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="8자 이상"
          error={formError}
        />
      ) : (
        <>
          <Input
            label="이메일 확인"
            type="text"
            value={emailConfirm}
            onChange={setEmailConfirm}
            placeholder={profile.email}
            error={formError}
          />
          <Input
            label={`확인 문구 («${WITHDRAWAL_PHRASE}» 입력)`}
            type="text"
            value={phrase}
            onChange={setPhrase}
            placeholder={WITHDRAWAL_PHRASE}
          />
        </>
      )}

      <div className="mt-16">
        <Button onClick={handleDelete} disabled={submitting}>
          {submitting ? "처리 중..." : "계정 삭제하기"}
        </Button>
      </div>
      <div className="mt-8">
        <Button variant="secondary" onClick={() => navigate("/")}>
          취소
        </Button>
      </div>
    </div>
  );
}
