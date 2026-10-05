import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  actions,
  hoverable = false,
  className = '',
  bodyClassName = 'p-6',
  ...props
}) => {
  const cardStyles = `bg-white border border-slate-200 rounded-xl overflow-hidden shadow-premium ${
    hoverable ? 'hover:shadow-premium-hover hover:border-slate-300 transition-all duration-200 cursor-pointer' : ''
  } ${className}`;

  return (
    <div className={cardStyles} {...props}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
};
