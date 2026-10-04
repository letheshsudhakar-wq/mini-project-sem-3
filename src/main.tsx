import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { nativeService } from './services/nativeService';

// Initialize native mobile plugins (Status Bar, Splash Screen)
nativeService.initNativeApp().catch(console.warn);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

