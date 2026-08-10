import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

const STYLES = {
  success: {
    ring: 'ring-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    ring: 'ring-red-200',
    iconBg: 'bg-red-100 text-red-600',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM8.28 6.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 6.22Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    ring: 'ring-sky-200',
    iconBg: 'bg-sky-100 text-sky-600',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = STYLES[toast.type] ?? STYLES.info;
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-lg ring-1 ${style.ring} animate-[toast-in_0.2s_ease-out]`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
      >
        {style.icon}
      </span>
      <p className="min-w-0 flex-1 py-1 text-sm font-medium text-slate-800">
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label="Cerrar aviso"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

/** Proveedor global de avisos tipo toast (éxito, error, info). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      setTimeout(() => dismiss(id), opts.duration ?? 4500);
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (message, opts) => push('success', message, opts),
      error: (message, opts) => push('error', message, opts),
      info: (message, opts) => push('info', message, opts),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
