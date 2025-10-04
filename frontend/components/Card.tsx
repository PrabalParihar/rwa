import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  borderColor?: 'primary' | 'green' | 'blue' | 'yellow' | 'red' | 'none';
}

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  borderColor = 'none',
}: CardProps) {
  const borderColors = {
    primary: 'border-l-4 border-primary-500',
    green: 'border-l-4 border-green-500',
    blue: 'border-l-4 border-blue-500',
    yellow: 'border-l-4 border-yellow-500',
    red: 'border-l-4 border-red-500',
    none: '',
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${borderColors[borderColor]} ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-xl font-semibold text-gray-900 mb-1">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
