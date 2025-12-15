import React, { createContext, useContext, useEffect, useState } from "react";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  duration?: number; // ms
  variant?: "info" | "success" | "warning" | "error";
};

type ToastContextValue = {
  push: (message: string, options?: Partial<Omit<ToastItem, "id" | "message">>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
  push: () => {},
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Small, dependency-free toast provider.
 * Usage:
 *   const { push } = useToast();
 *   push("Test data imported", { variant: "success", duration: 6000 });
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = (
    message: string,
    options?: Partial<Omit<ToastItem, "id" | "message">>,
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const item: ToastItem = {
      id,
      message,
      title: options?.title,
      duration: options?.duration ?? 4000,
      variant: options?.variant ?? "info",
    };
    setToasts((s) => [...s, item]);
  };

  const dismiss = (id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const timers: Array<{ id: string; tid: number }> = [];
    toasts.forEach((t) => {
      if (t.duration && t.duration > 0) {
        const tid = window.setTimeout(() => {
          setToasts((s) => s.filter((x) => x.id !== t.id));
        }, t.duration);
        timers.push({ id: t.id, tid });
      }
    });
    return () => {
      timers.forEach((tt) => clearTimeout(tt.tid));
    };
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            item={t}
            onClose={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function variantStyles(variant: ToastItem["variant"]) {
  switch (variant) {
    case "success":
      return "bg-emerald-700 border-emerald-600";
    case "warning":
      return "bg-amber-700 border-amber-600";
    case "error":
      return "bg-rose-700 border-rose-600";
    default:
      return "bg-slate-800 border-slate-700";
  }
}

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { id, title, message, variant } = item;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto max-w-sm w-full ${variantStyles(
        variant,
      )} text-slate-100 border rounded-lg shadow-lg overflow-hidden transform transition-all duration-200`}
      style={{ boxShadow: "0 10px 30px rgba(2,6,23,0.6)" }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1">
          {title && <div className="font-semibold text-sm mb-0.5">{title}</div>}
          <div className="text-sm leading-snug break-words">{message}</div>
        </div>

        <div className="flex items-start ml-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={`Dismiss ${id}`}
            className="ml-2 text-slate-200 hover:text-white opacity-80 hover:opacity-100 transition-opacity text-sm"
            style={{ lineHeight: 0 }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export default ToastProvider;
