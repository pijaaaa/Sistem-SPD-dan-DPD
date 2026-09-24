import React from 'react';
import clsx from 'clsx';

export const Button = React.forwardRef(({ 
  className, variant = 'primary', size = 'md', isLoading, children, ...props 
}, ref) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700"
  };
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-8 text-lg",
    icon: "h-10 w-10"
  };

  return (
    <button 
      ref={ref} 
      className={clsx(baseStyle, variants[variant], sizes[size], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="mr-2 animate-spin">⏳</span> : null}
      {children}
    </button>
  );
});
Button.displayName = 'Button';