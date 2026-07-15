import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  fullWidth = true,
}: ButtonProps) {
  const className =
    variant === 'primary'
      ? 'btn-cta'
      : variant === 'secondary'
        ? 'btn-secondary'
        : 'btn-back';

  const style = fullWidth ? undefined : { width: 'auto' };

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
