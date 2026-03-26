"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastEntry extends ToastOptions {
  id: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const createToastId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.durationMs);

    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.durationMs, toast.id]);

  const icon =
    toast.variant === "success" ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    ) : toast.variant === "error" ? (
      <AlertCircle className="h-5 w-5 text-red-500" />
    ) : (
      <Info className="h-5 w-5 text-blue-500" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Dismiss toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(({
    title,
    description,
    variant = "info",
    durationMs = 4500,
  }: ToastOptions) => {
    const id = createToastId();
    setToasts((current) => [...current, { id, title, description, variant, durationMs }]);
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[140] flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastCard toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
};
