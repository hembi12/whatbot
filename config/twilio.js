// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const twilio = require('twilio');

class TwilioConfig {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.phoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        
        this.init();
    }

    init() {
        // Solo mostrar debugging en desarrollo
        if (process.env.NODE_ENV !== 'production') {
            this.debugConfiguration();
        }

        // Verificar configuración
        this.validateConfiguration();

        // Crear cliente de Twilio
        this.client = twilio(this.accountSid, this.authToken);
        
        console.log('✅ Cliente de Twilio inicializado correctamente');
    }

    debugConfiguration() {
        console.log('🔍 DEBUGGING TWILIO CONFIG:');
        console.log('NODE_ENV:', process.env.NODE_ENV);

        // Solo mostrar variables Twilio
        const twilioVars = Object.keys(process.env).filter(key => key.includes('TWILIO'));
        console.log('Variables Twilio encontradas:', twilioVars);

        twilioVars.forEach(key => {
            console.log(`${key}:`, process.env[key] ? 'CONFIGURADO' : 'NO CONFIGURADO');
        });

        console.log('📊 Valores finales:');
        console.log('accountSid:', this.accountSid ? `${this.accountSid.substring(0, 10)}...` : 'UNDEFINED');
        console.log('authToken:', this.authToken ? `${this.authToken.substring(0, 10)}...` : 'UNDEFINED');
        console.log('phoneNumber:', this.phoneNumber || 'UNDEFINED');
        console.log('messagingServiceSid:', this.messagingServiceSid || 'UNDEFINED');
    }

    validateConfiguration() {
        if (!this.accountSid || !this.authToken || !this.messagingServiceSid) {
            console.error('❌ Error: Variables de entorno de Twilio no configuradas');
            if (process.env.NODE_ENV !== 'production') {
                console.error('💡 Verifica que tengas estas variables en tu .env:');
                console.error('   - TWILIO_ACCOUNT_SID');
                console.error('   - TWILIO_AUTH_TOKEN');
                console.error('   - TWILIO_MESSAGING_SERVICE_SID');
            }
            throw new Error('Configuración de Twilio incompleta');
        }
    }

    // Función principal para enviar mensajes
    async sendMessage(to, message) {
        try {
            const result = await this.client.messages.create({
                body: message,
                messagingServiceSid: this.messagingServiceSid,
                to: to
            });
            
            if (process.env.NODE_ENV === 'production') {
                console.log(`✅ Mensaje enviado - SID: ${result.sid}`);
            } else {
                console.log(`✅ Mensaje enviado a ${to} - SID: ${result.sid}`);
                console.log(`📤 Via Messaging Service: ${this.messagingServiceSid}`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error.message);
            console.error('❌ Error code:', error.code);
            if (error.moreInfo) {
                console.error('❌ More info:', error.moreInfo);
            }
            throw error;
        }
    }

    // Función alternativa usando el número directo (fallback)
    async sendMessageDirect(to, message) {
        try {
            const result = await this.client.messages.create({
                body: message,
                from: this.phoneNumber,
                to: to
            });
            
            console.log(`✅ Mensaje enviado directo a ${to} - SID: ${result.sid}`);
            return result;
        } catch (error) {
            console.error('❌ Error enviando mensaje directo:', error.message);
            throw error;
        }
    }

    // Función para validar webhook de Twilio (seguridad)
    validateWebhook(req) {
        try {
            const twilioSignature = req.headers['x-twilio-signature'];
            const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
            
            return twilio.validateRequest(
                this.authToken,
                twilioSignature,
                url,
                req.body
            );
        } catch (error) {
            console.error('❌ Error validando webhook:', error.message);
            return false;
        }
    }

    // Método para probar la conexión
    async testConnection() {
        try {
            // Obtener información de la cuenta para verificar conexión
            const account = await this.client.api.accounts(this.accountSid).fetch();
            console.log('✅ Conexión con Twilio verificada:', account.friendlyName);
            return true;
        } catch (error) {
            console.error('❌ Error conectando con Twilio:', error.message);
            return false;
        }
    }

    // Obtener información de configuración (sin exponer credenciales)
    getConfigInfo() {
        return {
            isConfigured: !!(this.accountSid && this.authToken && this.messagingServiceSid),
            hasPhoneNumber: !!this.phoneNumber,
            hasMessagingService: !!this.messagingServiceSid,
            accountSid: this.accountSid ? `${this.accountSid.substring(0, 10)}...` : null
        };
    }
}

// Crear y exportar instancia
const twilioConfig = new TwilioConfig();

module.exports = {
    client: twilioConfig.client,
    sendMessage: twilioConfig.sendMessage.bind(twilioConfig),
    sendMessageDirect: twilioConfig.sendMessageDirect.bind(twilioConfig),
    validateWebhook: twilioConfig.validateWebhook.bind(twilioConfig),
    testConnection: twilioConfig.testConnection.bind(twilioConfig),
    getConfigInfo: twilioConfig.getConfigInfo.bind(twilioConfig),
    phoneNumber: twilioConfig.phoneNumber,
    messagingServiceSid: twilioConfig.messagingServiceSid
};