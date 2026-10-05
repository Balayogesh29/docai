import React from 'react';

export const Input = React.forwardRef(({
  label,
  type = 'text',
  id,
  error,
  helperText,
  className = '',
  icon: Icon,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={`block w-full rounded-lg border text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 py-2 ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 text-slate-800 placeholder-slate-400 focus:ring-brand-500'
          }`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600" id={`${inputId}-error`}>
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-500" id={`${inputId}-description`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
