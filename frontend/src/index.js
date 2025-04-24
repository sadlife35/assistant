import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Check if we're in an extension popup or options page
if (window.location.protocol === 'chrome-extension:') {
  document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } else {
      console.error('Root element not found - are you in the correct context?');
    }
  });
} else {
  console.log('Not running in extension context');
}