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

// Middlewares
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
app.get('/admin/email-config', async (req, res) => {
    try {
        const emailConfig = require('./config/email');
        const config = emailConfig.getConfigInfo();
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Configuración Email - Bot WhatsApp</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #25D366; }
                    .status { padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .status.ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                    .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .config-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
                    .config-item h3 { margin: 0 0 10px 0; color: #495057; }
                    .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
                    .test-form { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .test-form input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
                    .test-form button { background: #25D366; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="container">
                    <a href="/" class="back-btn">← Volver al Panel</a>
                    
                    <h1>📧 Configuración de Email</h1>
                    
                    <div class="status ${config.isConfigured ? 'ok' : 'error'}">
                        ${config.isConfigured ? 
                            '✅ Sistema de email configurado correctamente' : 
                            '❌ Sistema de email no configurado - Revisa tu archivo .env'
                        }
                    </div>
                    
                    <div class="config-grid">
                        <div class="config-item">
                            <h3>📨 Proveedor</h3>
                            <p>${config.provider || 'No configurado'}</p>
                        </div>
                        
                        <div class="config-item">
                            <h3>📧 Email de envío</h3>
                            <p>${config.fromEmail || 'No configurado'}</p>
                        </div>
                        
                        <div class="config-item">
                            <h3>🏢 Nombre de empresa</h3>
                            <p>${config.companyName || 'No configurado'}</p>
                        </div>
                        
                        <div class="config-item">
                            <h3>👥 Email del equipo</h3>
                            <p>${config.teamEmail || 'No configurado'}</p>
                        </div>
                    </div>
                    
                    ${config.isConfigured ? `
                    <div class="test-form">
                        <h3>🧪 Probar Envío de Emails</h3>
                        <form action="/admin/test-email" method="POST">
                            <input type="email" name="testEmail" placeholder="Email de prueba" required>
                            <button type="submit">Enviar Email de Prueba</button>
                        </form>
                    </div>
                    ` : `
                    <div class="status error">
                        <h3>🔧 Para configurar emails:</h3>
                        <ol>
                            <li>Abre tu archivo .env</li>
                            <li>Configura EMAIL_FROM con tu email</li>
                            <li>Configura EMAIL_PASSWORD con tu contraseña de aplicación</li>
                            <li>Opcionalmente configura EMAIL_TO_TEAM</li>
                            <li>Reinicia el servidor</li>
                        </ol>
                    </div>
                    `}
                </div>
            </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        res.status(500).send('Error obteniendo configuración: ' + error.message);
    }
});

// Probar envío de email
app.post('/admin/test-email', async (req, res) => {
    try {
        const emailService = require('./services/emailService');
        const testEmail = req.body.testEmail;
        
        if (!testEmail) {
            return res.status(400).send('Email de prueba requerido');
        }
        
        const results = await emailService.sendTestEmails(testEmail);
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Resultado Prueba Email</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #25D366; }
                    .result { padding: 15px; border-radius: 5px; margin: 10px 0; }
                    .result.success { background: #d4edda; color: #155724; }
                    .result.error { background: #f8d7da; color: #721c24; }
                    .back-btn { display: inline-block; margin: 20px 0; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🧪 Resultado de Prueba de Email</h1>
                    
                    <div class="result ${results.client ? 'success' : 'error'}">
                        ${results.client ? 
                            '✅ Email de confirmación al cliente enviado exitosamente' : 
                            '❌ Error enviando email al cliente'}
                    </div>
                    
                    <div class="result ${results.team ? 'success' : 'error'}">
                        ${results.team ? 
                            '✅ Notificación al equipo enviada exitosamente' : 
                            '❌ Error enviando notificación al equipo (o EMAIL_TO_TEAM no configurado)'}
                    </div>
                    
                    ${results.errors.length > 0 ? `
                    <div class="result error">
                        <h4>Errores encontrados:</h4>
                        <ul>
                            ${results.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <a href="/admin/email-config" class="back-btn">← Volver a Configuración</a>
                </div>
            </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        res.status(500).send('Error enviando email de prueba: ' + error.message);
    }
});

// Detalles de una cotización específica
app.get('/admin/quotation/:id', async (req, res) => {
    try {
        const quotationService = require('./services/quotationService');
        const quotation = await quotationService.getQuotationById(parseInt(req.params.id));
        
        if (!quotation) {
            return res.status(404).send('Cotización no encontrada');
        }
        
        const date = new Date(quotation.created_at).toLocaleString('es-ES');
        
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cotización #${quotation.id} - Bot WhatsApp</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #25D366; }
                    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .detail-card { background: #f8f9fa; padding: 15px; border-radius: 8px; }
                    .detail-card h3 { margin: 0 0 10px 0; color: #495057; }
                    .detail-card p { margin: 0; font-weight: bold; }
                    .description { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
                    .back-btn:hover { background: #5a6268; }
                </style>
            </head>
            <body>
                <div class="container">
                    <a href="/admin/quotations" class="back-btn">← Volver a Cotizaciones</a>
                    
                    <h1>📋 Cotización #${quotation.id}</h1>
                    
                    <div class="detail-grid">
                        <div class="detail-card">
                            <h3>👤 Cliente</h3>
                            <p>${quotation.client_name || 'No especificado'}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>🏢 Empresa</h3>
                            <p>${quotation.company_name || 'No especificado'}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>📧 Email</h3>
                            <p>${quotation.email || 'No especificado'}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>📱 Teléfono</h3>
                            <p>${quotation.phone || 'No especificado'}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>🛍️ Servicio</h3>
                            <p>${quotation.service_name}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>💰 Precio</h3>
                            <p>${quotation.price_usd} / ${quotation.price_mxn}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>⏱️ Tiempo Estimado</h3>
                            <p>${quotation.estimated_time}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h3>📅 Fecha</h3>
                            <p>${date}</p>
                        </div>
                    </div>
                    
                    <div class="description">
                        <h3>📝 Descripción del Proyecto</h3>
                        <p>${quotation.description || 'No especificado'}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        res.status(500).send('Error obteniendo cotización: ' + error.message);
    }
});

// Exportar datos a CSV
app.get('/admin/export', async (req, res) => {
    try {
        const quotationService = require('./services/quotationService');
        const quotations = await quotationService.db.getAllQuotations();
        
        // Crear CSV
        let csv = 'ID,Fecha,Cliente,Empresa,Email,Teléfono,Servicio,Precio USD,Precio MXN,Tiempo,Descripción,Estado\n';
        
        quotations.forEach(q => {
            const row = [
                q.id,
                new Date(q.created_at).toISOString(),
                `"${q.client_name || ''}"`,
                `"${q.company_name || ''}"`,
                q.email || '',
                q.phone || '',
                `"${q.service_name}"`,
                q.price_usd,
                q.price_mxn,
                q.estimated_time,
                `"${(q.description || '').replace(/"/g, '""')}"`,
                q.status || 'pending'
            ];
            csv += row.join(',') + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="cotizaciones.csv"');
        res.send(csv);
        
    } catch (error) {
        res.status(500).send('Error exportando datos: ' + error.message);
    }
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// Middleware para rutas no encontradas
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Página no encontrada</h1>
        <p>La ruta ${req.path} no existe.</p>
        <a href="/">← Volver al inicio</a>
    `);
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).send('Error interno del servidor');
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

app.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('🚀 BOT DE WHATSAPP INICIADO');
    console.log('='.repeat(50));
    console.log(`📱 Servidor corriendo en puerto: ${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`🌍 Disponible en: https://${process.env.RAILWAY_STATIC_URL || 'tu-dominio.com'}`);
    } else {
        console.log(`🔗 Panel local: http://localhost:${PORT}`);
        console.log(`🔗 Webhook local: http://localhost:${PORT}/webhook`);
    }
    console.log('='.repeat(50));
    console.log('📊 Funcionalidades disponibles:');
    console.log('   ✅ Sistema de cotizaciones');
    console.log('   ✅ Base de datos SQLite');
    console.log('   ✅ Sistema de emails');
    console.log('   ✅ Panel de administración');
    console.log('   ✅ Exportación de datos');
    console.log('   ✅ Gestión de sesiones');
    console.log('='.repeat(50));
    
    // Limpiar sesiones antiguas cada hora
    setInterval(() => {
        const sessionService = require('./services/sessionService');
        sessionService.cleanOldSessions(24); // Limpiar sesiones de más de 24 horas
    }, 60 * 60 * 1000); // Cada hora
});