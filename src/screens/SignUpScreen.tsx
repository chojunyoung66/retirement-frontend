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

function getSignUpErrorMessage(code: string): string {
  if (code === 'DUPLICATE_EMAIL') return '이미 사용 중인 이메일입니다';
  return '회원가입 중 오류가 발생했습니다';
}

const signUpSchema = z.object({
  name: z.string().min(1, { message: '이름을 입력해주세요' }),
  email: z.string().email({ message: '올바른 이메일 형식이 아니에요' }),
  password: z.string().min(8, { message: '비밀번호는 8자 이상이어야 해요' }),
});

interface LocationState {
  from?: string;
}

export default function SignUpScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const handleSubmit = async () => {
    const result = signUpSchema.safeParse({ name, email, password });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === 'name') fieldErrors.name = issue.message;
        if (key === 'email') fieldErrors.email = issue.message;
        if (key === 'password') fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      await signup(result.data);
      dispatch(showToast('회원가입이 완료되었어요'));
      const state = location.state as LocationState | null;
      const returnTo = state?.from ?? searchParams.get('returnTo') ?? '/result';
      navigate(returnTo, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError
        ? getSignUpErrorMessage(err.errorCode)
        : '회원가입 중 오류가 발생했습니다';
      dispatch(showToast(message));
    }
  };

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">회원가입</h2>
      <p className="card-subtitle mb-16">결과 저장을 위해 계정을 만들어주세요.</p>

      <Input
        label="이름"
        type="text"
        value={name}
        onChange={setName}
        placeholder="홍길동"
        error={errors.name}
      />
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
        <Button onClick={handleSubmit}>회원가입</Button>
      </div>
      <div className="mt-8">
        <Button
          variant="secondary"
          onClick={() => navigate('/signin', { state: location.state })}
        >
          이미 계정이 있어요
        </Button>
      </div>
    </div>
  );
}
