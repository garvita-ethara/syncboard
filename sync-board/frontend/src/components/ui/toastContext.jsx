import React, { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function pushToast({ type = 'info', title = '', message = '' }) {
    const id = `${Date.now()}_${++toastId}`;
    setToasts((current) => [...current, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2800);
  }

  function removeToast(id) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  const value = useMemo(() => ({ pushToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ui-toast ${toast.type}`}>
            <div>
              {toast.title ? <strong>{toast.title}</strong> : null}
              <p>{toast.message}</p>
            </div>
            <button type="button" className="ghost" onClick={() => removeToast(toast.id)}>x</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
