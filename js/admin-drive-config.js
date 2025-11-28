// admin-drive-config.js - Integración completa con Google Drive API
const ADMIN_DRIVE_CONFIG = {
    // 🔐 Configuración de Google Drive API
    apiConfig: {
        apiKey: 'AIzaSyBTTagLZt25QUIbV2ibqDUlC1mAUgquJjY', 
        clientId: '201605638112-3smjrecrmauk91pon3ulavca7d7j14i1.apps.googleusercontent.com', // Reemplazar con tu Client ID
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file',
        uploadUrl: 'https://www.googleapis.com/upload/drive/v3/files'
    },
     
    // 📁 ESTRUCTURA UNIFICADA - MISMOS ARCHIVOS PARA AMBAS APPS
    folders: {
        // Carpeta PRINCIPAL compartida (snoopy)
        shared: {
            name: 'snoopy',
            id: null, // Se detectará automáticamente
            productsJson: 'products.json', // MISMO archivo para ambas apps
            images: 'snoopy/productos', // MISMA carpeta de imágenes
            notificationsExcel: 'notificaciones.xlsx' // Solo admin escribe aquí
        }
    },
    
    // ⚙️ Configuración general
    cacheDuration: 5 * 60 * 1000,
    maxImageSize: 800,
    maxImageHeight: 640
};

let gapiInitialized = false;
let googleAuth = null;
let googleTokenClient = null;

/**
 * Inicializa Google API Client con GIS
 */
// En admin-drive-config.js - MEJORAR la función initializeGapi
async function initializeGapi() {
    return new Promise((resolve, reject) => {
        // Verificar que ambas APIs estén cargadas
        if (typeof gapi === 'undefined') {
            reject(new Error('Google API Client no cargada'));
            return;
        }

        if (typeof google === 'undefined') {
            reject(new Error('Google Identity Services no cargada'));
            return;
        }

        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: ADMIN_DRIVE_CONFIG.apiConfig.apiKey,
                    discoveryDocs: ADMIN_DRIVE_CONFIG.apiConfig.discoveryDocs,
                });

                console.log('✅ Google API Client inicializada');
                
                // Configurar Google Identity Services
                window.googleTokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: ADMIN_DRIVE_CONFIG.apiConfig.clientId,
                    scope: ADMIN_DRIVE_CONFIG.apiConfig.scope,
                    callback: (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            console.log('✅ Token de acceso obtenido');
                            resolve();
                        } else {
                            reject(new Error('No se pudo obtener token de acceso'));
                        }
                    },
                    error_callback: (error) => {
                        console.error('❌ Error en OAuth:', error);
                        reject(error);
                    }
                });

                console.log('✅ Google Drive API completamente inicializada');
                resolve();
            } catch (error) {
                console.error('❌ Error inicializando Google API:', error);
                reject(error);
            }
        });
    });
}

/**
 * Autentica al usuario con GIS
 */
async function authenticate() {
    if (!googleTokenClient) {
        await initializeGapi();
    }

    return new Promise((resolve, reject) => {
        googleTokenClient.callback = (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                resolve(tokenResponse.access_token);
            } else {
                reject(new Error('Error en autenticación'));
            }
        };
        
        googleTokenClient.error_callback = (error) => {
            reject(error);
        };
        
        googleTokenClient.requestAccessToken();
    });
}

/**
 * Detecta o crea la carpeta compartida 'snoopy'
 */
async function detectSharedFolder() {
    try {
        const sharedFolder = await findOrCreateFolder(ADMIN_DRIVE_CONFIG.folders.shared.name);
        ADMIN_DRIVE_CONFIG.folders.shared.id = sharedFolder.id;
        
        console.log('📁 Carpeta compartida configurada:', ADMIN_DRIVE_CONFIG.folders.shared.id);
    } catch (error) {
        console.error('❌ Error configurando carpeta compartida:', error);
    }
}

/**
 * Busca o crea una carpeta en Google Drive
 */
async function findOrCreateFolder(folderName) {
    try {
        // Buscar carpeta existente
        const response = await gapi.client.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)'
        });

        if (response.result.files.length > 0) {
            return response.result.files[0];
        }

        // Crear nueva carpeta
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };

        const createResponse = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id, name'
        });

        console.log(`✅ Carpeta creada: ${folderName} (${createResponse.result.id})`);
        return createResponse.result;
    } catch (error) {
        console.error(`❌ Error con carpeta ${folderName}:`, error);
        throw error;
    }
}

/**
 * Autentica al usuario
 */
