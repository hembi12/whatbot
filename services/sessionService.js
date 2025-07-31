// Servicio para manejo de sesiones de usuario
class SessionService {
    constructor() {
        // Almacenamiento temporal de sesiones (en producción usar Redis o BD)
        this.userSessions = new Map();
        
        // Configuración por defecto
        this.defaultSession = {
            step: 'initial',
            selectedService: null,
            data: {},
            lastActivity: null,
            createdAt: null
        };
    }

    // Obtener sesión de usuario
    getUserSession(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            throw new Error('Número de teléfono requerido');
        }

        if (!this.userSessions.has(phoneNumber)) {
            const newSession = {
                ...this.defaultSession,
                lastActivity: Date.now(),
                createdAt: Date.now(),
                data: {} // Crear nueva instancia del objeto
            };
            
            this.userSessions.set(phoneNumber, newSession);
            
            if (process.env.NODE_ENV !== 'production') {
                console.log(`🆕 Nueva sesión creada para ${phoneNumber}`);
            }
        }
        
        return this.userSessions.get(phoneNumber);
    }

    // Actualizar sesión de usuario
    updateUserSession(phoneNumber, updates) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            throw new Error('Número de teléfono requerido');
        }

        if (!updates || typeof updates !== 'object') {
            throw new Error('Actualizaciones requeridas');
        }

        const session = this.getUserSession(phoneNumber);
        
        // Mantener referencia del objeto data si no se está actualizando
        if (updates.data) {
            session.data = { ...session.data, ...updates.data };
            delete updates.data; // No sobreescribir todo el objeto data
        }
        
        // Aplicar otras actualizaciones
        Object.assign(session, updates);
        
        // Actualizar actividad
        session.lastActivity = Date.now();
        
        this.userSessions.set(phoneNumber, session);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📝 Sesión actualizada para ${phoneNumber}: ${JSON.stringify(updates)}`);
        }
        
        return session;
    }

    // Limpiar sesión
    clearUserSession(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            throw new Error('Número de teléfono requerido');
        }

        const existed = this.userSessions.delete(phoneNumber);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🗑️ Sesión ${existed ? 'limpiada' : 'no encontrada'} para ${phoneNumber}`);
        }
        
        return existed;
    }

    // Reiniciar datos de sesión manteniendo el step
    resetSessionData(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            throw new Error('Número de teléfono requerido');
        }

        const session = this.getUserSession(phoneNumber);
        session.data = {};
        session.selectedService = null;
        session.lastActivity = Date.now();
        
        this.userSessions.set(phoneNumber, session);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔄 Datos de sesión reiniciados para ${phoneNumber}`);
        }
        
        return session;
    }

    // Obtener todas las sesiones activas (para debugging y panel admin)
    getAllActiveSessions() {
        const sessions = {};
        
        for (const [phone, session] of this.userSessions.entries()) {
            sessions[phone] = {
                step: session.step,
                hasData: Object.keys(session.data || {}).length > 0,
                selectedService: session.selectedService,
                lastActivity: session.lastActivity,
                createdAt: session.createdAt,
                sessionAge: session.createdAt ? Date.now() - session.createdAt : 0
            };
        }
        
        return sessions;
    }

    // Limpiar sesiones antiguas (ejecutar periódicamente)
    cleanOldSessions(maxAgeHours = 24) {
        if (!Number.isInteger(maxAgeHours) || maxAgeHours <= 0) {
            throw new Error('maxAgeHours debe ser un número entero positivo');
        }

        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir a milisegundos
        
        let cleaned = 0;
        let updated = 0;
        
        for (const [phone, session] of this.userSessions.entries()) {
            // Si la sesión no tiene timestamp, asignar uno actual
            if (!session.lastActivity) {
                session.lastActivity = now;
                session.createdAt = session.createdAt || now;
                updated++;
                continue;
            }
            
            // Si es muy antigua, eliminarla
            if (now - session.lastActivity > maxAge) {
                this.userSessions.delete(phone);
                cleaned++;
            }
        }
        
        const totalActions = cleaned + updated;
        if (totalActions > 0) {
            console.log(`🧹 Limpieza de sesiones: ${cleaned} eliminadas, ${updated} actualizadas`);
        }
        
        return { cleaned, updated };
    }

    // Actualizar actividad de sesión
    updateSessionActivity(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return false;
        }

        try {
            const session = this.getUserSession(phoneNumber);
            session.lastActivity = Date.now();
            this.userSessions.set(phoneNumber, session);
            return true;
        } catch (error) {
            console.error('❌ Error actualizando actividad de sesión:', error.message);
            return false;
        }
    }

    // Estadísticas de sesiones
    getSessionStats() {
        const stats = {
            totalSessions: this.userSessions.size,
            stepCounts: {},
            withData: 0,
            withSelectedService: 0,
            averageSessionAge: 0,
            oldestSession: null,
            newestSession: null
        };

        let totalAge = 0;
        let oldestTime = Infinity;
        let newestTime = 0;
        const now = Date.now();

        for (const [phone, session] of this.userSessions.entries()) {
            // Contar por step
            stats.stepCounts[session.step] = (stats.stepCounts[session.step] || 0) + 1;
            
            // Contar sesiones con datos
            if (session.data && Object.keys(session.data).length > 0) {
                stats.withData++;
            }
            
            // Contar sesiones con servicio seleccionado
            if (session.selectedService) {
                stats.withSelectedService++;
            }

            // Calcular edades de sesiones
            if (session.createdAt) {
                const age = now - session.createdAt;
                totalAge += age;
                
                if (session.createdAt < oldestTime) {
                    oldestTime = session.createdAt;
                    stats.oldestSession = phone;
                }
                
                if (session.createdAt > newestTime) {
                    newestTime = session.createdAt;
                    stats.newestSession = phone;
                }
            }
        }

        // Calcular edad promedio
        if (stats.totalSessions > 0) {
            stats.averageSessionAge = totalAge / stats.totalSessions;
        }

        return stats;
    }

    // Verificar si una sesión existe
    hasSession(phoneNumber) {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            return false;
        }
        return this.userSessions.has(phoneNumber);
    }

    // Obtener información de una sesión específica
    getSessionInfo(phoneNumber) {
        if (!this.hasSession(phoneNumber)) {
            return null;
        }

        const session = this.userSessions.get(phoneNumber);
        const now = Date.now();
        
        return {
            step: session.step,
            selectedService: session.selectedService,
            hasData: Object.keys(session.data || {}).length > 0,
            dataKeys: Object.keys(session.data || {}),
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            sessionAge: session.createdAt ? now - session.createdAt : 0,
            inactiveTime: session.lastActivity ? now - session.lastActivity : 0
        };
    }

    // Obtener sesiones por paso específico
    getSessionsByStep(step) {
        const sessions = [];
        
        for (const [phone, session] of this.userSessions.entries()) {
            if (session.step === step) {
                sessions.push({
                    phone,
                    ...this.getSessionInfo(phone)
                });
            }
        }
        
        return sessions;
    }

    // Método para debugging y monitoreo
    getDebugInfo() {
        return {
            totalSessions: this.userSessions.size,
            memoryUsage: process.memoryUsage(),
            stats: this.getSessionStats(),
            sessions: this.getAllActiveSessions()
        };
    }
}

// Exportar instancia singleton
module.exports = new SessionService();