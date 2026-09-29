import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({ 
  className, variant = 'primary', size = 'md', isLoading, children, ...props 
}, ref) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm hover:shadow",
    secondary: "bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400 border border-gray-300 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-400",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm hover:shadow"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-5 text-base",
    icon: "h-10 w-10"
  };

  return (
    <button 
      ref={ref} 
      className={clsx(baseStyle, variants[variant], sizes[size], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});
Button.displayName = 'Button';