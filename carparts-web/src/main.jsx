import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from 'react-hot-toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: { background: '#374151', color: '#fff', border: '1px solid #4b5563' },
        error: { style: { background: '#7f1d1d', color: '#fecaca', border: '1px solid #b91c1c' } },
        success: { style: { background: '#14532d', color: '#bbf7d0', border: '1px solid #16a34a' } },
      }}
    />
  </>
);