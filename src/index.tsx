// Configure Transformers.js for browser environment before any imports
import('@huggingface/transformers').then(({ env }) => {
  env.allowRemoteModels = true;
  env.useBrowserCache = true;
  env.allowLocalModels = false;
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);