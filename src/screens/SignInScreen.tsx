import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';

function getAuthErrorMessage(code: string): string {
  if (code === 'INVALID_CREDENTIALS') return '이메일 또는 비밀번호가 올바르지 않습니다';
  if (code === 'USER_NOT_FOUND') return '존재하지 않는 계정입니다';
  return '로그인 중 오류가 발생했습니다';
}

const signInSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 형식이 아니에요' }),
  password: z.string().min(6, { message: '비밀번호는 6자 이상이어야 해요' }),
});

interface LocationState {
  from?: string;
}

export default function SignInScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async () => {
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === 'email') fieldErrors.email = issue.message;
        if (key === 'password') fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      await login(result.data);
      dispatch(showToast('로그인되었어요'));
      const state = location.state as LocationState | null;
      const returnTo = state?.from ?? searchParams.get('returnTo') ?? '/result';
      navigate(returnTo, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError
        ? getAuthErrorMessage(err.errorCode)
        : '로그인 중 오류가 발생했습니다';
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
        placeholder="6자 이상"
        error={errors.password}
      />

      <div className="mt-16">
        <Button onClick={handleSubmit}>로그인</Button>
      </div>
      <div className="mt-8">
        <Button
          variant="secondary"
          onClick={() => navigate('/signup', { state: location.state })}
        >
          회원가입
        </Button>
      </div>
      <div className="mt-8">
        <Button variant="secondary" onClick={() => navigate('/')}>
          홈으로
        </Button>
      </div>
    </div>
  );
}
