// admin-app.js - ARCHIVO COMPLETO Y CORREGIDO
class AdminApp {
    constructor() {
        this.productos = [];
        this.categorias = new Set();
        this.currentProduct = null;
        this.isEditing = false;
        this.uploadedImages = [];
        this.googleApiReady = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.checkAuth();
        await this.initializeGoogleAPI();
        await this.loadProducts();
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Botón "Nuevo Producto"
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.showProductModal());
        }

        // Botón "Ocultar/Mostrar Precios"
        const togglePricesBtn = document.getElementById('togglePricesBtn');
        if (togglePricesBtn) {
            togglePricesBtn.addEventListener('click', () => this.togglePrices());
        }

        // Formulario de producto
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.saveProduct(e));
        }

        // Botón Cancelar
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        // Cerrar modal con X
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }

        // Cerrar modal haciendo clic fuera
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }

        // Subida de imágenes
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Área de upload de imágenes
        const uploadArea = document.getElementById('imageUploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('imageInput').click();
            });
        }

        // Validación en tiempo real del formulario
        this.setupFormValidation();

        // Especificaciones dinámicas
        this.setupSpecificationsInput();

        console.log('✅ Event listeners configurados');
    }

    setupFormValidation() {
        const inputs = [
            'productName', 'productCategory', 'productDescription', 
            'priceMin', 'priceMax'
        ];

        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.validateForm());
                input.addEventListener('change', () => this.validateForm());
            }
        });

        // También validar cuando se cambian imágenes
        const imagePreviews = document.getElementById('imagePreviews');
        if (imagePreviews) {
            const observer = new MutationObserver(() => this.validateForm());
            observer.observe(imagePreviews, { childList: true, subtree: true });
        }
    }

    setupSpecificationsInput() {
        const container = document.getElementById('specificationsContainer');
        if (!container) return;

        container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('spec-input') && e.key === 'Enter') {
                e.preventDefault();
                this.addSpecificationInput();
            }
        });

        container.addEventListener('input', () => this.validateForm());
    }

    checkAuth() {
        if (localStorage.getItem('adminAuthenticated') === 'true') {
            document.getElementById('loginPanel').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
        }
    }

    // En admin-app.js - MEJORAR initializeGoogleAPI
    async initializeGoogleAPI() {
        try {
            console.log('🔄 Inicializando Google API...');
            
            // Esperar a que carguen las librerías
            await new Promise((resolve) => {
                const checkReady = () => {
                    if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });

            if (typeof AdminDriveAPI !== 'undefined' && AdminDriveAPI.initializeGapi) {
                await AdminDriveAPI.initializeGapi();
                await AdminDriveAPI.detectSharedFolder(); // 🔥 IMPORTANTE: Detectar carpeta
                this.googleApiReady = true;
                console.log('✅ Google Drive API lista para usar');
            }
        } catch (error) {
            console.warn('⚠️ Google API no disponible - Modo local activado');
            this.googleApiReady = false;
        }
    }

    async loadProducts() {
        try {
            // Primero intentar con Google Drive
            if (this.googleApiReady && typeof AdminDriveAPI !== 'undefined') {
                const productsData = await AdminDriveAPI.getProductsJson();
                this.productos = productsData.productos || [];
                this.showNotification(`✅ ${this.productos.length} productos cargados`, 'success');
            } else {
                // Fallback: cargar desde localStorage
                await this.loadFromLocalStorage();
            }
            
            this.updateUI();
            
        } catch (error) {
            console.error('Error cargando productos:', error);
            await this.loadFromLocalStorage();
        }
    }

    // En admin-app.js - DENTRO de la clase AdminApp
    async loadFromLocalStorage() {
        try {
            const localData = localStorage.getItem('admin_products_backup');
            if (localData) {
                const data = JSON.parse(localData);
                this.productos = data.productos || [];
                this.showNotification(`📂 ${this.productos.length} productos cargados localmente`, 'info');
            } else {
                // Datos de ejemplo con MÚLTIPLES IMÁGENES
                this.productos = this.getSampleProducts();
                this.showNotification('ℹ️ Modo demo: usando productos de ejemplo', 'info');
            }
        } catch (error) {
            this.productos = [];
            this.showNotification('❌ Error cargando productos locales', 'error');
        }
    }

    // 🔧 NUEVA FUNCIÓN: Productos de ejemplo con múltiples imágenes
    getSampleProducts() {
        return [
            {
                id: 'ejemplo_1',
                nombre: 'Smartphone Samsung Galaxy',
                categoria: 'Electrónicos',
                descripcion: 'Smartphone de última generación con cámara de alta resolución',
                precioMin: 350,
                precioMax: 400,
                especificaciones: 'Pantalla 6.5"; 128GB almacenamiento; Cámara 48MP; Batería 5000mAh',
                consultas: 8,
                vendido: false,
                imagenPrincipal: this.getSampleImageUrl(1, 1),
                imagenes: [
                    {
                        id: 'ejemplo_1_01',
                        url: this.getSampleImageUrl(1, 1),
                        nombre: 'samsung_galaxy_01.jpg',
                        principal: true,
                        orden: 1
                    },
                    {
                        id: 'ejemplo_1_02', 
                        url: this.getSampleImageUrl(1, 2),
                        nombre: 'samsung_galaxy_02.jpg',
                        principal: false,
                        orden: 2
                    },
                    {
                        id: 'ejemplo_1_03',
                        url: this.getSampleImageUrl(1, 3),
                        nombre: 'samsung_galaxy_03.jpg',
                        principal: false,
                        orden: 3
                    }
                ],
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                activo: true
            },
            {
                id: 'ejemplo_2',
                nombre: 'Laptop HP Pavilion',
                categoria: 'Computadoras',
                descripcion: 'Laptop ideal para trabajo y entretenimiento',
                precioMin: 550,
                precioMax: 600,
                especificaciones: 'Procesador Intel i5; 8GB RAM; SSD 256GB; Pantalla 15.6"',
                consultas: 12,
                vendido: false,
                imagenPrincipal: this.getSampleImageUrl(2, 1),
                imagenes: [
                    {
                        id: 'ejemplo_2_01',
                        url: this.getSampleImageUrl(2, 1),
                        nombre: 'hp_pavilion_01.jpg',
                        principal: true,
                        orden: 1
                    },
                    {
                        id: 'ejemplo_2_02',
                        url: this.getSampleImageUrl(2, 2),
                        nombre: 'hp_pavilion_02.jpg',
                        principal: false,
                        orden: 2
                    }
                ],
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                activo: true
            },
            {
                id: 'ejemplo_3',
                nombre: 'Audífonos Sony Wireless',
                categoria: 'Audio',
                descripcion: 'Audífonos inalámbricos con cancelación de ruido',
                precioMin: 120,
                precioMax: 120,
                especificaciones: 'Cancelación de ruido activa; Batería 30 horas; Bluetooth 5.0',
                consultas: 15,
                vendido: true,
                imagenPrincipal: this.getSampleImageUrl(3, 1),
                imagenes: [
                    {
                        id: 'ejemplo_3_01',
                        url: this.getSampleImageUrl(3, 1),
                        nombre: 'sony_headphones_01.jpg',
                        principal: true,
                        orden: 1
                    }
                ],
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                activo: true
            }
        ];
    }

    // 🔧 NUEVA FUNCIÓN: Generar URLs de imágenes de ejemplo
    getSampleImageUrl(productNumber, imageNumber) {
        // Usar servicios de imágenes placeholder
        const baseUrls = [
            'https://picsum.photos/400/300', // Imágenes aleatorias
            'https://placehold.co/400x300/3498db/white', // Placeholders azules
            'https://placehold.co/400x300/2ecc71/white', // Placeholders verdes
            'https://placehold.co/400x300/e74c3c/white'  // Placeholders rojos
        ];
        
        // Usar diferentes servicios para variedad
        const urlIndex = (productNumber + imageNumber) % baseUrls.length;
        return `${baseUrls[urlIndex]}?text=Producto${productNumber}_Img${imageNumber}`;
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Crear notificación visual
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    updateUI() {
        this.updateStats();
        this.renderProducts();
        this.updateCategories();
    }

    updateStats() {
        const totalProducts = document.getElementById('totalProducts');
        const todayConsultas = document.getElementById('todayConsultas');
        
        if (totalProducts) totalProducts.textContent = this.productos.length;
        if (todayConsultas) todayConsultas.textContent = this.getTodayConsultas();
    }

    getTodayConsultas() {
        const today = new Date().toDateString();
        return this.productos.reduce((total, producto) => {
            return total + (producto.consultasHoy || 0);
        }, 0);
    }

    renderProducts() {
        const container = document.getElementById('productsList');
        if (!container) {
            console.error('❌ No se encontró el contenedor de productos');
            return;
        }

        if (this.productos.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <p>No hay productos en el catálogo</p>
                    <p><small>Usa el botón "Nuevo Producto" para agregar el primero</small></p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.productos.map(producto => `
            <div class="product-admin-card" data-product-id="${producto.id}">
                <img src="${producto.imagenPrincipal || './images/placeholder.jpg'}" 
                     alt="${producto.nombre}" 
                     class="product-admin-image"
                     onerror="this.src='./images/placeholder.jpg'">
                <div class="product-admin-info">
                    <h3>${producto.nombre}</h3>
                    <div class="product-admin-meta">
                        <div>${producto.categoria}</div>
                        <div>${this.formatPrice(producto.precioMin, producto.precioMax)}</div>
                        <div>${producto.vendido ? '✅ Vendido' : '🟢 Disponible'}</div>
                    </div>
                </div>
                <div class="product-admin-stats">
                    <div class="consultas-count">${producto.consultas || 0}</div>
                    <small>consultas</small>
                </div>
                <div class="product-admin-actions">
                    <button class="btn-edit" onclick="adminApp.editProduct('${producto.id}')">
                        Editar
                    </button>
                    <button class="btn-delete" onclick="adminApp.deleteProduct('${producto.id}')">
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');

        console.log(`✅ ${this.productos.length} productos renderizados`);
    }

    formatPrice(min, max) {
        if (min === max || !max) return `$${min}`;
        return `$${min} - $${max}`;
    }

    updateCategories() {
        const select = document.getElementById('productCategory');
        if (!select) return;

        // Extraer categorías de los productos
        this.categorias = new Set(this.productos.map(p => p.categoria).filter(Boolean));

        // Limpiar y agregar categorías
        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        this.categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            select.appendChild(option);
        });

        // Agregar input para nueva categoría
        const newCategoryInput = document.getElementById('newCategory');
        if (newCategoryInput) {
            newCategoryInput.addEventListener('input', (e) => {
                if (e.target.value.trim()) {
                    select.value = '';
                }
            });

            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    newCategoryInput.value = '';
                }
            });
        }
    }

    addSpecificationInput() {
        const container = document.getElementById('specificationsContainer');
        const inputs = container.querySelectorAll('.spec-input');
        const nextIndex = inputs.length + 1;

        const newInputGroup = document.createElement('div');
        newInputGroup.className = 'spec-input-group';
        newInputGroup.innerHTML = `
            <span class="spec-bullet">•</span>
            <input type="text" class="spec-input" placeholder="Especificación ${nextIndex}">
        `;

        container.appendChild(newInputGroup);
        newInputGroup.querySelector('.spec-input').focus();
    }

    getSpecifications() {
        const inputs = document.querySelectorAll('.spec-input');
        return Array.from(inputs)
            .map(input => input.value.trim())
            .filter(spec => spec.length > 0)
            .join('; ');
    }

    validateForm() {
        const name = document.getElementById('productName')?.value.trim() || '';
        const category = document.getElementById('productCategory')?.value || '';
        const newCategory = document.getElementById('newCategory')?.value.trim() || '';
        const description = document.getElementById('productDescription')?.value.trim() || '';
        const priceMin = parseFloat(document.getElementById('priceMin')?.value) || 0;
        const priceMax = parseFloat(document.getElementById('priceMax')?.value) || 0;
        const specs = this.getSpecifications();
        
        const hasImages = this.uploadedImages.length > 0 || 
                         document.querySelectorAll('.image-preview.existing').length > 0;

        const isValid = name && 
                       (category || newCategory) && 
                       description && 
                       !isNaN(priceMin) && 
                       !isNaN(priceMax) && 
                       priceMin <= priceMax && 
                       specs && 
                       hasImages;

        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.disabled = !isValid;
        }

        return isValid;
    }

    showProductModal(producto = null) {
        this.isEditing = !!producto;
        this.currentProduct = producto;

        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = this.isEditing ? 'Editar Producto' : 'Nuevo Producto';
        }

        if (producto) {
            this.populateForm(producto);
        } else {
            this.clearForm();
        }

        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'block';
        }

        this.validateForm();
    }

    populateForm(producto) {
        document.getElementById('productName').value = producto.nombre || '';
        document.getElementById('productCategory').value = producto.categoria || '';
        document.getElementById('productDescription').value = producto.descripcion || '';
        document.getElementById('priceMin').value = producto.precioMin || '';
        document.getElementById('priceMax').value = producto.precioMax || '';

        // Cargar especificaciones
        this.loadSpecifications(producto.especificaciones);

        // Cargar imágenes existentes (si estamos editando)
        if (this.isEditing && producto.id) {
            this.loadExistingImages(producto.id);
        }
    }

    loadSpecifications(specsString) {
        const container = document.getElementById('specificationsContainer');
        if (!container) return;

        const specs = specsString ? specsString.split(';').filter(spec => spec.trim()) : [];
        
        if (specs.length === 0) {
            container.innerHTML = `
                <div class="spec-input-group">
                    <span class="spec-bullet">•</span>
                    <input type="text" class="spec-input" placeholder="Especificación 1">
                </div>
            `;
        } else {
            container.innerHTML = specs.map((spec, index) => `
                <div class="spec-input-group">
                    <span class="spec-bullet">•</span>
                    <input type="text" class="spec-input" 
                           value="${spec.trim()}" 
                           placeholder="Especificación ${index + 1}">
                </div>
            `).join('');
        }

        this.setupSpecificationsInput();
    }

    async loadExistingImages(productId) {
        try {
            if (this.googleApiReady && typeof AdminDriveAPI !== 'undefined') {
                const existingImages = await AdminDriveAPI.getProductImages(productId);
                this.displayExistingImages(existingImages);
            }
        } catch (error) {
            console.error('Error cargando imágenes existentes:', error);
        }
    }

    displayExistingImages(images) {
        const previews = document.getElementById('imagePreviews');
        if (!previews) return;

        images.forEach((image, index) => {
            const preview = document.createElement('div');
            preview.className = 'image-preview existing';
            preview.innerHTML = `
                <img src="${image.url}" alt="${image.name}" 
                     onerror="this.src='./images/placeholder.jpg'">
                <div class="image-info">${image.name}</div>
                <button type="button" class="remove-image" 
                        onclick="adminApp.removeExistingImage('${image.id}', '${image.name}')">
                    ×
                </button>
            `;
            previews.appendChild(preview);
        });
    }

    removeExistingImage(fileId, fileName) {
        if (!confirm(`¿Estás seguro de eliminar la imagen ${fileName}?`)) {
            return;
        }

        try {
            if (this.googleApiReady && typeof AdminDriveAPI !== 'undefined') {
                AdminDriveAPI.deleteImageFromDrive(fileId);
            }
            
            // Remover del DOM
            const previews = document.querySelectorAll('.image-preview.existing');
            previews.forEach(preview => {
                if (preview.querySelector('img').src.includes(fileId)) {
                    preview.remove();
                }
            });
            
            this.showNotification('✅ Imagen eliminada', 'success');
            this.validateForm();
        } catch (error) {
            console.error('Error eliminando imagen:', error);
            this.showNotification('❌ Error eliminando imagen', 'error');
        }
    }

    clearForm() {
        const form = document.getElementById('productForm');
        if (form) form.reset();

        const specsContainer = document.getElementById('specificationsContainer');
        if (specsContainer) {
            specsContainer.innerHTML = `
                <div class="spec-input-group">
                    <span class="spec-bullet">•</span>
                    <input type="text" class="spec-input" placeholder="Especificación 1">
                </div>
            `;
        }

        const imagePreviews = document.getElementById('imagePreviews');
        if (imagePreviews) {
            imagePreviews.innerHTML = '';
        }

        this.uploadedImages = [];
        this.setupSpecificationsInput();
        this.validateForm();
    }

    hideModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentProduct = null;
        this.isEditing = false;
        this.uploadedImages = [];
    }

    async handleImageUpload(event) {
        const files = Array.from(event.target.files);
        const maxImages = 5; // Límite de imágenes por producto
        
        // Verificar límite
        const totalImages = this.uploadedImages.length + 
                        document.querySelectorAll('.image-preview.existing').length;
        
        if (totalImages + files.length > maxImages) {
            this.showNotification(`❌ Máximo ${maxImages} imágenes por producto`, 'error');
            event.target.value = '';
            return;
        }
        
        // Procesar cada archivo
        for (const file of files) {
            if (this.validateImage(file)) {
                await this.processAndPreviewImage(file);
            }
        }
        
        event.target.value = '';
        this.validateForm();
    }

    validateImage(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        
        if (!validTypes.includes(file.type)) {
            this.showNotification('Solo se permiten imágenes JPG y PNG', 'error');
            return false;
        }
        
        if (file.size > maxSize) {
            this.showNotification('La imagen es demasiado grande (máx. 5MB)', 'error');
            return false;
        }
        
        return true;
    }

    async processAndPreviewImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        let { width, height } = this.calculateNewDimensions(img.width, img.height);
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob((blob) => {
                            const jpgDataUrl = URL.createObjectURL(blob);
                            this.createImagePreview(jpgDataUrl, file.name);
                            
                            this.uploadedImages.push({
                                dataUrl: jpgDataUrl,
                                filename: file.name,
                                originalFile: file,
                                processedBlob: blob
                            });
                            
                            this.validateForm();
                            resolve();
                        }, 'image/jpeg', 0.85);
                    } catch (error) {
                        reject(error);
                    }
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    calculateNewDimensions(originalWidth, originalHeight) {
        const maxWidth = 800;
        const maxHeight = 640;
        
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    createImagePreview(dataUrl, fileName) {
        const previews = document.getElementById('imagePreviews');
        if (!previews) return;

        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${dataUrl}" alt="Preview">
            <button type="button" class="remove-image" 
                    onclick="this.parentElement.remove(); adminApp.validateForm()">
                ×
            </button>
        `;
        previews.appendChild(preview);
    }

    togglePrices() {
        const btn = document.getElementById('togglePricesBtn');
        if (btn) {
            const currentlyHidden = btn.textContent.includes('Mostrar');
            btn.textContent = currentlyHidden ? 'Ocultar Precios' : 'Mostrar Precios';
            this.showNotification(
                currentlyHidden ? 'Precios visibles' : 'Precios ocultos', 
                'info'
            );
        }
    }

    editProduct(productId) {
        const producto = this.productos.find(p => p.id === productId);
        if (producto) {
            this.showProductModal(producto);
        } else {
            this.showNotification('❌ Producto no encontrado', 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) {
            return;
        }

        try {
            this.productos = this.productos.filter(p => p.id !== productId);
            
            // Guardar cambios
            if (this.googleApiReady && typeof AdminDriveAPI !== 'undefined') {
                await AdminDriveAPI.updateProductsJson(this.productos);
            } else {
                this.saveToLocalStorage();
            }
            
            this.showNotification('✅ Producto eliminado', 'success');
            this.updateUI();
        } catch (error) {
            console.error('Error eliminando producto:', error);
            this.showNotification('❌ Error eliminando producto', 'error');
        }
    }

    saveToLocalStorage() {
        try {
            const backupData = {
                productos: this.productos,
                lastUpdated: new Date().toISOString(),
                totalProducts: this.productos.length
            };
            localStorage.setItem('admin_products_backup', JSON.stringify(backupData));
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    }

    generateProductId() {
        return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveProduct(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            this.showNotification('❌ Completa todos los campos requeridos', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Guardando...';
        saveBtn.disabled = true;

        try {
            // Obtener categoría final
            const category = document.getElementById('productCategory').value || 
                        document.getElementById('newCategory').value.trim();

            // Preparar datos del producto
            const productData = {
                id: this.isEditing ? this.currentProduct.id : this.generateProductId(),
                nombre: document.getElementById('productName').value.trim(),
                categoria: category,
                descripcion: document.getElementById('productDescription').value.trim(),
                precioMin: parseFloat(document.getElementById('priceMin').value),
                precioMax: parseFloat(document.getElementById('priceMax').value),
                especificaciones: this.getSpecifications(),
                consultas: this.isEditing ? (this.currentProduct.consultas || 0) : 0,
                vendido: this.isEditing ? (this.currentProduct.vendido || false) : false,
                fechaCreacion: this.isEditing ? this.currentProduct.fechaCreacion : new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                activo: true
            };

            // 🔧 MANEJO DE IMÁGENES EN MODO LOCAL
            productData.imagenes = await this.processImagesForLocal(productData.id);
            productData.imagenPrincipal = productData.imagenes[0]?.url || './images/placeholder.jpg';

            // Actualizar lista local
            if (this.isEditing) {
                const index = this.productos.findIndex(p => p.id === productData.id);
                if (index !== -1) {
                    this.productos[index] = { ...this.productos[index], ...productData };
                }
            } else {
                this.productos.push(productData);
            }

            // Guardar cambios
            this.saveToLocalStorage();

            this.showNotification('✅ Producto guardado correctamente', 'success');
            this.hideModal();
            this.updateUI();
            
        } catch (error) {
            console.error('Error guardando producto:', error);
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            // Restaurar botón
            saveBtn.textContent = originalText;
            this.validateForm();
            this.uploadedImages = [];
        }
    }

    // 🔧 NUEVA FUNCIÓN: Procesar imágenes para modo local
    async processImagesForLocal(productId) {
        const images = [];
        
        // 1. Procesar imágenes nuevas subidas
        for (let i = 0; i < this.uploadedImages.length; i++) {
            const image = this.uploadedImages[i];
            const imageData = await this.convertImageToLocalData(image, productId, i + 1);
            images.push(imageData);
        }
        
        // 2. Mantener imágenes existentes (si estamos editando)
        if (this.isEditing && this.currentProduct.imagenes) {
            const existingImages = this.currentProduct.imagenes.filter(existingImg => {
                // No incluir imágenes que fueron eliminadas
                const stillExists = document.querySelector(`img[src="${existingImg.url}"]`);
                return stillExists;
            });
            images.push(...existingImages);
        }
        
        // 3. Si no hay imágenes, usar placeholder
        if (images.length === 0) {
            images.push({
                id: `${productId}_01`,
                url: './images/placeholder.jpg',
                nombre: 'placeholder.jpg',
                principal: true,
                orden: 1
            });
        }
        
        // 4. Asegurar que la primera imagen sea principal
        images.forEach((img, index) => {
            img.principal = index === 0;
            img.orden = index + 1;
        });
        
        return images;
    }

    // 🔧 NUEVA FUNCIÓN: Convertir imagen a datos locales
    async convertImageToLocalData(uploadedImage, productId, imageNumber) {
        // En modo local, usamos la Data URL directamente
        return {
            id: `${productId}_${imageNumber.toString().padStart(2, '0')}`,
            url: uploadedImage.dataUrl,
            nombre: uploadedImage.filename,
            principal: imageNumber === 1,
            orden: imageNumber
        };
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.adminApp = new AdminApp();
});

// Agregar animaciones CSS para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);