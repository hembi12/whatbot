const quotationService = require('../services/quotationService');
const sessionService = require('../services/sessionService');

class AdminController {
    
    // Página principal del admin
    getHomePage(req, res) {
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bot WhatsApp - Panel Admin</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #25D366; text-align: center; }
                    .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    .menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
                    .menu-item { background: #f8f9fa; padding: 20px; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #dee2e6; transition: all 0.3s; }
                    .menu-item:hover { background: #25D366; color: white; transform: translateY(-2px); }
                    .menu-item h3 { margin: 0 0 10px 0; }
                    .menu-item p { margin: 0; font-size: 14px; opacity: 0.8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 Bot de WhatsApp - Panel de Administración</h1>
                    
                    <div class="status">
                        <strong>✅ Sistema funcionando correctamente</strong>
                        <p>Bot activo y procesando mensajes</p>
                    </div>
                    
                    <div class="menu">
                        <a href="/admin/quotations" class="menu-item">
                            <h3>📋 Cotizaciones</h3>
                            <p>Ver todas las cotizaciones recibidas</p>
                        </a>
                        
                        <a href="/admin/stats" class="menu-item">
                            <h3>📊 Estadísticas</h3>
                            <p>Métricas y análisis del bot</p>
                        </a>
                        
                        <a href="/admin/sessions" class="menu-item">
                            <h3>👥 Sesiones Activas</h3>
                            <p>Usuarios actualmente interactuando</p>
                        </a>
                        
                        <a href="/admin/email-config" class="menu-item">
                            <h3>📧 Configuración Email</h3>
                            <p>Configurar y probar sistema de emails</p>
                        </a>
                        
                        <a href="/admin/export" class="menu-item">
                            <h3>📤 Exportar Datos</h3>
                            <p>Descargar cotizaciones en CSV</p>
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    }
    
    // Ver todas las cotizaciones
    async getQuotationsPage(req, res) {
        try {
            const quotations = await quotationService.db.getAllQuotations();
            
            let html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Cotizaciones - Bot WhatsApp</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        h1 { color: #25D366; }
                        .summary { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                        th { background-color: #25D366; color: white; }
                        tr:hover { background-color: #f5f5f5; }
                        .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                        .status.pending { background: #fff3cd; color: #856404; }
                        .status.in_progress { background: #d1ecf1; color: #0c5460; }
                        .status.completed { background: #d4edda; color: #155724; }
                        .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
                        .back-btn:hover { background: #5a6268; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <a href="/" class="back-btn">← Volver al Panel</a>
                        
                        <h1>📋 Cotizaciones Recibidas</h1>
                        
                        <div class="summary">
                            <strong>Total de cotizaciones: ${quotations.length}</strong>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Empresa</th>
                                    <th>Email</th>
                                    <th>Servicio</th>
                                    <th>Precio</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            quotations.forEach(q => {
                const date = new Date(q.created_at).toLocaleDateString('es-ES');
                const status = q.status || 'pending';
                
                html += `
                    <tr>
                        <td><strong>#${q.id}</strong></td>
                        <td>${date}</td>
                        <td>${q.client_name || 'N/A'}</td>
                        <td>${q.company_name || 'N/A'}</td>
                        <td>${q.email || 'N/A'}</td>
                        <td>${q.service_name}</td>
                        <td>${q.price_usd}</td>
                        <td><span class="status ${status}">${status}</span></td>
                        <td>
                            <a href="/admin/quotation/${q.id}" style="color: #25D366;">Ver detalles</a>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;
            
            res.send(html);
        } catch (error) {
            res.status(500).send('Error obteniendo cotizaciones: ' + error.message);
        }
    }
    
    // Ver estadísticas
    async getStatsPage(req, res) {
        try {
            const stats = await quotationService.getQuotationStats();
            const sessionStats = sessionService.getSessionStats();
            
            let html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Estadísticas - Bot WhatsApp</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        h1, h2 { color: #25D366; }
                        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
                        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #25D366; }
                        .stat-number { font-size: 2em; font-weight: bold; color: #25D366; }
                        .stat-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                        ul { list-style-type: none; padding: 0; }
                        li { padding: 8px 0; border-bottom: 1px solid #dee2e6; }
                        li:last-child { border-bottom: none; }
                        .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
                        .back-btn:hover { background: #5a6268; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <a href="/" class="back-btn">← Volver al Panel</a>
                        
                        <h1>📊 Estadísticas del Bot</h1>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <h3>📈 Total Cotizaciones</h3>
                                <div class="stat-number">${stats.totalQuotations[0].count}</div>
                            </div>
                            
                            <div class="stat-card">
                                <h3>👥 Sesiones Activas</h3>
                                <div class="stat-number">${sessionStats.totalSessions}</div>
                            </div>
                        </div>
                        
                        <div class="stat-list">
                            <h2>🏷️ Cotizaciones por Servicio</h2>
                            <ul>
            `;
            
            stats.quotationsByService.forEach(item => {
                html += `<li><strong>${item.service_name}:</strong> ${item.count} cotizaciones</li>`;
            });
            
            html += `
                            </ul>
                        </div>
                        
                        <div class="stat-list">
                            <h2>📋 Estados de Cotizaciones</h2>
                            <ul>
            `;
            
            stats.quotationsByStatus.forEach(item => {
                const statusNames = {
                    'pending': 'Pendientes',
                    'in_progress': 'En Proceso',
                    'completed': 'Completadas',
                    'cancelled': 'Canceladas'
                };
                html += `<li><strong>${statusNames[item.status] || item.status}:</strong> ${item.count} cotizaciones</li>`;
            });
            
            html += `
                            </ul>
                        </div>
                        
                        <div class="stat-list">
                            <h2>🕒 Cotizaciones Recientes</h2>
                            <ul>
            `;
            
            stats.recentQuotations.forEach(q => {
                const date = new Date(q.created_at).toLocaleDateString('es-ES');
                html += `
                    <li>
                        <strong>#${q.id}</strong> - ${q.client_name || 'Anónimo'} 
                        (${q.service_name}) - ${date}
                    </li>
                `;
            });
            
            html += `
                            </ul>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            res.send(html);
        } catch (error) {
            res.status(500).send('Error obteniendo estadísticas: ' + error.message);
        }
    }
    
    // Ver sesiones activas
    getSessionsPage(req, res) {
        const sessions = sessionService.getAllActiveSessions();
        const sessionStats = sessionService.getSessionStats();
        
        let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sesiones Activas - Bot WhatsApp</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #25D366; }
                    .summary { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #25D366; color: white; }
                    tr:hover { background-color: #f5f5f5; }
                    .step { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #d1ecf1; color: #0c5460; }
                    .back-btn { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
                    .back-btn:hover { background: #5a6268; }
                </style>
            </head>
            <body>
                <div class="container">
                    <a href="/" class="back-btn">← Volver al Panel</a>
                    
                    <h1>👥 Sesiones Activas</h1>
                    
                    <div class="summary">
                        <strong>Total de sesiones activas: ${sessionStats.totalSessions}</strong><br>
                        Sesiones con datos: ${sessionStats.withData} | 
                        Con servicio seleccionado: ${sessionStats.withSelectedService}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Teléfono</th>
                                <th>Estado Actual</th>
                                <th>Tiene Datos</th>
                                <th>Servicio Seleccionado</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        Object.entries(sessions).forEach(([phone, session]) => {
            html += `
                <tr>
                    <td>${phone.replace('whatsapp:', '')}</td>
                    <td><span class="step">${session.step}</span></td>
                    <td>${session.hasData ? '✅' : '❌'}</td>
                    <td>${session.selectedService || 'N/A'}</td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;
        
        res.send(html);
    }
}

module.exports = new AdminController();