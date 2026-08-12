import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './styles-foundation.css';

// The configuration application remains available during local development.
// In production, the official Helper entrypoint is the operational tracker.
// The api module runs first, so a Discord OAuth callback is persisted before
// the tracker resumes the authenticated Helper session.
if (import.meta.env.PROD) {
  window.location.replace('/panel/helper-tracker/');
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
