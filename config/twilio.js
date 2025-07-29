// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const twilio = require('twilio');

// DEBUGGING COMPLETO - Temporal para diagnóstico
console.log('🔍 DEBUGGING COMPLETO:');
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.DEBUG_ALL_VARS) {
    console.log('🔍 TODAS las variables de entorno disponibles:');
    console.log(Object.keys(process.env).sort());
}

console.log('Todas las variables que empiezan con TWILIO:');
const twilioVars = Object.keys(process.env).filter(key => key.includes('TWILIO'));
console.log('Variables encontradas:', twilioVars);

twilioVars.forEach(key => {
    console.log(`${key}:`, process.env[key] ? 'CONFIGURADO' : 'NO CONFIGURADO');
});

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;

console.log('📊 Valores finales:');
console.log('accountSid:', accountSid ? `${accountSid.substring(0, 10)}...` : 'UNDEFINED');
console.log('authToken:', authToken ? `${authToken.substring(0, 10)}...` : 'UNDEFINED');
console.log('phoneNumber:', phoneNumber || 'UNDEFINED');

// Verificar que las variables de entorno estén configuradas
if (!accountSid || !authToken || !phoneNumber) {
    console.error('❌ Error: Variables de entorno de Twilio no configuradas');
    if (process.env.NODE_ENV !== 'production') {
        console.error('Verifica que tengas TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_NUMBER en tu .env');
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