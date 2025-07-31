// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const bodyParser = require('body-parser');

// Importar controladores
const webhookController = require('./controllers/webhookController');
const adminController = require('./controllers/adminController');

// Crear aplicación Express
const app = express();

// ============================================
// CONFIGURACIÓN DE EJS Y ARCHIVOS ESTÁTICOS
// ============================================

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', './views');

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static('public'));

// ============================================
// MIDDLEWARES
// ============================================

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// RUTAS PRINCIPALES
// ============================================

// Página principal
app.get('/', adminController.getHomePage);

// Endpoint de test
app.get('/test', (req, res) => {
    console.log('🧪 Test endpoint funcionando');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// RUTAS DEL WEBHOOK (WhatsApp)
// ============================================

// Webhook principal para recibir mensajes de WhatsApp
app.post('/webhook', webhookController.handleIncomingMessage);

// Verificación del webhook (requerido por algunos servicios)
app.get('/webhook', (req, res) => {
    res.send('Webhook de WhatsApp funcionando correctamente ✅');
});

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

// Panel de cotizaciones
app.get('/admin/quotations', adminController.getQuotationsPage);

// Panel de estadísticas
app.get('/admin/stats', adminController.getStatsPage);

// Panel de sesiones activas
app.get('/admin/sessions', adminController.getSessionsPage);

// Configuración de emails
app.get('/admin/email-config', adminController.getEmailConfigPage);

// Probar envío de email
app.post('/admin/test-email', adminController.testEmail);

// Detalles de una cotización específica
app.get('/admin/quotation/:id', adminController.getQuotationDetailsPage);

// Exportar datos a CSV
app.get('/admin/export', adminController.exportData);

// ============================================
// MANEJO DE ERRORES
// ============================================

// Middleware para rutas no encontradas
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Página no encontrada',
        message: `La ruta ${req.path} no existe.`,
        showBackButton: false
    });
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).render('error', {
        title: 'Error interno del servidor',
        message: 'Ha ocurrido un error inesperado',
        showBackButton: false
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 BOT DE WHATSAPP INICIADO');
    console.log('='.repeat(50));
    console.log(`📱 Servidor corriendo en puerto: ${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 Host: 0.0.0.0 (accesible externamente)`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log(`🔗 URL pública: https://${process.env.RAILWAY_STATIC_URL || 'whatbot-production-2ef9.up.railway.app'}`);
        console.log(`🔗 Webhook URL: https://${process.env.RAILWAY_STATIC_URL || 'whatbot-production-2ef9.up.railway.app'}/webhook`);
    } else {
        console.log(`🔗 Panel local: http://localhost:${PORT}`);
        console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
    }
    console.log('='.repeat(50));
    console.log('📊 Funcionalidades disponibles:');
    console.log('   ✅ Sistema de cotizaciones');
    console.log('   ✅ Base de datos PostgreSQL');
    console.log('   ✅ Sistema de emails');
    console.log('   ✅ Panel de administración');
    console.log('   ✅ Exportación de datos');
    console.log('   ✅ Gestión de sesiones');
    console.log('='.repeat(50));
    
    // Limpiar sesiones antiguas cada hora
    setInterval(() => {
        try {
            const sessionService = require('./services/sessionService');
            sessionService.cleanOldSessions(24); // Limpiar sesiones de más de 24 horas
        } catch (error) {
            console.error('❌ Error limpiando sesiones:', error.message);
        }
    }, 60 * 60 * 1000); // Cada hora
});