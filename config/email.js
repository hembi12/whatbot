// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const nodemailer = require('nodemailer');

class EmailConfig {
    constructor() {
        this.transporter = null;
        this.init();
    }

    init() {
        // Configuración para diferentes proveedores de email
        const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
        
        switch (emailProvider.toLowerCase()) {
            case 'gmail':
                this.transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_FROM,
                        pass: process.env.EMAIL_PASSWORD // App Password para Gmail
                    }
                });
                break;

            case 'outlook':
                this.transporter = nodemailer.createTransport({
                    service: 'hotmail',
                    auth: {
                        user: process.env.EMAIL_FROM,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
                break;

            case 'smtp':
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
                    auth: {
                        user: process.env.EMAIL_FROM,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
                break;

            default:
                console.error('❌ Proveedor de email no configurado correctamente');
                break;
        }

        // Verificar configuración
        if (this.transporter) {
            this.verifyConnection();
        }
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Configuración de email verificada correctamente');
        } catch (error) {
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Error en configuración de email');
            } else {
                console.error('❌ Error en configuración de email:', error.message);
                console.error('💡 Verifica tus credenciales en el archivo .env');
            }
        }
    }

    async sendEmail(mailOptions) {
        try {
            if (!this.transporter) {
                throw new Error('Transporter de email no configurado');
            }

            // Configuración por defecto
            const defaultOptions = {
                from: `"${process.env.COMPANY_NAME || 'Bot WhatsApp'}" <${process.env.EMAIL_FROM}>`,
            };

            const finalOptions = { ...defaultOptions, ...mailOptions };
            
            console.log(`📧 Enviando email a: ${finalOptions.to}`);
            const result = await this.transporter.sendMail(finalOptions);
            
            console.log('✅ Email enviado exitosamente:', result.messageId);
            return result;

        } catch (error) {
            console.error('❌ Error enviando email:', error.message);
            throw error;
        }
    }

    // Método para enviar emails de prueba
    async sendTestEmail(to) {
        try {
            const mailOptions = {
                to: to,
                subject: '✅ Prueba de Configuración - Bot WhatsApp',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #25D366;">🤖 ¡Configuración Exitosa!</h2>
                        <p>Si recibes este email, significa que la configuración de tu bot de WhatsApp está funcionando correctamente.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>✅ Sistema configurado:</h3>
                            <ul>
                                <li>Bot de WhatsApp ✅</li>
                                <li>Base de datos ✅</li>
                                <li>Sistema de emails ✅</li>
                                <li>Panel de administración ✅</li>
                            </ul>
                        </div>
                        
                        <p>¡Tu bot está listo para recibir cotizaciones!</p>
                        
                        <hr style="margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            Este es un email automático generado por tu Bot de WhatsApp.
                        </p>
                    </div>
                `
            };

            return await this.sendEmail(mailOptions);
        } catch (error) {
            console.error('❌ Error enviando email de prueba:', error.message);
            throw error;
        }
    }

    // Obtener información de configuración (sin exponer credenciales)
    getConfigInfo() {
        return {
            provider: process.env.EMAIL_PROVIDER || 'gmail',
            fromEmail: process.env.EMAIL_FROM,
            companyName: process.env.COMPANY_NAME || 'Bot WhatsApp',
            isConfigured: !!this.transporter,
            teamEmail: process.env.EMAIL_TO_TEAM
        };
    }
}

module.exports = new EmailConfig();