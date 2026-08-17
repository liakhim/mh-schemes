import React from 'react';

const PageShell = ({ children, className = '' }) => (
    <main className={`page-shell ${className}`.trim()}>{children}</main>
);

export default PageShell;
