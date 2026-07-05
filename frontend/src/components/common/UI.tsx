import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-sans font-semibold text-xs rounded-xl tracking-wide uppercase transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none px-5 py-3 transform hover:-translate-y-0.5 active:translate-y-0';
  
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white focus:ring-indigo-500',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:shadow-md focus:ring-slate-500',
    danger: 'bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20 text-white focus:ring-rose-500',
    ghost: 'bg-transparent hover:bg-slate-100/80 text-slate-600'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-[10px] tracking-widest uppercase">Processing...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', id, ...props }, ref) => {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="font-sans font-medium text-xs text-slate-600 tracking-tight">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`font-sans text-sm rounded-xl border px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-50 placeholder-slate-400/80 shadow-xs
          ${error ? 'border-rose-400 bg-rose-50/10 focus:ring-rose-500/10 focus:border-rose-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        {...props}
      />
      {error && (
        <div className="flex items-center space-x-1.5 text-rose-600 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-sans text-xs font-semibold">{error}</span>
        </div>
      )}
    </div>
  );
});

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100/80 max-w-lg w-full z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100/80 px-6 py-5 bg-slate-50/30">
              <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 rounded-xl p-2 hover:bg-slate-100 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-[80vh] overflow-y-auto font-sans text-slate-600">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- BADGE ---
export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-center font-sans text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-lg ${className}`}>
      {children}
    </span>
  );
};

// --- STATUS BADGE ---
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string; style: string }> = {
    // Project / Task states
    todo: { label: 'To Do', style: 'bg-slate-100 text-slate-700 border border-slate-200/50' },
    in_progress: { label: 'In Progress', style: 'bg-indigo-50 text-indigo-700 border border-indigo-200/50' },
    done: { label: 'Completed', style: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' },
    on_hold: { label: 'On Hold', style: 'bg-amber-50 text-amber-700 border border-amber-200/50' },
    overdue: { label: 'Overdue', style: 'bg-rose-50 text-rose-700 border border-rose-200/50' },
    
    // Priorities
    low: { label: 'Low', style: 'bg-slate-100 text-slate-600' },
    medium: { label: 'Medium', style: 'bg-amber-100 text-amber-800' },
    high: { label: 'High', style: 'bg-rose-100 text-rose-800' },

    // Roles
    admin: { label: 'Admin', style: 'bg-violet-100 text-violet-800' },
    chef_projet: { label: 'Chef de Projet', style: 'bg-indigo-100 text-indigo-800' },
    developer: { label: 'Developer', style: 'bg-teal-100 text-teal-800' }
  };

  const current = configs[status.toLowerCase()] || { label: status, style: 'bg-slate-100 text-slate-700' };

  return <Badge className={current.style}>{current.label}</Badge>;
};

// --- EMPTY STATE ---
interface EmptyStateProps {
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, ctaText, onCtaClick, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-dashed border-slate-200 rounded-2xl max-w-md mx-auto my-6 shadow-xs">
      {icon ? (
        <div className="text-slate-300 mb-4 bg-slate-50 p-4 rounded-2xl">{icon}</div>
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-slate-400 font-display font-bold text-lg">
          !
        </div>
      )}
      <h4 className="font-display font-bold text-slate-800 text-base mb-1 tracking-tight">{title}</h4>
      <p className="font-sans text-xs text-slate-500 mb-5 leading-relaxed">{description}</p>
      {ctaText && onCtaClick && (
        <Button onClick={onCtaClick} variant="secondary">
          {ctaText}
        </Button>
      )}
    </div>
  );
};

// --- SKELETON LOADING ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-150 rounded-lg ${className}`} />;
};
