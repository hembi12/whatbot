const { sendMessage } = require('../config/twilio');
const sessionService = require('../services/sessionService');
const quotationService = require('../services/quotationService');
const ResponseGenerator = require('../utils/responses');

class WebhookController {
    
    async handleIncomingMessage(req, res) {
        try {
            const incomingMessage = req.body.Body.toLowerCase().trim();
            const from = req.body.From;
            const session = sessionService.getUserSession(from);
            
            console.log(`📨 Mensaje recibido de ${from}: ${req.body.Body}`);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`📍 Estado actual: ${session.step}`);
            }
            
            // Actualizar actividad de sesión
            sessionService.updateSessionActivity(from);
            
            let responseMessage = '';
            
            // Comandos globales
            responseMessage = await this.handleGlobalCommands(incomingMessage, from);
            
            // Si no es comando global, procesar flujo principal
            if (!responseMessage) {
                responseMessage = await this.handleMainFlow(incomingMessage, from, req.body);
            }
            
            // Enviar respuesta
            await sendMessage(from, responseMessage);
            res.status(200).send('OK');
            
        } catch (error) {
            console.error('❌ Error en webhook:', error.message);
            
            // En producción, intentar responder al usuario antes de fallar
            if (process.env.NODE_ENV === 'production') {
                try {
                    await sendMessage(req.body.From, 'Lo siento, ha ocurrido un error temporal. Por favor, intenta nuevamente en unos momentos.');
                } catch (sendError) {
                    console.error('❌ Error enviando mensaje de error:', sendError.message);
                }
            }
            
            res.status(500).send('Error interno del servidor');
        }
    }
    
    // Manejar comandos globales
    async handleGlobalCommands(message, from) {
        switch (message) {
            case 'menu':
            case 'inicio':
                sessionService.updateUserSession(from, { step: 'main_menu' });
                return ResponseGenerator.getMainMenu();
                
            case 'salir':
            case 'cerrar':
            case 'bye':
            case 'adios':
                sessionService.clearUserSession(from);
                return ResponseGenerator.getExitMessage();
                
            case 'precios':
                return ResponseGenerator.getPricesTable();
                
            case 'contacto':
                return ResponseGenerator.getContactInfo();
                
            case 'portafolio':
                return ResponseGenerator.getPortfolioInfo();
                
            default:
                return null; // No es comando global
        }
    }
    
    // Manejar flujo principal
    async handleMainFlow(message, from, messageBody) {
        const session = sessionService.getUserSession(from);
        
        switch (session.step) {
            case 'initial':
                return this.handleInitialStep(message, from);
                
            case 'main_menu':
                return this.handleMainMenuStep(message, from);
                
            case 'service_details':
                return this.handleServiceDetailsStep(message, from);
                
            case 'quote_name':
                return this.handleQuoteNameStep(messageBody.Body, from);
                
            case 'quote_company':
                return this.handleQuoteCompanyStep(messageBody.Body, from);
                
            case 'quote_email':
                return this.handleQuoteEmailStep(messageBody.Body, from);
                
            case 'quote_phone':
                return this.handleQuotePhoneStep(messageBody.Body, from);
                
            case 'quote_description':
                return this.handleQuoteDescriptionStep(messageBody.Body, from);
                
            case 'quote_summary':
                return await this.handleQuoteSummaryStep(message, from);
                
            case 'quote_sent':
                return this.handleQuoteSentStep(message, from);
                
            default:
                sessionService.updateUserSession(from, { step: 'initial' });
                return ResponseGenerator.getDefaultMessage();
        }
    }
    
    // Step: Initial
    handleInitialStep(message, from) {
        if (message.includes('hola')) {
            return ResponseGenerator.getWelcomeMessage();
        } else if (message === 'cotizar') {
            sessionService.updateUserSession(from, { step: 'main_menu' });
            return ResponseGenerator.getMainMenu();
        } else if (message.includes('ayuda')) {
            return ResponseGenerator.getHelpMessage();
        } else {
            return ResponseGenerator.getDefaultMessage();
        }
    }
    
    // Step: Main Menu
    handleMainMenuStep(message, from) {
        const serviceId = parseInt(message);
        if (serviceId >= 1 && serviceId <= 6) {
            sessionService.updateUserSession(from, { 
                step: 'service_details',
                selectedService: serviceId 
            });
            return ResponseGenerator.getServiceDetails(serviceId);
        } else {
            return ResponseGenerator.getInvalidOptionMessage("(1-6)") + 
                   "\n\n" + ResponseGenerator.getMainMenu();
        }
    }
    
    // Step: Service Details
    handleServiceDetailsStep(message, from) {
        const session = sessionService.getUserSession(from);
        
        if (message === '1') {
            sessionService.updateUserSession(from, { step: 'quote_name' });
            return "¡Perfecto! Necesito algunos datos para tu cotización:\n\n👤 ¿Cuál es tu nombre?";
        } else if (message === '2') {
            sessionService.updateUserSession(from, { step: 'main_menu' });
            return ResponseGenerator.getMainMenu();
        } else if (message === '3') {
            return ResponseGenerator.getServiceMoreInfo(session.selectedService);
        } else {
            return ResponseGenerator.getInvalidOptionMessage("1️⃣, 2️⃣ o 3️⃣") + 
                   "\n\n1️⃣ Sí, solicitar cotización\n2️⃣ Ver otro servicio\n3️⃣ Más información";
        }
    }
    
    // Steps del formulario de cotización
    handleQuoteNameStep(name, from) {
        sessionService.updateUserSession(from, { 
            step: 'quote_company',
            data: { name: name.trim() }
        });
        return "Gracias! 🏢 ¿Cuál es el nombre de tu empresa o proyecto?";
    }
    
    handleQuoteCompanyStep(company, from) {
        const session = sessionService.getUserSession(from);
        sessionService.updateUserSession(from, { 
            step: 'quote_email',
            data: { ...session.data, company: company.trim() }
        });
        return "Perfecto! 📧 ¿Cuál es tu email de contacto?";
    }
    
    handleQuoteEmailStep(email, from) {
        const session = sessionService.getUserSession(from);
        
        if (quotationService.isValidEmail(email)) {
            sessionService.updateUserSession(from, { 
                step: 'quote_phone',
                data: { ...session.data, email: email.trim() }
            });
            return "Excelente! 📱 ¿Cuál es tu número de teléfono?";
        } else {
            return ResponseGenerator.getInvalidEmailMessage();
        }
    }
    
    handleQuotePhoneStep(phone, from) {
        const session = sessionService.getUserSession(from);
        sessionService.updateUserSession(from, { 
            step: 'quote_description',
            data: { ...session.data, phone: phone.trim() }
        });
        return "¡Casi terminamos! 📝 Describe brevemente tu proyecto (qué necesitas, colores, estilo, etc.):";
    }
    
    handleQuoteDescriptionStep(description, from) {
        const session = sessionService.getUserSession(from);
        sessionService.updateUserSession(from, { 
            step: 'quote_summary',
            data: { ...session.data, description: description.trim() }
        });
        return ResponseGenerator.getQuoteSummary(sessionService.getUserSession(from));
    }
    
    // Step: Quote Summary
    async handleQuoteSummaryStep(message, from) {
        const session = sessionService.getUserSession(from);
        
        if (message === '1') {
            try {
                // Validar datos
                const validation = quotationService.validateQuotationData(session);
                if (!validation.isValid) {
                    return "❌ Error en los datos:\n" + validation.errors.join('\n') + 
                           "\n\nEscribe \"menu\" para empezar de nuevo.";
                }
                
                // Crear cotización
                const savedQuotation = await quotationService.createQuotation(from, session);
                
                sessionService.updateUserSession(from, { step: 'quote_sent' });
                return ResponseGenerator.getQuotationSuccessMessage(
                    savedQuotation.id, 
                    session.data.email
                );
                
            } catch (error) {
                console.error('❌ Error guardando cotización:', error.message);
                
                // En producción, limpiar sesión si hay error
                if (process.env.NODE_ENV === 'production') {
                    sessionService.updateUserSession(from, { step: 'initial', data: {} });
                }
                
                return ResponseGenerator.getQuotationErrorMessage();
            }
        } else if (message === '2') {
            sessionService.updateUserSession(from, { step: 'quote_name' });
            return "Vamos a corregir los datos.\n\n👤 ¿Cuál es tu nombre?";
        } else {
            return ResponseGenerator.getInvalidOptionMessage("1️⃣ o 2️⃣") + 
                   "\n\n1️⃣ Sí, enviar cotización\n2️⃣ Modificar datos";
        }
    }
    
    // Step: Quote Sent
    handleQuoteSentStep(message, from) {
        if (message === '1') {
            sessionService.updateUserSession(from, { 
                step: 'main_menu', 
                data: {},
                selectedService: null 
            });
            return "¡Perfecto! Vamos con una nueva cotización:\n\n" + 
                   ResponseGenerator.getMainMenu();
        } else if (message === '2') {
            sessionService.clearUserSession(from);
            return ResponseGenerator.getFarewellMessage();
        } else {
            return ResponseGenerator.getInvalidOptionMessage("1️⃣ o 2️⃣") + 
                   "\n\n1️⃣ Solicitar otra cotización\n2️⃣ Finalizar conversación";
        }
    }
}

module.exports = {
    handleIncomingMessage: async (req, res) => {
        const controller = new WebhookController();
        return controller.handleIncomingMessage(req, res);
    }
};