
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'lilac' | 'cyan' | 'gold' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  icon,
  iconPosition = 'left',
  className = '', 
  ...props 
}) => {
  const base = "inline-flex items-center justify-center font-black rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap uppercase tracking-wider select-none touch-manipulation cursor-pointer gap-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-elite-red-600 via-elite-red-500 to-elite-red-600 hover:from-elite-red-500 hover:to-elite-red-400 text-white shadow-md shadow-elite-red-950/60 hover:shadow-lg hover:shadow-elite-red-600/30 border border-elite-red-400/40 focus:ring-elite-red-500",
    lilac: "bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white shadow-md shadow-purple-950/60 border border-purple-400/30 focus:ring-purple-500",
    cyan: "bg-gradient-to-r from-elite-cyan-500 to-elite-cyan-400 hover:from-elite-cyan-400 hover:to-cyan-300 text-slate-950 font-black shadow-md shadow-elite-cyan-950/60 border border-cyan-300/40 focus:ring-elite-cyan-400",
    gold: "bg-gradient-to-r from-amber-500 via-[#E1B15F] to-amber-500 hover:from-[#E1B15F] hover:to-amber-400 text-slate-950 font-black shadow-md shadow-amber-950/60 border border-amber-300/40 focus:ring-amber-400",
    secondary: "bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 shadow-sm focus:ring-slate-400",
    outline: "bg-transparent hover:bg-white/5 text-slate-200 hover:text-white border border-white/15 hover:border-white/30 focus:ring-white/40",
    success: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-950/60 hover:shadow-emerald-600/25 border border-emerald-400/40 focus:ring-emerald-500",
    danger: "bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white shadow-md shadow-rose-950/60 hover:shadow-rose-600/25 border border-rose-400/30 focus:ring-rose-500",
    warning: "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black shadow-md shadow-amber-950/60 border border-amber-300/40 focus:ring-amber-500",
    ghost: "bg-transparent hover:bg-white/10 text-slate-400 hover:text-white border border-transparent hover:border-white/10 focus:ring-white/20"
  };

  const sizes = {
    xs: "h-8 px-2.5 text-[10px]",
    sm: "h-9 sm:h-9.5 px-3.5 text-[11px]",
    md: "h-10 sm:h-11 px-4.5 text-xs",
    lg: "h-12 px-6 text-sm"
  };

  return (
    <button 
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};

export const IconButton: React.FC<{
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'cyan' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({
  icon,
  variant = 'secondary',
  size = 'md',
  title,
  className = '',
  disabled,
  type = 'button',
  onClick
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs rounded-lg',
    md: 'h-9 sm:h-10 w-9 sm:w-10 text-sm rounded-xl',
    lg: 'h-11 w-11 text-base rounded-xl'
  };

  const variantClasses = {
    primary: 'bg-elite-red-500/15 hover:bg-elite-red-500 text-elite-red-400 hover:text-white border border-elite-red-500/30',
    secondary: 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-white/20',
    success: 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30',
    danger: 'bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30',
    cyan: 'bg-elite-cyan-500/15 hover:bg-elite-cyan-500 text-elite-cyan-400 hover:text-slate-950 border border-elite-cyan-500/30',
    warning: 'bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
  };

  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon}
    </button>
  );
};

export const Input: React.FC<{ label?: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, error, hint, ...props }) => (
  <div className="w-full space-y-1.5">
    {label && (
      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-0.5">
        {label}
      </label>
    )}
    <input
      {...props}
      className={`w-full bg-slate-950/70 border ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-white/10 hover:border-white/20 focus:border-elite-red-500 focus:ring-elite-red-500/25'} focus:ring-2 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 transition-all outline-none text-sm font-medium min-h-[44px] shadow-inner ${props.className || ''}`}
    />
    {hint && !error && <p className="text-[10px] text-slate-500 font-medium ml-1">{hint}</p>}
    {error && <p className="text-[11px] font-semibold text-rose-400 mt-1 ml-1 flex items-center gap-1">{error}</p>}
  </div>
);

export const Card: React.FC<{ 
  title?: string; 
  subtitle?: string;
  icon?: React.ReactNode; 
  actions?: React.ReactNode; 
  children: React.ReactNode; 
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}> = ({ 
  title, 
  subtitle,
  icon, 
  actions, 
  children, 
  className = '',
  headerClassName = '',
  bodyClassName = '',
  noPadding = false
}) => (
  <div className={`bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.12] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl transition-all relative ${className}`}>
    {(title || icon || actions) && (
      <div className={`px-4 py-3 sm:px-6 sm:py-4 border-b border-white/[0.06] flex items-center justify-between bg-slate-950/50 backdrop-blur-md gap-3 ${headerClassName}`}>
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="h-8 w-8 rounded-xl bg-elite-red-500/10 border border-elite-red-500/20 text-elite-red-400 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {title && (
              <h3 className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wider leading-tight truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={noPadding ? bodyClassName : `p-4 sm:p-6 ${bodyClassName}`}>
      {children}
    </div>
  </div>
);

export const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  color?: 'red' | 'emerald' | 'amber' | 'cyan' | 'slate';
  className?: string;
  onClick?: () => void;
}> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  color = 'slate',
  className = '',
  onClick
}) => {
  const colorMap = {
    red: 'border-elite-red-500/25 bg-elite-red-500/5 hover:border-elite-red-500/40 text-elite-red-400',
    emerald: 'border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40 text-emerald-400',
    amber: 'border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 text-amber-400',
    cyan: 'border-elite-cyan-500/25 bg-elite-cyan-500/5 hover:border-elite-cyan-500/40 text-elite-cyan-400',
    slate: 'border-white/[0.08] bg-slate-900/60 hover:border-white/15 text-slate-400'
  };

  const iconBgMap = {
    red: 'bg-elite-red-500/10 border-elite-red-500/20 text-elite-red-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    cyan: 'bg-elite-cyan-500/10 border-elite-cyan-500/20 text-elite-cyan-400',
    slate: 'bg-slate-800/80 border-white/10 text-slate-300'
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-xl backdrop-blur-xl transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${colorMap[color]} ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 leading-tight truncate">
          {title}
        </p>
        {icon && (
          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBgMap[color]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight italic leading-none truncate">
          {value}
        </div>
        {(subtitle || badge) && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {badge}
            {subtitle && (
              <span className="text-[11px] text-slate-400 font-medium">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'lilac' | 'cyan' | 'neutral' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}> = ({ children, variant = 'info', size = 'sm', className = '' }) => {
  const styles = {
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    danger: "bg-elite-red-500/15 text-elite-red-400 border-elite-red-500/30",
    info: "bg-elite-cyan-500/15 text-elite-cyan-400 border-elite-cyan-500/30",
    primary: "bg-elite-red-500/15 text-elite-red-400 border-elite-red-500/30",
    lilac: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    cyan: "bg-elite-cyan-500/15 text-elite-cyan-400 border-elite-cyan-500/30",
    gold: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    neutral: "bg-slate-800/90 text-slate-300 border-white/10"
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-black uppercase tracking-wider border whitespace-nowrap leading-none ${sizeStyles[size]} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

