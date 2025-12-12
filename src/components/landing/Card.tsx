import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'hover' | 'elevated' | 'interactive' | 'gradient' | 'accent' | 'bordered' | 'minimal';
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  default: 'card',
  hover: 'card-hover',
  elevated: 'card-elevated',
  interactive: 'card-interactive',
  gradient: 'card-gradient',
  accent: 'card-accent',
  bordered: 'card-bordered',
  minimal: 'card-minimal',
};

export default function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
}: CardProps) {
  const baseClasses = variantClasses[variant];
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}