/*async function authenticate() {
    if (!gapiInitialized) {
        await initializeGapi();
    }

    if (!googleAuth.isSignedIn.get()) {
        await googleAuth.signIn();
    }

    return googleAuth.currentUser.get().getAuthResponse().access_token;
} */

/**
 * Obtiene el JSON de productos (desde carpeta compartida)
 */
async function getProductsJson() {
    try {
        await authenticate();
        
        const fileId = await findFileId(
            ADMIN_DRIVE_CONFIG.folders.shared.productsJson,
            ADMIN_DRIVE_CONFIG.folders.shared.id
        );

        if (!fileId) {
            // Si no existe, crear uno vacío
            return { productos: [] };
        }

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        return response.result;
    } catch (error) {
        console.error('❌ Error obteniendo products.json:', error);
        throw error;
    }
}

/**
 * Actualiza el JSON de productos (en carpeta compartida)
 */
async function updateProductsJson(productsData) {
    try {
        await authenticate();

        const fileName = ADMIN_DRIVE_CONFIG.folders.shared.productsJson;
        const folderId = ADMIN_DRIVE_CONFIG.folders.shared.id;
        
        // Buscar archivo existente
        let fileId = await findFileId(fileName, folderId);
        
        const fileContent = JSON.stringify({
            productos: productsData,
            lastUpdated: new Date().toISOString(),
            totalProducts: productsData.length,
            version: '1.0'
        }, null, 2);

        const fileBlob = new Blob([fileContent], { type: 'application/json' });
        
        if (fileId) {
            // Actualizar archivo existente
            await updateFile(fileId, fileBlob, 'application/json');
            console.log('✅ products.json actualizado (compartido)');
        } else {
            // Crear nuevo archivo
            fileId = await createFile(fileName, folderId, fileBlob, 'application/json');
            console.log('✅ products.json creado (compartido)');
        }

        return {
            success: true,
            fileId: fileId,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error actualizando products.json:', error);
        throw error;
    }
}

/**
 * Sube imagen a Google Drive (carpeta compartida productos/)
 */
async function uploadImageToDrive(imageBlob, filename, productId) {
    try {
        await authenticate();

        const imagesFolderId = await ensureImagesFolder();
        
        const fileId = await createFile(filename, imagesFolderId, imageBlob, 'image/jpeg');
        const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

        console.log('✅ Imagen subida a carpeta compartida:', filename);
        
        return {
            success: true,
            fileId: fileId,
            filename: filename,
            url: imageUrl
        };
    } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        throw error;
    }
}

/**
 * Asegura que existe la carpeta compartida de imágenes 'snoopy/productos'
 */
async function ensureImagesFolder() {
    const folderName = 'productos';
    const parentId = ADMIN_DRIVE_CONFIG.folders.shared.id;
    
    try {
        const response = await gapi.client.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
            fields: 'files(id, name)'
        });

        if (response.result.files.length > 0) {
            return response.result.files[0].id;
        }

        // Crear carpeta de imágenes compartida
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };

        const createResponse = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });

        console.log('✅ Carpeta de imágenes compartida creada: productos/');
        return createResponse.result.id;
    } catch (error) {
        console.error('❌ Error creando carpeta de imágenes:', error);
        throw error;
    }
}

/**
 * Elimina imagen de Google Drive
 */
async function deleteImageFromDrive(fileId) {
    try {
        await authenticate();

        await gapi.client.drive.files.delete({
            fileId: fileId
        });

        console.log('✅ Imagen eliminada:', fileId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando imagen:', error);
        throw error;
    }
}

/**
 * Obtiene todas las imágenes de un producto
 */
async function getProductImages(productId) {
    try {
        await authenticate();

        const imagesFolderId = await ensureImagesFolder();
        const prefix = `${productId}_`;

        const response = await gapi.client.drive.files.list({
            q: `'${imagesFolderId}' in parents and name contains '${prefix}' and trashed=false`,
            fields: 'files(id, name)'
        });

        return response.result.files.map(file => ({
            id: file.id,
            name: file.name,
            url: `https://lh3.googleusercontent.com/d/${file.id}`
        }));
    } catch (error) {
        console.error('❌ Error obteniendo imágenes del producto:', error);
        return [];
    }
}

/**
 * Registra notificación en Excel (carpeta compartida)
 */
async function registerNotificationInExcel(notificationData) {
    try {
        await authenticate();

        const fileName = ADMIN_DRIVE_CONFIG.folders.shared.notificationsExcel;
        const folderId = ADMIN_DRIVE_CONFIG.folders.shared.id;
        
        // Obtener notificaciones existentes
        let notifications = await getExistingNotifications();
        
        // Agregar nueva notificación
        const newNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...notificationData
        };
        
        notifications.push(newNotification);
        
        // Convertir a formato Excel (CSV para simplicidad)
        const csvContent = convertToCSV(notifications);
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        
        // Buscar archivo existente
        let fileId = await findFileId(fileName, folderId);
        
        if (fileId) {
            // Actualizar archivo existente
            await updateFile(fileId, csvBlob, 'text/csv');
        } else {
            // Crear nuevo archivo
            fileId = await createFile(fileName, folderId, csvBlob, 'text/csv');
        }

        console.log('✅ Notificación registrada en Excel');
        
        return {
            success: true,
            notificationId: newNotification.id,
            totalNotifications: notifications.length,
            fileId: fileId
        };
    } catch (error) {
        console.error('❌ Error registrando notificación:', error);
        throw error;
    }
}

