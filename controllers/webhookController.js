const { sendMessage } = require('../config/twilio');
const sessionService = require('../services/sessionService');
const quotationService = require('../services/quotationService');
const ResponseGenerator = require('../utils/responses');

class WebhookController {
    
    async handleIncomingMessage(req, res) {
        console.log('🔥 WEBHOOK EJECUTÁNDOSE - Inicio');
        
        // Logging condicional en desarrollo
        if (process.env.NODE_ENV !== 'production') {
            console.log('📦 req.body:', req.body);
        }
        
        try {
            const incomingMessage = req.body.Body?.toLowerCase().trim() || '';
            const from = req.body.From;
            
            // Validar datos de entrada
            if (!from || !req.body.Body) {
                console.error('❌ Datos de entrada inválidos');
                return res.status(400).send('Datos inválidos');
            }
            
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
            console.log('✅ Respuesta enviada exitosamente');
            
            res.status(200).send('OK');
            
        } catch (error) {
            console.error('❌ Error en webhook:', error.message);
            if (process.env.NODE_ENV !== 'production') {
                console.error('❌ Stack trace:', error.stack);
            }
            
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
        const commands = {
            'menu': () => {
                sessionService.updateUserSession(from, { step: 'main_menu' });
                return ResponseGenerator.getMainMenu();
            },
            'inicio': () => {
                sessionService.updateUserSession(from, { step: 'main_menu' });
                return ResponseGenerator.getMainMenu();
            },
            'salir': () => {
                sessionService.clearUserSession(from);
                return ResponseGenerator.getExitMessage();
            },
            'cerrar': () => {
                sessionService.clearUserSession(from);
                return ResponseGenerator.getExitMessage();
            },
            'bye': () => {
                sessionService.clearUserSession(from);
                return ResponseGenerator.getExitMessage();
            },
            'adios': () => {
                sessionService.clearUserSession(from);
                return ResponseGenerator.getExitMessage();
            },
            'precios': () => ResponseGenerator.getPricesTable(),
            'contacto': () => ResponseGenerator.getContactInfo(),
            'portafolio': () => ResponseGenerator.getPortfolioInfo()
        };
        
        return commands[message] ? commands[message]() : null;
    }
    
    // Manejar flujo principal
    async handleMainFlow(message, from, messageBody) {
        const session = sessionService.getUserSession(from);
        
        const flowHandlers = {
            'initial': () => this.handleInitialStep(message, from),
            'main_menu': () => this.handleMainMenuStep(message, from),
            'service_details': () => this.handleServiceDetailsStep(message, from),
            'quote_name': () => this.handleQuoteNameStep(messageBody.Body, from),
            'quote_company': () => this.handleQuoteCompanyStep(messageBody.Body, from),
            'quote_email': () => this.handleQuoteEmailStep(messageBody.Body, from),
            'quote_phone': () => this.handleQuotePhoneStep(messageBody.Body, from),
            'quote_description': () => this.handleQuoteDescriptionStep(messageBody.Body, from),
            'quote_summary': () => this.handleQuoteSummaryStep(message, from),
            'quote_sent': () => this.handleQuoteSentStep(message, from)
        };
        
        if (flowHandlers[session.step]) {
            return await flowHandlers[session.step]();
        } else {
            // Reset si step desconocido
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
            return this.getInvalidOptionResponse("(1-6)", ResponseGenerator.getMainMenu());
        }
    }
    
    // Step: Service Details
    handleServiceDetailsStep(message, from) {
        const session = sessionService.getUserSession(from);
        
        switch (message) {
            case '1':
                sessionService.updateUserSession(from, { step: 'quote_name' });
                return "¡Perfecto! Necesito algunos datos para tu cotización:\n\n👤 ¿Cuál es tu nombre?";
            case '2':
                sessionService.updateUserSession(from, { step: 'main_menu' });
                return ResponseGenerator.getMainMenu();
            case '3':
                return ResponseGenerator.getServiceMoreInfo(session.selectedService);
            default:
                return this.getInvalidOptionResponse("1️⃣, 2️⃣ o 3️⃣", "1️⃣ Sí, solicitar cotización\n2️⃣ Ver otro servicio\n3️⃣ Más información");
        }
    }
    
    // Steps del formulario de cotización
    handleQuoteNameStep(name, from) {
        if (!name || name.trim().length < 2) {
            return "Por favor, ingresa un nombre válido (mínimo 2 caracteres).";
        }
        
        sessionService.updateUserSession(from, { 
            step: 'quote_company',
            data: { name: name.trim() }
        });
        return "Gracias! 🏢 ¿Cuál es el nombre de tu empresa o proyecto?";
    }
    
    handleQuoteCompanyStep(company, from) {
        if (!company || company.trim().length < 2) {
            return "Por favor, ingresa un nombre de empresa válido (mínimo 2 caracteres).";
        }
        
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
                data: { ...session.data, email: email.trim().toLowerCase() }
            });
            return "Excelente! 📱 ¿Cuál es tu número de teléfono?";
        } else {
            return ResponseGenerator.getInvalidEmailMessage();
        }
    }
    
    handleQuotePhoneStep(phone, from) {
        if (!phone || phone.trim().length < 8) {
            return "Por favor, ingresa un número de teléfono válido (mínimo 8 dígitos).";
        }
        
        const session = sessionService.getUserSession(from);
        sessionService.updateUserSession(from, { 
            step: 'quote_description',
            data: { ...session.data, phone: phone.trim() }
        });
        return "¡Casi terminamos! 📝 Describe brevemente tu proyecto (qué necesitas, colores, estilo, etc.):";
    }
    
    handleQuoteDescriptionStep(description, from) {
        if (!description || description.trim().length < 10) {
            return "Por favor, proporciona una descripción más detallada de tu proyecto (mínimo 10 caracteres).";
        }
        
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
            return this.getInvalidOptionResponse("1️⃣ o 2️⃣", "1️⃣ Sí, enviar cotización\n2️⃣ Modificar datos");
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
            return this.getInvalidOptionResponse("1️⃣ o 2️⃣", "1️⃣ Solicitar otra cotización\n2️⃣ Finalizar conversación");
        }
    }
    
    // Método auxiliar para respuestas de opción inválida
    getInvalidOptionResponse(validOptions, menuOptions) {
        return ResponseGenerator.getInvalidOptionMessage(validOptions) + 
               "\n\n" + menuOptions;
    }
}

// Crear una instancia del controlador
const controller = new WebhookController();

// Exportar el método correctamente vinculado
module.exports = {
    handleIncomingMessage: controller.handleIncomingMessage.bind(controller)
};