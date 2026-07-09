import React from 'react';
import { createRoot } from 'react-dom/client';
import { SelectionApp } from './selection.jsx';

const container = document.getElementById('selection-app');
if (container) {
    const root = createRoot(container);
    root.render(<SelectionApp />);
}