/**
 * Obtiene notificaciones existentes del Excel
 */
async function getExistingNotifications() {
    try {
        const fileName = ADMIN_DRIVE_CONFIG.folders.shared.notificationsExcel;
        const folderId = ADMIN_DRIVE_CONFIG.folders.shared.id;
        
        const fileId = await findFileId(fileName, folderId);
        if (!fileId) {
            return [];
        }

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        return parseCSV(response.body);
    } catch (error) {
        console.error('❌ Error obteniendo notificaciones:', error);
        return [];
    }
}

/**
 * Obtiene estadísticas de notificaciones
 */
async function getNotificationStats() {
    const notifications = await getExistingNotifications();
    const today = new Date().toDateString();
    
    const todayNotifications = notifications.filter(notif => 
        new Date(notif.timestamp).toDateString() === today
    );
    
    const byProduct = {};
    notifications.forEach(notif => {
        const productId = notif.producto?.id || 'unknown';
        if (!byProduct[productId]) {
            byProduct[productId] = {
                producto: notif.producto?.nombre || 'Desconocido',
                count: 0,
                lastNotification: notif.timestamp
            };
        }
        byProduct[productId].count++;
    });

    return {
        total: notifications.length,
        today: todayNotifications.length,
        byProduct: byProduct
    };
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================

/**
 * Busca el ID de un archivo por nombre y carpeta
 */
async function findFileId(fileName, folderId) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        return response.result.files.length > 0 ? response.result.files[0].id : null;
    } catch (error) {
        console.error('❌ Error buscando archivo:', error);
        return null;
    }
}

/**
 * Crea un nuevo archivo en Google Drive
 */
async function createFile(name, folderId, blob, mimeType) {
    const accessToken = await authenticate(); // Usar GIS
    
    const metadata = {
        name: name,
        mimeType: mimeType,
        parents: folderId ? [folderId] : []
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);
    
    const response = await fetch(ADMIN_DRIVE_CONFIG.apiConfig.uploadUrl + '?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Error creando archivo: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
}

/**
 * Actualiza un archivo existente
 */
async function updateFile(fileId, blob, mimeType) {
    const accessToken = googleAuth.currentUser.get().getAuthResponse().access_token;
    
    const response = await fetch(`${ADMIN_DRIVE_CONFIG.apiConfig.uploadUrl}/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': mimeType
        },
        body: blob
    });

    if (!response.ok) {
        throw new Error(`Error actualizando archivo: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Convierte array de objetos a CSV
 */
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (typeof value === 'object') {
                return JSON.stringify(value).replace(/"/g, '""');
            }
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

/**
 * Parsea CSV a array de objetos
 */
function parseCSV(csvText) {
    if (!csvText.trim()) return [];
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const obj = {};
        const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        for (let j = 0; j < headers.length; j++) {
            let value = currentLine[j] || '';
            value = value.replace(/^"|"$/g, '').replace(/""/g, '"');
            
            // Intentar parsear JSON para objetos anidados
            if (value.startsWith('{') && value.endsWith('}')) {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Mantener como string si falla el parseo
                }
            }
            
            obj[headers[j]] = value;
        }
        
        result.push(obj);
    }
    
    return result;
}

/**
 * Genera nombre de archivo para imagen con nomenclatura {id_producto}_{# imagen}.jpg
 */
function generateImageFilename(productId, imageNumber) {
    const paddedNumber = imageNumber.toString().padStart(2, '0');
    return `${productId}_${paddedNumber}.jpg`;
}

// Exportar funciones principales
window.AdminDriveAPI = {
    initializeGapi,
    authenticate,
    getProductsJson,
    updateProductsJson,
    uploadImageToDrive,
    deleteImageFromDrive,
    getProductImages,
    registerNotificationInExcel,
    getNotificationStats,
    generateImageFilename
};