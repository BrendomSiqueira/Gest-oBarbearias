
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'lilac' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const base = "inline-flex items-center justify-center font-black rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap uppercase tracking-widest";
  
  const variants = {
    primary: "bg-elite-red-500 hover:bg-elite-red-400 text-white focus:ring-elite-red-500 shadow-lg shadow-elite-red-900/40 border-b-4 border-elite-red-700 hover:border-elite-red-600",
    lilac: "bg-elite-lilac-600 hover:bg-elite-lilac-500 text-white focus:ring-elite-lilac-500 border-b-4 border-elite-lilac-800 shadow-elite-lilac-900/40",
    cyan: "bg-elite-cyan-500 hover:bg-elite-cyan-400 text-black focus:ring-elite-cyan-500 border-b-4 border-elite-cyan-700 shadow-elite-cyan-900/40",
    secondary: "bg-slate-900 hover:bg-elite-lilac-900/30 text-elite-lilac-400 border border-elite-lilac-900/50",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-600 border-b-4 border-emerald-800",
    danger: "bg-rose-700 hover:bg-rose-600 text-white focus:ring-rose-600",
    warning: "bg-amber-500 hover:bg-amber-400 text-black focus:ring-amber-500 border-b-4 border-amber-700",
    ghost: "bg-transparent hover:bg-elite-lilac-900/10 text-stone-400 hover:text-elite-red-500"
  };

  const sizes = {
    sm: "px-3 py-2 text-[10px]",
    md: "px-5 py-3 text-xs",
    lg: "px-8 py-4 text-sm"
  };

  return (
    <button 
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export const Input: React.FC<{ label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, error, ...props }) => (
  <div className="w-full space-y-2">
    {label && <label className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-[0.2em] ml-1">{label}</label>}
    <input
      {...props}
      className={`w-full bg-slate-950/40 border ${error ? 'border-red-500' : 'border-slate-800'} focus:border-elite-red-500 focus:ring-1 focus:ring-elite-red-500/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-700 transition-all outline-none text-sm font-bold ${props.className || ''}`}
    />
    {error && <p className="text-[10px] font-black text-red-500 mt-1 ml-1 uppercase tracking-wider">{error}</p>}
  </div>
);

export const Card: React.FC<{ title?: string; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, actions, children, className = '' }) => (
  <div className={`bg-slate-900/60 backdrop-blur-xl border border-elite-lilac-950/50 rounded-2xl overflow-hidden shadow-2xl relative ${className}`}>
    {(title || icon) && (
      <div className="px-6 py-5 border-b border-elite-lilac-950/30 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          {icon && <div className="text-elite-red-500">{icon}</div>}
          {title && <h3 className="text-[11px] font-black text-slate-100 uppercase tracking-[0.15em] leading-none">{title}</h3>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'lilac' | 'cyan';
  className?: string;
}> = ({ children, variant = 'info', className = '' }) => {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    danger: "bg-elite-red-500/10 text-elite-red-400 border-elite-red-500/20",
    info: "bg-elite-cyan-500/10 text-elite-cyan-400 border-elite-cyan-500/20",
    primary: "bg-elite-red-500/10 text-elite-red-500 border-elite-red-500/20",
    lilac: "bg-elite-lilac-500/10 text-elite-lilac-400 border-elite-lilac-500/20",
    cyan: "bg-elite-cyan-500/10 text-elite-cyan-400 border-elite-cyan-500/20"
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
