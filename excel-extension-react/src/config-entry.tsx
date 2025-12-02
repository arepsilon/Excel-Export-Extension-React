import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@coreui/coreui/dist/css/coreui.min.css';
import './index.css';
import ConfigDialog from './ConfigDialog';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ConfigDialog />
    </StrictMode>,
);
