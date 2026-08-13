import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './styles-foundation.css';
import '../../../site/css/workspace-v1.css';

// The complete Helper configuration product is publicly served at
// /panel/helper-tracker/. Its authentication and server permissions are
// enforced by the Helper API, not by the static route.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
