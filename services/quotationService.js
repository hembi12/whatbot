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
            const service = servicesData.find(s => s.id === session.selectedService);
            if (!service) {
                throw new Error('Servicio no encontrado');
            }

            const quotationData = {
                phoneNumber: phoneNumber,
                serviceId: session.selectedService,
                serviceName: service.title,
                clientName: session.data.name,
                companyName: session.data.company,
                email: session.data.email,
                phone: session.data.phone,
                description: session.data.description,
                priceUsd: service.priceUSD,
                priceMxn: service.priceMXN,
                estimatedTime: service.estimatedTime
            };

            // Guardar cotización en base de datos
            const savedQuotation = await this.db.saveQuotation(quotationData);
            
            // Guardar métrica
            await this.db.saveMetric(phoneNumber, 'quotation_completed', {
                serviceId: session.selectedService,
                serviceName: service.title
            });

            // Enviar emails de confirmación
            try {
                const emailResults = await emailService.sendQuotationEmails({
                    ...quotationData,
                    id: savedQuotation.id
                });
                
                console.log('📧 Emails procesados:', {
                    client: emailResults.client ? 'Enviado' : 'No enviado',
                    team: emailResults.team ? 'Enviado' : 'No enviado',
                    errors: emailResults.errors
                });
                
                // Guardar métrica de emails
                await this.db.saveMetric(phoneNumber, 'emails_sent', {
                    quotationId: savedQuotation.id,
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

    // Obtener cotización por ID
    async getQuotationById(id) {
        try {
            const quotations = await this.db.getAllQuotations();
            return quotations.find(q => q.id === id);
        } catch (error) {
            console.error('❌ Error obteniendo cotización:', error.message);
            throw error;
        }
    }

    // Obtener cotizaciones de un usuario
    async getUserQuotations(phoneNumber) {
        try {
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
                throw new Error(`Estado inválido: ${status}`);
            }

            return await this.db.updateQuotationStatus(id, status);
        } catch (error) {
            console.error('❌ Error actualizando estado:', error.message);
            throw error;
        }
    }

    // Obtener estadísticas de cotizaciones
    async getQuotationStats() {
        try {
            return await this.db.getStats();
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    // Validar datos de cotización
    validateQuotationData(session) {
        const errors = [];

        if (!session.data.name || session.data.name.trim().length < 2) {
            errors.push('Nombre debe tener al menos 2 caracteres');
        }

        if (!session.data.email || !this.isValidEmail(session.data.email)) {
            errors.push('Email inválido');
        }

        if (!session.data.company || session.data.company.trim().length < 2) {
            errors.push('Nombre de empresa debe tener al menos 2 caracteres');
        }

        if (!session.data.description || session.data.description.trim().length < 10) {
            errors.push('Descripción debe tener al menos 10 caracteres');
        }

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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    // Generar resumen de cotización para logs
    generateQuotationSummary(quotation) {
        return {
            id: quotation.id,
            service: quotation.serviceName,
            client: quotation.clientName,
            email: quotation.email,
            price: quotation.priceUsd,
            status: quotation.status || 'pending',
            created: quotation.created_at
        };
    }

    // Buscar cotizaciones por criterio
    async searchQuotations(criteria) {
        try {
            const allQuotations = await this.db.getAllQuotations();
            
            return allQuotations.filter(quotation => {
                if (criteria.serviceId && quotation.service_id !== criteria.serviceId) {
                    return false;
                }
                
                if (criteria.status && quotation.status !== criteria.status) {
                    return false;
                }
                
                if (criteria.email && !quotation.email.toLowerCase().includes(criteria.email.toLowerCase())) {
                    return false;
                }
                
                if (criteria.clientName && !quotation.client_name.toLowerCase().includes(criteria.clientName.toLowerCase())) {
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
            const allQuotations = await this.db.getAllQuotations();
            
            return allQuotations.filter(quotation => {
                const createdDate = new Date(quotation.created_at);
                return createdDate >= startDate && createdDate <= endDate;
            });
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones por período:', error.message);
            throw error;
        }
    }
}

module.exports = new QuotationService();