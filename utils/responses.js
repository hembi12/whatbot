const servicesData = require('../data/servicesData');

// Mensajes y respuestas del bot
class ResponseGenerator {
    
    // Mensaje de bienvenida
    static getWelcomeMessage() {
        return "¡Hola! 👋 Soy el asistente de Martil.dev\n" +
               "Te ayudo a encontrar el servicio perfecto para tu proyecto.\n\n" +
               "Escribe \"cotizar\" para empezar 🚀\n\n" +
               "También puedes usar:\n" +
               "• \"precios\" - Ver lista de precios\n" +
               "• \"contacto\" - Información de contacto\n" +
               "• \"portafolio\" - Ver trabajos anteriores";
    }

    // Menú principal de servicios
    static getMainMenu() {
        let menu = "¿Qué tipo de sitio web necesitas?\n\n";
        servicesData.forEach(service => {
            menu += `${service.id}️⃣ ${service.icon} ${service.title} (${service.priceUSD})\n`;
        });
        menu += "\nResponde con el número de tu opción (ej: \"1\")";
        return menu;
    }

    // Detalles de un servicio específico
    static getServiceDetails(serviceId) {
        const service = servicesData.find(s => s.id === serviceId);
        if (!service) return null;
        
        let details = `${service.icon} ${service.title.toUpperCase()}\n\n`;
        details += `💰 Precio: ${service.priceUSD} / ${service.priceMXN}\n`;
        details += `⏱️ Tiempo: ${service.estimatedTime}\n\n`;
        details += `✅ Incluye:\n`;
        service.features.forEach(feature => {
            details += `• ${feature}\n`;
        });
        details += `• Dominio + Hosting\n`;
        details += `• Diseño responsivo\n`;
        details += `• Seguridad avanzada\n`;
        details += `• Y más...\n\n`;
        details += `¿Te interesa este servicio?\n`;
        details += `1️⃣ Sí, solicitar cotización\n`;
        details += `2️⃣ Ver otro servicio\n`;
        details += `3️⃣ Más información`;
        
        return details;
    }

    // Tabla de precios
    static getPricesTable() {
        let table = "💰 LISTA DE PRECIOS:\n\n";
        servicesData.forEach(service => {
            table += `${service.icon} ${service.title}\n`;
            table += `${service.priceUSD} / ${service.priceMXN}\n`;
            table += `⏱️ ${service.estimatedTime}\n\n`;
        });
        table += "Escribe \"cotizar\" para solicitar una cotización";
        return table;
    }

    // Información de contacto
    static getContactInfo() {
        return "📞 CONTACTO:\n\n" +
               "📧 Email: hectormartilb@gmail.com\n" +
               "📱 WhatsApp: Este chat\n" +
               "🌐 Web: www.martil.dev/\n\n" +
               "Escribe \"cotizar\" para solicitar una cotización";
    }

    // Información del portafolio
    static getPortfolioInfo() {
        return "🎨 PORTAFOLIO:\n\n" +
               "Visita nuestros trabajos anteriores:\n" +
               `👉 ${process.env.COMPANY_WEBSITE || 'www.tuempresa.com'}/portafolio\n\n` +
               "O escribe \"cotizar\" para tu proyecto";
    }

    // Comandos de ayuda
    static getHelpMessage() {
        return "🤖 COMANDOS DISPONIBLES:\n\n" +
               "• \"cotizar\" - Solicitar cotización\n" +
               "• \"precios\" - Ver lista de precios\n" +
               "• \"contacto\" - Información de contacto\n" +
               "• \"portafolio\" - Ver trabajos anteriores\n" +
               "• \"menu\" - Volver al menú principal\n" +
               "• \"salir\" - Finalizar conversación\n\n" +
               "¡Empezemos! Escribe \"cotizar\" 🚀";
    }

    // Más información de un servicio
    static getServiceMoreInfo(serviceId) {
        const service = servicesData.find(s => s.id === serviceId);
        if (!service) return null;

        let info = `ℹ️ MÁS INFORMACIÓN - ${service.title.toUpperCase()}\n\n`;
        info += `${service.description}\n\n`;
        info += `Características principales:\n`;
        service.features.forEach(feature => {
            info += `✅ ${feature}\n`;
        });
        info += `\n¿Te interesa solicitar una cotización?\n`;
        info += `1️⃣ Sí, solicitar cotización\n`;
        info += `2️⃣ Ver otro servicio`;
        
        return info;
    }

