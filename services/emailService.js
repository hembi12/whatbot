const emailConfig = require('../config/email');
const servicesData = require('../data/servicesData');

class EmailService {
    
    // Email de confirmación al cliente
    async sendClientConfirmation(quotationData) {
        try {
            const service = servicesData.find(s => s.id === quotationData.serviceId);
            
            const mailOptions = {
                to: quotationData.email,
                subject: `✅ Cotización Recibida #${quotationData.id} - ${process.env.COMPANY_NAME || 'Tu Empresa'}`,
                html: this.generateClientTemplate(quotationData, service)
            };

            return await emailConfig.sendEmail(mailOptions);
        } catch (error) {
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Error enviando confirmación al cliente');
            } else {
                console.error('❌ Error enviando confirmación al cliente:', error.message);
            }
            throw error;
        }
    }

    // Email de notificación al equipo
    async sendTeamNotification(quotationData) {
        try {
            const service = servicesData.find(s => s.id === quotationData.serviceId);
            const teamEmail = process.env.EMAIL_TO_TEAM;
            
            if (!teamEmail) {
                console.log('⚠️ EMAIL_TO_TEAM no configurado, saltando notificación al equipo');
                return null;
            }

            const mailOptions = {
                to: teamEmail,
                subject: `🚨 Nueva Cotización #${quotationData.id} - ${service?.title || 'Servicio'}`,
                html: this.generateTeamTemplate(quotationData, service)
            };

            return await emailConfig.sendEmail(mailOptions);
        } catch (error) {
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Error enviando notificación al equipo');
            } else {
                console.error('❌ Error enviando notificación al equipo:', error.message);
            }
            throw error;
        }
    }

    // Template para el cliente
    generateClientTemplate(quotation, service) {
        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cotización Recibida</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">✅ ¡Cotización Recibida!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                            Cotización #${quotation.id}
                        </p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 30px;">
                        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                            Hola <strong>${quotation.clientName || 'Cliente'}</strong>,
                        </p>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                            ¡Gracias por contactarnos! Hemos recibido tu solicitud de cotización y nuestro equipo la está revisando. 
                            Te contactaremos en menos de 24 horas para darte todos los detalles.
                        </p>
                        
                        <!-- Quotation Details -->
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
                            <h2 style="color: #25D366; margin: 0 0 20px 0; font-size: 20px;">
                                📋 Detalles de tu cotización:
                            </h2>
                            
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">🛍️ Servicio:</td>
                                    <td style="padding: 8px 0; color: #333;">${service?.title || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">🏢 Empresa:</td>
                                    <td style="padding: 8px 0; color: #333;">${quotation.companyName || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">💰 Precio:</td>
                                    <td style="padding: 8px 0; color: #333; font-weight: bold; color: #25D366;">
                                        ${service?.priceUSD || 'No especificado'} / ${service?.priceMXN || 'No especificado'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">⏱️ Tiempo estimado:</td>
                                    <td style="padding: 8px 0; color: #333;">${service?.estimatedTime || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">📅 Fecha:</td>
                                    <td style="padding: 8px 0; color: #333;">${new Date().toLocaleDateString('es-ES')}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Project Description -->
                        ${quotation.description ? `
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="color: #25D366; margin: 0 0 15px 0;">📝 Tu proyecto:</h3>
                            <p style="color: #333; line-height: 1.6; margin: 0;">
                                "${quotation.description}"
                            </p>
                        </div>
                        ` : ''}
                        
                        <!-- Next Steps -->
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin: 0 0 15px 0;">🚀 Próximos pasos:</h3>
                            <ol style="color: #856404; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Nuestro equipo revisará tu solicitud</li>
                                <li>Te contactaremos en menos de 24 horas</li>
                                <li>Coordinaremos una llamada si es necesario</li>
                                <li>Te enviaremos la propuesta final</li>
                            </ol>
                        </div>
                        
                        <!-- Contact Info -->
                        <div style="text-align: center; margin: 30px 0;">
                            <h3 style="color: #333; margin-bottom: 15px;">¿Tienes preguntas?</h3>
                            <p style="color: #666; margin: 5px 0;">
                                📧 Email: <a href="mailto:${process.env.EMAIL_FROM}" style="color: #25D366;">${process.env.EMAIL_FROM}</a>
                            </p>
                            <p style="color: #666; margin: 5px 0;">
                                📱 WhatsApp: Responde a nuestro chat
                            </p>
                            <p style="color: #666; margin: 5px 0;">
                                🌐 Web: <a href="https://tuempresa.com" style="color: #25D366;">www.tuempresa.com</a>
                            </p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Gracias por confiar en <strong>${process.env.COMPANY_NAME || 'nosotros'}</strong> para tu proyecto web
                        </p>
                        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                            Este email fue generado automáticamente por nuestro sistema de cotizaciones
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Template para el equipo
    generateTeamTemplate(quotation, service) {
        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nueva Cotización</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">🚨 Nueva Cotización</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                            Cotización #${quotation.id} - ${new Date().toLocaleDateString('es-ES')}
                        </p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 30px;">
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                            <p style="color: #856404; font-weight: bold; margin: 0;">
                                ⏰ Acción requerida: Contactar al cliente en menos de 24 horas
                            </p>
                        </div>
                        
                        <!-- Client Info -->
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
                            <h2 style="color: #dc3545; margin: 0 0 20px 0;">👤 Información del Cliente:</h2>
                            
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">Nombre:</td>
                                    <td style="padding: 8px 0; color: #333;">${quotation.clientName || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Empresa:</td>
                                    <td style="padding: 8px 0; color: #333;">${quotation.companyName || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
                                    <td style="padding: 8px 0;">
                                        <a href="mailto:${quotation.email}" style="color: #dc3545; text-decoration: none;">${quotation.email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Teléfono:</td>
                                    <td style="padding: 8px 0; color: #333;">${quotation.phone || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">WhatsApp:</td>
                                    <td style="padding: 8px 0; color: #333;">${quotation.phoneNumber?.replace('whatsapp:', '') || 'No especificado'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Service Info -->
                        <div style="background: #e8f5e8; padding: 25px; border-radius: 8px; margin: 25px 0;">
                            <h2 style="color: #28a745; margin: 0 0 20px 0;">🛍️ Servicio Solicitado:</h2>
                            
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">Servicio:</td>
                                    <td style="padding: 8px 0; color: #333; font-weight: bold;">${service?.title || 'No especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Precio:</td>
                                    <td style="padding: 8px 0; color: #28a745; font-weight: bold;">
                                        ${service?.priceUSD || 'No especificado'} / ${service?.priceMXN || 'No especificado'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Tiempo:</td>
                                    <td style="padding: 8px 0; color: #333;">${service?.estimatedTime || 'No especificado'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Project Description -->
                        ${quotation.description ? `
                        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <h3 style="color: #0c5460; margin: 0 0 15px 0;">📝 Descripción del Proyecto:</h3>
                            <p style="color: #0c5460; line-height: 1.6; margin: 0; font-style: italic;">
                                "${quotation.description}"
                            </p>
                        </div>
                        ` : ''}
                        
                        <!-- Actions -->
                        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                            <h3 style="color: #333; margin-bottom: 20px;">🎯 Acciones Recomendadas:</h3>
                            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                                <p style="margin: 10px 0; color: #666;">✅ Enviar email de seguimiento</p>
                                <p style="margin: 10px 0; color: #666;">📞 Programar llamada si es necesario</p>
                                <p style="margin: 10px 0; color: #666;">💼 Preparar propuesta detallada</p>
                                <p style="margin: 10px 0; color: #666;">📋 Actualizar estado en el panel</p>
                            </div>
                        </div>
                        
                        <!-- Panel Link -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.PANEL_URL || 'https://whatbot-production-2ef9.up.railway.app'}/admin/quotation/${quotation.id}" 
                               style="display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                👀 Ver en Panel de Admin
                            </a>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 14px;">
                            💼 Sistema de Cotizaciones - Bot WhatsApp
                        </p>
                        <p style="color: #adb5bd; font-size: 12px; margin: 10px 0 0 0;">
                            Cotización generada automáticamente el ${new Date().toLocaleString('es-ES')}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Enviar ambos emails (cliente y equipo)
    async sendQuotationEmails(quotationData) {
        const results = {
            client: null,
            team: null,
            errors: []
        };

        try {
            // Email al cliente
            results.client = await this.sendClientConfirmation(quotationData);
            console.log('✅ Email de confirmación enviado al cliente');
        } catch (error) {
            results.errors.push(`Error enviando email al cliente: ${error.message}`);
        }

        try {
            // Email al equipo
            results.team = await this.sendTeamNotification(quotationData);
            if (results.team) {
                console.log('✅ Notificación enviada al equipo');
            }
        } catch (error) {
            results.errors.push(`Error enviando notificación al equipo: ${error.message}`);
        }

        return results;
    }

    // Método para pruebas
    async sendTestEmails(testEmail) {
        const testQuotation = {
            id: 999,
            serviceId: 1,
            clientName: 'Cliente de Prueba',
            companyName: 'Empresa de Prueba',
            email: testEmail,
            phone: '+52 55 1234 5678',
            phoneNumber: 'whatsapp:+525512345678',
            description: 'Este es un proyecto de prueba para verificar que los emails funcionan correctamente.'
        };

        return await this.sendQuotationEmails(testQuotation);
    }
}

module.exports = new EmailService();