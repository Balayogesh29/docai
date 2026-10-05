import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './Button';

// Loading State Spinner
export const LoadingState = ({ message = 'Loading content...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

// Skeleton Loader
export const SkeletonCard = () => {
  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white animate-pulse space-y-3 shadow-premium">
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded"></div>
        <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-3 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded w-16"></div>
      </div>
    </div>
  );
};

// Empty State View
export const EmptyState = ({
  title = 'No documents found',
  description = 'Get started by creating a new document or using a template.',
  icon: Icon = Inbox,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl ${className}`}>
      <div className="p-3 bg-white rounded-full shadow-premium border border-slate-100 mb-4">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

// Error State View
export const ErrorState = ({
  title = 'An error occurred',
  message = 'Failed to load data. Please check your connection and try again.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 bg-red-50 border border-dashed border-red-200 rounded-xl ${className}`}>
      <div className="p-3 bg-white rounded-full shadow-premium border border-red-100 mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-xs text-red-600 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button size="sm" variant="danger" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
