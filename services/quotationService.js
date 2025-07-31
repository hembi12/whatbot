const Database = require('../database');
const servicesData = require('../data/servicesData');
const emailService = require('./emailService');

class QuotationService {
    constructor() {
        this.db = new Database();
    }

    // Crear una nueva cotización
    async createQuotation(phoneNumber, session) {
        try {
            // Validar datos antes de procesar
            const validation = this.validateQuotationData(session);
            if (!validation.isValid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }

            const service = servicesData.find(s => s.id === session.selectedService);
            if (!service) {
                throw new Error('Servicio no encontrado');
            }

            const quotationData = {
                phoneNumber: phoneNumber,
                serviceId: session.selectedService,
                serviceName: service.title,
                clientName: session.data.name.trim(),
                companyName: session.data.company.trim(),
                email: session.data.email.trim().toLowerCase(),
                phone: session.data.phone.trim(),
                description: session.data.description.trim(),
                priceUsd: service.priceUSD,
                priceMxn: service.priceMXN,
                estimatedTime: service.estimatedTime
            };

            // Guardar cotización en base de datos
            const savedQuotation = await this.db.saveQuotation(quotationData);
            
            // Guardar métrica de cotización completada
            await this.saveQuotationMetric(phoneNumber, 'quotation_completed', session.selectedService, service.title);

            // Procesar emails de forma asíncrona
            this.processQuotationEmails(phoneNumber, quotationData, savedQuotation.id);

            console.log('✅ Cotización creada exitosamente:', savedQuotation.id);
            return savedQuotation;

        } catch (error) {
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Error creando cotización');
            } else {
                console.error('❌ Error creando cotización:', error.message);
            }
            throw error;
        }
    }

    // Procesar emails de cotización (método auxiliar)
    async processQuotationEmails(phoneNumber, quotationData, quotationId) {
        try {
            const emailResults = await emailService.sendQuotationEmails({
                ...quotationData,
                id: quotationId
            });
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('📧 Emails procesados:', {
                    client: emailResults.client ? 'Enviado' : 'No enviado',
                    team: emailResults.team ? 'Enviado' : 'No enviado',
                    errors: emailResults.errors
                });
            }
            
            // Guardar métrica de emails
            await this.db.saveMetric(phoneNumber, 'emails_sent', {
                quotationId: quotationId,
                clientEmail: !!emailResults.client,
                teamEmail: !!emailResults.team,
                errors: emailResults.errors
            });
            
        } catch (emailError) {
            if (process.env.NODE_ENV === 'production') {
                console.error('⚠️ Error enviando emails (cotización guardada)');
            } else {
                console.error('⚠️ Error enviando emails (cotización guardada):', emailError.message);
            }
            // No fallar la cotización si hay error en emails
        }
    }

    // Método auxiliar para guardar métricas
    async saveQuotationMetric(phoneNumber, action, serviceId, serviceName) {
        try {
            await this.db.saveMetric(phoneNumber, action, {
                serviceId: serviceId,
                serviceName: serviceName
            });
        } catch (error) {
            console.error('⚠️ Error guardando métrica:', error.message);
            // No fallar el proceso principal por errores de métricas
        }
    }

    // Obtener cotización por ID
    async getQuotationById(id) {
        try {
            if (!id || !Number.isInteger(Number(id))) {
                throw new Error('ID de cotización inválido');
            }

            const quotations = await this.db.getAllQuotations();
            const quotation = quotations.find(q => q.id === Number(id));
            
            if (!quotation) {
                return null;
            }

            return quotation;
        } catch (error) {
            console.error('❌ Error obteniendo cotización:', error.message);
            throw error;
        }
    }

    // Obtener cotizaciones de un usuario
    async getUserQuotations(phoneNumber) {
        try {
            if (!phoneNumber || phoneNumber.trim().length === 0) {
                throw new Error('Número de teléfono requerido');
            }

            return await this.db.getQuotationsByPhone(phoneNumber);
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones del usuario:', error.message);
            throw error;
        }
    }

    // Actualizar estado de cotización
    async updateQuotationStatus(id, status) {
        try {
            const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
            
            if (!validStatuses.includes(status)) {
                throw new Error(`Estado inválido: ${status}. Estados válidos: ${validStatuses.join(', ')}`);
            }

            if (!id || !Number.isInteger(Number(id))) {
                throw new Error('ID de cotización inválido');
            }

            const result = await this.db.updateQuotationStatus(Number(id), status);
            
            if (result) {
                console.log(`✅ Estado de cotización #${id} actualizado a: ${status}`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error actualizando estado:', error.message);
            throw error;
        }
    }

    // Obtener estadísticas de cotizaciones
    async getQuotationStats() {
        try {
            const stats = await this.db.getStats();
            
            // Validar que las estadísticas tengan la estructura esperada
            const defaultStats = {
                totalQuotations: [{ count: 0 }],
                quotationsByService: [],
                quotationsByStatus: [],
                recentQuotations: []
            };

            return {
                ...defaultStats,
                ...stats
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    // Validar datos de cotización
    validateQuotationData(session) {
        const errors = [];

        // Validar estructura de sesión
        if (!session || !session.data) {
            errors.push('Datos de sesión faltantes');
            return { isValid: false, errors };
        }

        const { data } = session;

        // Validar nombre
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
            errors.push('Nombre debe tener al menos 2 caracteres');
        }

        // Validar email
        if (!data.email || !this.isValidEmail(data.email)) {
            errors.push('Email inválido');
        }

        // Validar empresa
        if (!data.company || typeof data.company !== 'string' || data.company.trim().length < 2) {
            errors.push('Nombre de empresa debe tener al menos 2 caracteres');
        }

        // Validar teléfono
        if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 8) {
            errors.push('Teléfono debe tener al menos 8 caracteres');
        }

        // Validar descripción
        if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
            errors.push('Descripción debe tener al menos 10 caracteres');
        }

        // Validar servicio seleccionado
        if (!session.selectedService || !servicesData.find(s => s.id === session.selectedService)) {
            errors.push('Servicio seleccionado inválido');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validar formato de email
    isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    // Generar resumen de cotización para logs
    generateQuotationSummary(quotation) {
        if (!quotation) {
            return null;
        }

        return {
            id: quotation.id,
            service: quotation.serviceName || quotation.service_name,
            client: quotation.clientName || quotation.client_name,
            email: quotation.email,
            price: quotation.priceUsd || quotation.price_usd,
            status: quotation.status || 'pending',
            created: quotation.created_at
        };
    }

    // Buscar cotizaciones por criterio
    async searchQuotations(criteria = {}) {
        try {
            const allQuotations = await this.db.getAllQuotations();
            
            return allQuotations.filter(quotation => {
                // Filtro por ID de servicio
                if (criteria.serviceId && Number(quotation.service_id) !== Number(criteria.serviceId)) {
                    return false;
                }
                
                // Filtro por estado
                if (criteria.status && quotation.status !== criteria.status) {
                    return false;
                }
                
                // Filtro por email
                if (criteria.email && quotation.email && 
                    !quotation.email.toLowerCase().includes(criteria.email.toLowerCase())) {
                    return false;
                }
                
                // Filtro por nombre de cliente
                if (criteria.clientName && quotation.client_name && 
                    !quotation.client_name.toLowerCase().includes(criteria.clientName.toLowerCase())) {
                    return false;
                }
                
                // Filtro por nombre de empresa
                if (criteria.companyName && quotation.company_name && 
                    !quotation.company_name.toLowerCase().includes(criteria.companyName.toLowerCase())) {
                    return false;
                }
                
                return true;
            });
        } catch (error) {
            console.error('❌ Error buscando cotizaciones:', error.message);
            throw error;
        }
    }

    // Obtener estadísticas por período
    async getQuotationsByPeriod(startDate, endDate) {
        try {
            // Validar fechas
            if (!startDate || !endDate) {
                throw new Error('Fechas de inicio y fin requeridas');
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Fechas inválidas');
            }

            if (start > end) {
                throw new Error('Fecha de inicio debe ser anterior a fecha de fin');
            }

            const allQuotations = await this.db.getAllQuotations();
            
            return allQuotations.filter(quotation => {
                const createdDate = new Date(quotation.created_at);
                return createdDate >= start && createdDate <= end;
            });
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones por período:', error.message);
            throw error;
        }
    }

    // Obtener resumen de cotizaciones recientes
    async getRecentQuotationsSummary(limit = 10) {
        try {
            const allQuotations = await this.db.getAllQuotations();
            
            return allQuotations
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, limit)
                .map(q => this.generateQuotationSummary(q));
        } catch (error) {
            console.error('❌ Error obteniendo resumen de cotizaciones recientes:', error.message);
            throw error;
        }
    }

    // Validar si el servicio está disponible
    isServiceAvailable(serviceId) {
        return servicesData.some(service => service.id === serviceId && service.available !== false);
    }

    // Obtener información del servicio
    getServiceInfo(serviceId) {
        return servicesData.find(service => service.id === serviceId) || null;
    }
}

module.exports = new QuotationService();