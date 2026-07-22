import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/spa.jsx', 'resources/js/admin.jsx', 'resources/js/selection.jsx', 'resources/css/selection-old.css', 'resources/js/selection-old.jsx', 'resources/css/svg-editor.css', 'resources/js/svg-editor.jsx', 'resources/css/learning.css', 'resources/js/learning.jsx'],
            refresh: true,
        }),
        react(),
    ],
    server: {
        origin: 'http://localhost:8099',
        host: '0.0.0.0',
        port: 5173,
        hmr: {
            path: '/@vite/hmr',
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
