import React from 'react';

export const Badge = ({
  children,
  variant = 'default', // default, success, warning, danger, info, brand
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase';
  
  const variants = {
    default: 'bg-slate-100 text-slate-800',
    brand: 'bg-brand-50 text-brand-700 border border-brand-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    info: 'bg-sky-50 text-sky-700 border border-sky-100'
  };

  const currentStyles = `${baseStyles} ${variants[variant] || variants.default} ${className}`;

  return (
    <span className={currentStyles} {...props}>
      {children}
    </span>
  );
};
