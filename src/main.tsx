import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles.css';
import App from './App';
import { useAuth } from './lib/store';
import { useLock } from './lib/lock';

void Promise.all([useAuth.getState().init(), useLock.getState().init()]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
});
