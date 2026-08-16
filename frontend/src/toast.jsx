import { createContext, useContext, useState, useCallback, useMemo } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (text, type) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, text, type }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  // useMemo keeps this stable between renders, so pages can list `toast` in a
  // useEffect dependency array without looping.
  const toast = useMemo(
    () => ({
      success: (text) => push(text, "success"),
      error: (text) => push(text, "error"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
            <span className="toast-icon">{t.type === "success" ? "✓" : "!"}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
