// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const twilio = require('twilio');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Debugging en desarrollo
if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Debug Twilio variables:');
    console.log('TWILIO_ACCOUNT_SID:', accountSid ? 'Configurado' : 'NO CONFIGURADO');
    console.log('TWILIO_AUTH_TOKEN:', authToken ? 'Configurado' : 'NO CONFIGURADO');
    console.log('TWILIO_PHONE_NUMBER:', phoneNumber ? 'Configurado' : 'NO CONFIGURADO');
}

// Verificar que las variables de entorno estén configuradas
if (!accountSid || !authToken || !phoneNumber) {
    console.error('❌ Error: Variables de entorno de Twilio no configuradas');
    if (process.env.NODE_ENV !== 'production') {
        console.error('Verifica que tengas TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER en tu .env');
    }
    process.exit(1);
}

// Crear cliente de Twilio
const client = twilio(accountSid, authToken);

// Función para enviar mensaje
async function sendMessage(to, message) {
    try {
        const result = await client.messages.create({
            body: message,
            from: phoneNumber,
            to: to
        });
        
        if (process.env.NODE_ENV === 'production') {
            console.log(`✅ Mensaje enviado - SID: ${result.sid}`);
        } else {
            console.log(`✅ Mensaje enviado a ${to} - SID: ${result.sid}`);
        }
        return result;
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error.message);
        throw error;
    }
}

// Función para validar webhook de Twilio (opcional, para seguridad)
function validateWebhook(req) {
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    return twilio.validateRequest(
        authToken,
        twilioSignature,
        url,
        req.body
    );
}

module.exports = {
    client,
    sendMessage,
    validateWebhook,
    phoneNumber
};