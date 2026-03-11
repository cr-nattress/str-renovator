/**
 * @module toast
 * @capability Lightweight toast notification system
 * @layer Surface
 *
 * Minimal toast implementation using React state. Provides useToast hook
 * and ToastContainer component. Supports an optional action button (e.g. Undo).
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Button } from "./button";
import { X } from "lucide-react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, action?: ToastAction) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, action }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
      <span className="text-sm flex-1">{toast.message}</span>
      {toast.action && (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
