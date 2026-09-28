import React from 'react';
import clsx from 'clsx';

export const FormField = React.forwardRef(({ 
  label, error, className, as = 'input', options = [], ...props 
}, ref) => {
  const Component = as === 'textarea' ? 'textarea' : as === 'select' ? 'select' : 'input';
  
  const inputClasses = clsx(
    "w-full rounded-lg border bg-white px-4 py-2.5 text-sm transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
    "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
    error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300",
    as === 'textarea' ? "min-h-[100px] resize-y" : "h-11"
  );
  
  return (
    <div className={clsx("flex flex-col gap-1.5 mb-4", className)}>
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      {as === 'select' ? (
        <select
          ref={ref}
          className={inputClasses}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <Component 
          ref={ref}
          className={inputClasses}
          {...props}
        />
      )}
      {error && <span className="text-xs text-red-600 font-medium">{error.message || error}</span>}
    </div>
  );
});
FormField.displayName = 'FormField';