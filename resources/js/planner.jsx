import React from 'react';
import { createRoot } from 'react-dom/client';
import PlannerApp from './planner/PlannerApp';

const container = document.getElementById('planner-app');
if (container) {
    createRoot(container).render(<PlannerApp />);
}
