import React from 'react';
import { createRoot } from 'react-dom/client';
import LearningApp from './learning/LearningApp';

const container = document.getElementById('learning-app');
if (container) {
    const root = createRoot(container);
    root.render(<LearningApp />);
}
