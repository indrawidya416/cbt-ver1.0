import React, { useEffect } from 'react';

export const Card: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`card ${className}`}>{children}</div>
);

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, icon, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
    <div className="flex items-start gap-3">
      {icon && (
        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xl shadow-sm">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: string;
  tone?: 'teal' | 'blue' | 'amber' | 'rose' | 'violet';
}> = ({ label, value, hint, icon, tone = 'teal' }) => {
  const tones: Record<string, string> = {
    teal: 'from-brand-500 to-brand-700',
    blue: 'from-sky-500 to-blue-600',
    amber: 'from-amber-400 to-orange-500',
    rose: 'from-rose-500 to-pink-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="card p-4 sm:p-5 flex items-center justify-between gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1 leading-none">{value}</p>
        {hint && <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2 font-medium truncate">{hint}</p>}
      </div>
      <div
        className={`w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center text-xl sm:text-2xl shadow-md`}
      >
        {icon}
      </div>
    </div>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'teal' | 'blue' | 'amber' | 'rose' | 'slate' | 'violet' | 'emerald';
}> = ({ children, tone = 'slate' }) => {
  const tones: Record<string, string> = {
    teal: 'bg-brand-100 text-brand-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-600',
    violet: 'bg-violet-100 text-violet-700',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
};

export const Modal: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ open, title, subtitle, onClose, children, footer, size = 'md' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto no-print">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-2xl shadow-2xl animate-slideUp my-8`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg w-8 h-8 flex items-center justify-center transition"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon = '📭', title, description, action }) => (
  <div className="text-center py-14 px-6">
    <div className="text-5xl mb-3 opacity-70">{icon}</div>
    <h3 className="text-base font-bold text-slate-700">{title}</h3>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  hint?: string;
}> = ({ label, children, hint }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const ProgressBar: React.FC<{ value: number; tone?: string }> = ({
  value,
  tone = 'bg-brand-500',
}) => (
  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
    <div
      className={`h-full ${tone} rounded-full transition-all duration-500`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

/* Toast sederhana */
export const Toast: React.FC<{ message: string | null; tone?: 'success' | 'error' }> = ({
  message,
  tone = 'success',
}) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slideUp no-print">
      <div
        className={`px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${
          tone === 'success' ? 'bg-slate-800' : 'bg-rose-600'
        }`}
      >
        <span>{tone === 'success' ? '✅' : '⚠️'}</span>
        {message}
      </div>
    </div>
  );
};

export const useToast = (timeout = 2600) => {
  const [toast, setToast] = React.useState<{ message: string; tone: 'success' | 'error' } | null>(
    null,
  );
  const show = (message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), timeout);
  };
  const node = <Toast message={toast?.message ?? null} tone={toast?.tone} />;
  return { show, node };
};
