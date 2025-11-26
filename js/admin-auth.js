// admin-auth.js - Sistema de autenticación seguro
class AdminAuth {
    constructor() {
        this.credentials = {
            // CAMBIA ESTAS CREDENCIALES
            username: 'cpsnoopy_admin',
            password: 'Snoopy2025!*', // Contraseña fuerte
            sessionDuration: 24 * 60 * 60 * 1000 // 24 horas
        };
        this.init();
    }

    init() {
        this.checkExistingAuth();
        this.setupLoginForm();
    }

    checkExistingAuth() {
        const authData = localStorage.getItem('adminAuth');
        if (authData) {
            const { timestamp, username } = JSON.parse(authData);
            const now = Date.now();
            
            if (now - timestamp < this.credentials.sessionDuration) {
                this.grantAccess();
            } else {
                localStorage.removeItem('adminAuth');
            }
        }
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        if (this.validateCredentials(username, password)) {
            this.saveAuthSession(username);
            this.grantAccess();
        } else {
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }

    validateCredentials(username, password) {
        return username === this.credentials.username && 
               password === this.credentials.password;
    }

    saveAuthSession(username) {
        const authData = {
            username: username,
            timestamp: Date.now()
        };
        localStorage.setItem('adminAuth', JSON.stringify(authData));
    }

    grantAccess() {
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Inicializar la aplicación administrativa
        if (typeof adminApp !== 'undefined') {
            adminApp.init();
        }
    }

    logout() {
        localStorage.removeItem('adminAuth');
        location.reload();
    }
}

// Inicializar autenticación
const adminAuth = new AdminAuth();