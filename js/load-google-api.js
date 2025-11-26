// load-google-api.js - VERSIÓN MEJORADA
function loadGoogleAPI() {
    return new Promise((resolve, reject) => {
        // Si ya está cargada, resolver inmediatamente
        if (window.gapi && window.google) {
            console.log('✅ Google APIs ya cargadas');
            resolve();
            return;
        }

        let scriptsLoaded = 0;
        const totalScripts = 2;

        function checkAllLoaded() {
            scriptsLoaded++;
            if (scriptsLoaded === totalScripts) {
                console.log('✅ Todas las Google APIs cargadas');
                resolve();
            }
        }

        // Cargar Google Identity Services (GIS)
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = () => {
            console.log('✅ Google Identity Services cargada');
            checkAllLoaded();
        };
        gisScript.onerror = () => {
            console.error('❌ Error cargando Google Identity Services');
            checkAllLoaded(); // Continuar aunque falle una
        };

        // Cargar Google API Client
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
            console.log('✅ Google API Client cargada');
            checkAllLoaded();
        };
        gapiScript.onerror = () => {
            console.error('❌ Error cargando Google API Client');
            checkAllLoaded(); // Continuar aunque falle una
        };

        document.head.appendChild(gisScript);
        document.head.appendChild(gapiScript);

        // Timeout de seguridad
        setTimeout(() => {
            if (scriptsLoaded < totalScripts) {
                console.log('⚠️ Timeout cargando Google APIs, continuando...');
                resolve();
            }
        }, 10000);
    });
}

// Cargar automáticamente pero no bloquear
loadGoogleAPI().catch(error => {
    console.log('⚠️ Google APIs no disponibles, continuando en modo local:', error);
});