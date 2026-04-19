export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeStyles = {
    sm: { width: '20px', height: '20px', borderWidth: '2px' },
    md: { width: '32px', height: '32px', borderWidth: '3px' },
    lg: { width: '48px', height: '48px', borderWidth: '4px' },
  };

  const style = {
    ...sizeStyles[size],
    border: `${sizeStyles[size].borderWidth} solid var(--border-color)`,
    borderTopColor: 'var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  return (
    <div
      className={`inline-block ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    />
  );
}

export interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

export function Skeleton({ width = '100%', height = '20px', className = '', circle }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        width,
        height,
        backgroundColor: 'var(--background-tertiary)',
        borderRadius: circle ? '50%' : '4px',
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <Skeleton width="60%" height="24px" className="mb-16" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '40%' : '100%'} height="16px" className="mb-8" />
      ))}
    </div>
  );
}
