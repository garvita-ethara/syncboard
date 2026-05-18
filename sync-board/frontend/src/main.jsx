import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { ToastProvider } from './components/ui';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
