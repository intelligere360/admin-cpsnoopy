// js/load-google-api.js
function loadGoogleAPI() {
    return new Promise((resolve, reject) => {
        // Cargar Google API Client
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
            // Cargar Google Identity Services
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = resolve;
            gisScript.onerror = reject;
            document.head.appendChild(gisScript);
        };
        gapiScript.onerror = reject;
        document.head.appendChild(gapiScript);
    });
}

// Cargar automáticamente cuando esté disponible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGoogleAPI);
} else {
    loadGoogleAPI();
}