    // Resumen de cotización
    static getQuoteSummary(session) {
        const service = servicesData.find(s => s.id === session.selectedService);
        if (!service) return "Error: Servicio no encontrado";

        let summary = "📋 RESUMEN DE TU COTIZACIÓN:\n\n";
        summary += `Servicio: ${service.title}\n`;
        summary += `Cliente: ${session.data.name || 'No especificado'}\n`;
        summary += `Empresa: ${session.data.company || 'No especificado'}\n`;
        summary += `Email: ${session.data.email || 'No especificado'}\n`;
        summary += `Teléfono: ${session.data.phone || 'No especificado'}\n`;
        summary += `Descripción: "${session.data.description || 'No especificado'}"\n\n`;
        summary += `💰 Precio: ${service.priceUSD} / ${service.priceMXN}\n`;
        summary += `⏱️ Tiempo estimado: ${service.estimatedTime}\n\n`;
        summary += `¿Confirmas esta información?\n`;
        summary += `1️⃣ Sí, enviar cotización\n`;
        summary += `2️⃣ Modificar datos`;
        
        return summary;
    }

    // Cotización exitosa
    static getQuotationSuccessMessage(quotationId, email) {
        return "✅ ¡Cotización enviada exitosamente!\n\n" +
               `📋 Número de cotización: #${quotationId}\n` +
               `Te contactaremos en menos de 24 horas al email: ${email}\n\n` +
               "🚀 Mientras tanto:\n" +
               `• Revisa nuestro portafolio: ${process.env.COMPANY_WEBSITE || 'www.tuempresa.com'}/portafolio\n` +
               `• Síguenos en redes: @${process.env.COMPANY_SOCIAL || 'tuempresa'}\n\n` +
               "¿Qué te gustaría hacer ahora?\n" +
               "1️⃣ Solicitar otra cotización\n" +
               "2️⃣ Finalizar conversación";
    }

    // Mensaje de despedida después de cotización
    static getFarewellMessage() {
        return "¡Gracias por contactarnos! 🙏\n\n" +
               "Ha sido un placer ayudarte con tu proyecto web. " +
               "Nuestro equipo revisará tu solicitud y te contactaremos pronto.\n\n" +
               "💼 Si tienes alguna pregunta urgente:\n" +
               `📧 Email: ${process.env.EMAIL_FROM || 'info@tuempresa.com'}\n` +
               "📱 WhatsApp: Siempre disponible aquí\n\n" +
               "¡Que tengas un excelente día! ✨\n\n" +
               "---\n" +
               "Escribe \"hola\" cuando quieras volver a chatear 😊";
    }

    // Mensaje de salida general
    static getExitMessage() {
        return "¡Gracias por usar nuestro servicio de cotizaciones! 🙏\n\n" +
               "Esperamos poder ayudarte pronto con tu proyecto web.\n\n" +
               "📞 Recuerda que siempre puedes contactarnos:\n" +
               `📧 Email: ${process.env.EMAIL_FROM || 'info@tuempresa.com'}\n` +
               "📱 WhatsApp: Aquí mismo\n\n" +
               "¡Hasta pronto! ✨\n\n" +
               "---\n" +
               "Escribe \"hola\" para volver a empezar 😊";
    }

    // Error de cotización
    static getQuotationErrorMessage() {
        return "⚠️ Hubo un problema al procesar tu cotización. " +
               "Por favor, intenta nuevamente o contáctanos directamente.\n\n" +
               `📧 Email: ${process.env.EMAIL_FROM || 'info@tuempresa.com'}`;
    }

    // Mensaje por defecto
    static getDefaultMessage() {
        return "¡Bienvenido! 👋\n\n" +
               "Soy tu asistente para cotizaciones de sitios web.\n\n" +
               "Escribe \"cotizar\" para empezar o \"ayuda\" para ver todas las opciones.";
    }

    // Mensaje de opción inválida
    static getInvalidOptionMessage(validOptions) {
        return `Por favor, selecciona una opción válida: ${validOptions}`;
    }

    // Mensaje de email inválido
    static getInvalidEmailMessage() {
        return "Por favor, ingresa un email válido (ejemplo: tu@email.com):";
    }
}

module.exports = ResponseGenerator;