import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';
import { resolveSafeReturnTo } from '../utils/safe-return-to';

function getSignUpErrorMessage(code: string): string {
  // 서버는 존재·가입 방식을 구분하지 않음 (열거 방지)
  if (code === 'REGISTRATION_UNAVAILABLE' || code === 'DUPLICATE_EMAIL') {
    return '이 이메일로는 새로 가입할 수 없어요. 이미 계정이 있다면 로그인해 주세요. Google로 가입했다면 Google 로그인을 이용해 주세요';
  }
  return '회원가입 중 오류가 발생했습니다';
}

const signUpSchema = z
  .object({
    name: z.string().min(1, { message: '이름을 입력해주세요' }),
    email: z.string().email({ message: '올바른 이메일 형식이 아니에요' }),
    password: z.string().min(8, { message: '비밀번호는 8자 이상이어야 해요' }).max(72, { message: '비밀번호는 72자 이하여야 해요' }),
    passwordConfirm: z.string().min(1, { message: '비밀번호 확인을 입력해주세요' }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않아요',
    path: ['passwordConfirm'],
  });

interface LocationState {
  from?: string;
  intent?: 'save';
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
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    passwordConfirm?: string;
  }>({});

  const handleSubmit = async () => {
    const result = signUpSchema.safeParse({
      name,
      email,
      password,
      passwordConfirm,
    });
    if (!result.success) {
      const fieldErrors: {
        name?: string;
        email?: string;
        password?: string;
        passwordConfirm?: string;
      } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === 'name') fieldErrors.name = issue.message;
        if (key === 'email') fieldErrors.email = issue.message;
        if (key === 'password') fieldErrors.password = issue.message;
        if (key === 'passwordConfirm') fieldErrors.passwordConfirm = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      // 서버에는 확인 필드 없이 전송
      await signup({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
      });
      dispatch(showToast('회원가입이 완료되었어요'));
      const state = location.state as LocationState | null;
      const returnTo = resolveSafeReturnTo(
        state?.from ?? searchParams.get('returnTo'),
        '/result',
      );
      navigate(returnTo, {
        replace: true,
        state: state?.intent ? { intent: state.intent } : undefined,
      });
    } catch (err) {
      const code = err instanceof ApiError ? err.errorCode : undefined;
      const message = code
        ? getSignUpErrorMessage(code)
        : '회원가입 중 오류가 발생했습니다';
      dispatch(showToast(message));
    }
  };

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">회원가입</h2>
      <p className="card-subtitle mb-16">
        결과 확인은 로그인 없이 가능해요. 저장하려면 계정을 만들어주세요.
      </p>

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
      <Input
        label="비밀번호 확인"
        type="password"
        value={passwordConfirm}
        onChange={setPasswordConfirm}
        placeholder="비밀번호를 다시 입력"
        error={errors.passwordConfirm}
      />

      <div className="mt-16">
        <Button onClick={handleSubmit}>회원가입</Button>
      </div>
      <p className="form-hint mt-8" style={{ textAlign: 'center' }}>
        가입하면{' '}
        <Link to="/privacy">개인정보처리방침</Link>
        {' · '}
        <Link to="/terms">이용약관</Link>
        에 동의한 것으로 봐요.
      </p>
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
