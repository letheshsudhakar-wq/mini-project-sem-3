import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { nativeService } from '../services/nativeService';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
  hideToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options?: { duration?: number; action?: { label: string; onClick: () => void } }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const duration = options?.duration ?? 4000;

      // Trigger tactile haptic
      if (type === 'success') nativeService.triggerHaptic('success');
      else if (type === 'error') nativeService.triggerHaptic('error');
      else if (type === 'warning') nativeService.triggerHaptic('warning');
      else nativeService.triggerHaptic('light');

      const newToast: Toast = {
        id,
        message,
        type,
        duration,
        action: options?.action,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [hideToast]
  );

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, success, error, warning, info }}>
      {children}
      {/* Native-style Floating Toast Container (top centered on mobile, top right on desktop) */}
      <div 
        aria-live="polite"
        className="fixed top-4 sm:top-6 inset-x-0 sm:inset-x-auto sm:right-6 z-[9999] flex flex-col items-center sm:items-end gap-2.5 px-4 pointer-events-none"
      >
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              bg: 'bg-slate-900 text-white border-emerald-500/40',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
            },
            error: {
              bg: 'bg-slate-900 text-white border-rose-500/40',
              icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
            },
            warning: {
              bg: 'bg-slate-900 text-white border-amber-500/40',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            },
            info: {
              bg: 'bg-slate-900 text-white border-blue-500/40',
              icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full max-w-sm p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-top-3 fade-in duration-200 transition-all ${typeConfig.bg}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {typeConfig.icon}
                <p className="text-xs sm:text-sm font-medium text-slate-100 leading-snug">
                  {toast.message}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      hideToast(toast.id);
                    }}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => hideToast(toast.id)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                  aria-label="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
