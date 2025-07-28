// Servicio para manejo de sesiones de usuario
class SessionService {
    constructor() {
        // Almacenamiento temporal de sesiones (en producción usar Redis o BD)
        this.userSessions = new Map();
    }

    // Obtener sesión de usuario
    getUserSession(phoneNumber) {
        if (!this.userSessions.has(phoneNumber)) {
            this.userSessions.set(phoneNumber, {
                step: 'initial',
                selectedService: null,
                data: {}
            });
        }
        return this.userSessions.get(phoneNumber);
    }

    // Actualizar sesión de usuario
    updateUserSession(phoneNumber, updates) {
        const session = this.getUserSession(phoneNumber);
        Object.assign(session, updates);
        this.userSessions.set(phoneNumber, session);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📝 Sesión actualizada para ${phoneNumber}: ${JSON.stringify(updates)}`);
        }
        return session;
    }

    // Limpiar sesión
    clearUserSession(phoneNumber) {
        this.userSessions.delete(phoneNumber);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🗑️ Sesión limpiada para ${phoneNumber}`);
        }
    }

    // Reiniciar datos de sesión manteniendo el step
    resetSessionData(phoneNumber) {
        const session = this.getUserSession(phoneNumber);
        session.data = {};
        session.selectedService = null;
        this.userSessions.set(phoneNumber, session);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔄 Datos de sesión reiniciados para ${phoneNumber}`);
        }
        return session;
    }

    // Obtener todas las sesiones activas (para debugging)
    getAllActiveSessions() {
        const sessions = {};
        for (const [phone, session] of this.userSessions.entries()) {
            sessions[phone] = {
                step: session.step,
                hasData: Object.keys(session.data).length > 0,
                selectedService: session.selectedService
            };
        }
        return sessions;
    }

    // Limpiar sesiones antiguas (ejecutar periódicamente)
    cleanOldSessions(maxAgeHours = 24) {
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir a milisegundos
        
        let cleaned = 0;
        for (const [phone, session] of this.userSessions.entries()) {
            // Si la sesión no tiene timestamp, asignar uno actual
            if (!session.lastActivity) {
                session.lastActivity = now;
                continue;
            }
            
            // Si es muy antigua, eliminarla
            if (now - session.lastActivity > maxAge) {
                this.userSessions.delete(phone);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Limpiadas ${cleaned} sesiones antiguas`);
        }
        
        return cleaned;
    }

    // Actualizar actividad de sesión
    updateSessionActivity(phoneNumber) {
        const session = this.getUserSession(phoneNumber);
        session.lastActivity = Date.now();
        this.userSessions.set(phoneNumber, session);
    }

    // Estadísticas de sesiones
    getSessionStats() {
        const stats = {
            totalSessions: this.userSessions.size,
            stepCounts: {},
            withData: 0,
            withSelectedService: 0
        };

        for (const session of this.userSessions.values()) {
            // Contar por step
            stats.stepCounts[session.step] = (stats.stepCounts[session.step] || 0) + 1;
            
            // Contar sesiones con datos
            if (Object.keys(session.data).length > 0) {
                stats.withData++;
            }
            
            // Contar sesiones con servicio seleccionado
            if (session.selectedService) {
                stats.withSelectedService++;
            }
        }

        return stats;
    }
}

// Exportar instancia singleton
module.exports = new SessionService();