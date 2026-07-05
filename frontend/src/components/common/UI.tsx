import React from 'react';
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
  const base = 'inline-flex items-center justify-center font-sans font-medium text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none px-4 py-2.5';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 focus:ring-slate-500 shadow-xs',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600'
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
          <span>Processing...</span>
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

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label htmlFor={id} className="font-sans font-medium text-xs text-slate-600">
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={id}
          className={`font-sans text-sm rounded-lg border px-3.5 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 placeholder-slate-400
          ${
            error
              ? "border-red-400 bg-red-50/10 focus:ring-red-500/10 focus:border-red-500"
              : "border-slate-200 bg-white"
          } ${className}`}
          {...props}
        />

        {error && (
          <div className="flex items-center space-x-1.5 text-red-600 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-sans text-xs font-medium">{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-lg w-full z-10 overflow-hidden animate-slide-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
              <h3 className="font-display font-semibold text-base text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 max-h-[80vh] overflow-y-auto font-sans text-slate-600">
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
    <span className={`inline-flex items-center font-mono text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
};

// --- STATUS BADGE ---
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string; style: string }> = {
    // Project / Task states
    todo: { label: 'To Do', style: 'bg-slate-100 text-slate-700 border border-slate-200' },
    in_progress: { label: 'In Progress', style: 'bg-blue-50 text-blue-700 border border-blue-200' },
    done: { label: 'Completed', style: 'bg-green-50 text-green-700 border border-green-200' },
    on_hold: { label: 'On Hold', style: 'bg-amber-50 text-amber-700 border border-amber-200' },
    overdue: { label: 'Overdue', style: 'bg-red-50 text-red-700 border border-red-200' },
    
    // Priorities
    low: { label: 'Low', style: 'bg-slate-100 text-slate-600' },
    medium: { label: 'Medium', style: 'bg-amber-100 text-amber-800' },
    high: { label: 'High', style: 'bg-red-100 text-red-800' },

    // Roles
    admin: { label: 'Admin', style: 'bg-purple-100 text-purple-800' },
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
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-dashed border-slate-200 rounded-xl max-w-md mx-auto my-6">
      {icon ? (
        <div className="text-slate-300 mb-4">{icon}</div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400 font-display font-medium text-lg">
          !
        </div>
      )}
      <h4 className="font-display font-semibold text-slate-800 text-base mb-1">{title}</h4>
      <p className="font-sans text-sm text-slate-500 mb-5 leading-relaxed">{description}</p>
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
