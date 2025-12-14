import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Configurar tema inicial
const setInitialTheme = () => {
  // Verificar preferencia del sistema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Verificar tema guardado en localStorage
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  
  // Aplicar tema
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
  
  // Configurar color scheme para el navegador
  document.documentElement.style.colorScheme = theme;
};

// Aplicar tema antes de renderizar
setInitialTheme();

// Configurar service worker para PWA (opcional)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Configurar error boundary global
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // En producción, aquí se podría enviar el error a un servicio de logging
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // En producción, aquí se podría enviar el error a un servicio de logging
});

// Renderizar la aplicación
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);