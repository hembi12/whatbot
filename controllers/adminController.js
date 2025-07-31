const quotationService = require('../services/quotationService');
const sessionService = require('../services/sessionService');

class AdminController {
    
    // Página principal del admin
    getHomePage(req, res) {
        res.render('admin/home', {
            title: 'Panel Admin',
            layout: 'layouts/main'
        });
    }
    
    // Ver todas las cotizaciones
    async getQuotationsPage(req, res) {
        try {
            const quotations = await quotationService.db.getAllQuotations();
            
            res.render('admin/quotations', {
                title: 'Cotizaciones',
                layout: 'layouts/main',
                showBackButton: true,
                quotations: quotations
            });
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones:', error.message);
            if (process.env.NODE_ENV === 'production') {
                res.status(500).render('error', {
                    title: 'Error',
                    message: 'Error interno del servidor'
                });
            } else {
                res.status(500).render('error', {
                    title: 'Error',
                    message: 'Error obteniendo cotizaciones: ' + error.message
                });
            }
        }
    }
    
    // Ver estadísticas
    async getStatsPage(req, res) {
        try {
            const stats = await quotationService.getQuotationStats();
            const sessionStats = sessionService.getSessionStats();
            
            res.render('admin/stats', {
                title: 'Estadísticas',
                layout: 'layouts/main',
                showBackButton: true,
                stats: stats,
                sessionStats: sessionStats,
                statusNames: {
                    'pending': 'Pendientes',
                    'in_progress': 'En Proceso',
                    'completed': 'Completadas',
                    'cancelled': 'Canceladas'
                }
            });
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            if (process.env.NODE_ENV === 'production') {
                res.status(500).render('error', {
                    title: 'Error',
                    message: 'Error interno del servidor'
                });
            } else {
                res.status(500).render('error', {
                    title: 'Error',
                    message: 'Error obteniendo estadísticas: ' + error.message
                });
            }
        }
    }
    
    // Ver sesiones activas
    getSessionsPage(req, res) {
        const sessions = sessionService.getAllActiveSessions();
        const sessionStats = sessionService.getSessionStats();
        
        res.render('admin/sessions', {
            title: 'Sesiones Activas',
            layout: 'layouts/main',
            showBackButton: true,
            sessions: sessions,
            sessionStats: sessionStats
        });
    }
    
    // Configuración de emails
    async getEmailConfigPage(req, res) {
        try {
            const emailConfig = require('../config/email');
            const config = emailConfig.getConfigInfo();
            
            res.render('admin/email-config', {
                title: 'Configuración Email',
                layout: 'layouts/main',
                showBackButton: true,
                config: config
            });
        } catch (error) {
            res.status(500).render('error', {
                title: 'Error',
                message: 'Error obteniendo configuración: ' + error.message,
                showBackButton: true
            });
        }
    }
    
    // Probar envío de email
    async testEmail(req, res) {
        try {
            const emailService = require('../services/emailService');
            const testEmail = req.body.testEmail;
            
            if (!testEmail) {
                return res.status(400).render('error', {
                    title: 'Error',
                    message: 'Email de prueba requerido',
                    showBackButton: true
                });
            }
            
            const results = await emailService.sendTestEmails(testEmail);
            
            res.render('admin/test-email-result', {
                title: 'Resultado Prueba Email',
                layout: 'layouts/main',
                showBackButton: false,
                results: results,
                testEmail: testEmail
            });
        } catch (error) {
            res.status(500).render('error', {
                title: 'Error',
                message: 'Error enviando email de prueba: ' + error.message,
                showBackButton: true
            });
        }
    }
    
    // Detalles de una cotización específica
    async getQuotationDetailsPage(req, res) {
        try {
            const quotationService = require('../services/quotationService');
            const quotation = await quotationService.getQuotationById(parseInt(req.params.id));
            
            if (!quotation) {
                return res.status(404).render('error', {
                    title: 'Cotización no encontrada',
                    message: 'La cotización solicitada no existe',
                    showBackButton: true
                });
            }
            
            res.render('admin/quotation-details', {
                title: `Cotización #${quotation.id}`,
                layout: 'layouts/main',
                showBackButton: true,
                quotation: quotation
            });
        } catch (error) {
            res.status(500).render('error', {
                title: 'Error',
                message: 'Error obteniendo cotización: ' + error.message,
                showBackButton: true
            });
        }
    }
    
    // Exportar datos a CSV
    async exportData(req, res) {
        try {
            const quotationService = require('../services/quotationService');
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
            res.status(500).render('error', {
                title: 'Error',
                message: 'Error exportando datos: ' + error.message,
                showBackButton: true
            });
        }
    }
}

module.exports = new AdminController();