import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center space-y-3', className)}>
      <div className="relative">
        <div
          className={clsx(
            'animate-spin rounded-full border-2 border-muted border-t-primary',
            sizes[size]
          )}
        />
        <div
          className={clsx(
            'absolute inset-0 rounded-full border-2 border-transparent border-t-primary/50 animate-pulse',
            sizes[size]
          )}
        />
      </div>
      {text && (
        <p className={clsx('text-muted-foreground font-medium', textSizes[size])}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;