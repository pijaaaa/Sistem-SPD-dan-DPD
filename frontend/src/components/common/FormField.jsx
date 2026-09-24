import React from 'react';
import clsx from 'clsx';

export const FormField = React.forwardRef(({ 
  label, error, className, as = 'input', options = [], ...props 
}, ref) => {
  const Component = as === 'textarea' ? 'textarea' : as === 'select' ? 'select' : 'input';
  
  return (
    <div className={clsx("flex flex-col gap-1 mb-4", className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      {as === 'select' ? (
        <select
          ref={ref}
          className={clsx(
            "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            error && "border-red-500 focus:ring-red-500"
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <Component 
          ref={ref}
          className={clsx(
            "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            error && "border-red-500 focus:ring-red-500"
          )}
          {...props}
        />
      )}
      {error && <span className="text-xs text-red-500">{error.message || error}</span>}
    </div>
  );
});
FormField.displayName = 'FormField';