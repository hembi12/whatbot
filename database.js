const { Pool } = require('pg');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Configuración para PostgreSQL
            const config = {
                connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/whatbot_dev',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            };

            this.db = new Pool(config);

            // Verificar conexión
            const client = await this.db.connect();
            console.log('✅ Conectado a PostgreSQL');
            client.release();
            
            await this.createTables();
            
        } catch (error) {
            console.error('❌ Error conectando a PostgreSQL:', error.message);
            
            // En desarrollo, dar instrucciones para instalar PostgreSQL
            if (process.env.NODE_ENV !== 'production') {
                console.log('\n💡 Para desarrollo local con PostgreSQL:');
                console.log('1. Instala PostgreSQL: brew install postgresql');
                console.log('2. Inicia el servicio: brew services start postgresql');
                console.log('3. Crea la base de datos: createdb whatbot_dev');
                console.log('4. O usa: DATABASE_URL=postgresql://localhost:5432/whatbot_dev\n');
            }
            
            throw error;
        }
    }

    async createTables() {
        try {
            // Tabla de cotizaciones
            const createQuotationsTable = `
                CREATE TABLE IF NOT EXISTS quotations (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(50) NOT NULL,
                    service_id INTEGER NOT NULL,
                    service_name VARCHAR(255) NOT NULL,
                    client_name VARCHAR(255),
                    company_name VARCHAR(255),
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    description TEXT,
                    price_usd VARCHAR(50),
                    price_mxn VARCHAR(50),
                    estimated_time VARCHAR(100),
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Tabla de sesiones de usuario
            const createSessionsTable = `
                CREATE TABLE IF NOT EXISTS user_sessions (
                    phone_number VARCHAR(50) PRIMARY KEY,
                    step VARCHAR(100) NOT NULL,
                    selected_service INTEGER,
                    session_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Tabla de métricas
            const createMetricsTable = `
                CREATE TABLE IF NOT EXISTS metrics (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(50) NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Crear índices para mejor performance
            const createIndexes = [
                `CREATE INDEX IF NOT EXISTS idx_quotations_phone ON quotations(phone_number)`,
                `CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)`,
                `CREATE INDEX IF NOT EXISTS idx_metrics_phone ON metrics(phone_number)`,
                `CREATE INDEX IF NOT EXISTS idx_metrics_action ON metrics(action)`
            ];

            // Ejecutar todas las consultas
            await this.db.query(createQuotationsTable);
            await this.db.query(createSessionsTable);
            await this.db.query(createMetricsTable);
            
            // Crear índices
            for (const indexQuery of createIndexes) {
                await this.db.query(indexQuery);
            }
            
            console.log('✅ Tablas e índices PostgreSQL creados/verificados');
            
        } catch (error) {
            console.error('❌ Error creando tablas:', error.message);
            throw error;
        }
    }

    // Guardar cotización
    async saveQuotation(quotationData) {
        const {
            phoneNumber, serviceId, serviceName, clientName, 
            companyName, email, phone, description, 
            priceUsd, priceMxn, estimatedTime
        } = quotationData;

        const query = `
            INSERT INTO quotations (
                phone_number, service_id, service_name, client_name,
                company_name, email, phone, description,
                price_usd, price_mxn, estimated_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `;

        const params = [
            phoneNumber, serviceId, serviceName, clientName,
            companyName, email, phone, description,
            priceUsd, priceMxn, estimatedTime
        ];

        try {
            const result = await this.db.query(query, params);
            const id = result.rows[0].id;
            
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ Cotización guardada con ID: ${id}`);
            }
            
            return { id, ...quotationData };
        } catch (error) {
            console.error('❌ Error guardando cotización:', error.message);
            throw error;
        }
    }

    // Obtener todas las cotizaciones
    async getAllQuotations() {
        const query = `SELECT * FROM quotations ORDER BY created_at DESC`;

        try {
            const result = await this.db.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones:', error.message);
            throw error;
        }
    }

    // Obtener cotizaciones por teléfono
    async getQuotationsByPhone(phoneNumber) {
        const query = `SELECT * FROM quotations WHERE phone_number = $1 ORDER BY created_at DESC`;

        try {
            const result = await this.db.query(query, [phoneNumber]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones por teléfono:', error.message);
            throw error;
        }
    }

    // Actualizar estado de cotización
    async updateQuotationStatus(id, status) {
        const query = `
            UPDATE quotations 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING id
        `;

        try {
            const result = await this.db.query(query, [status, id]);
            
            if (result.rows.length === 0) {
                throw new Error(`Cotización con ID ${id} no encontrada`);
            }
            
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ Estado actualizado para cotización ${id}: ${status}`);
            }
            
            return { id, status, changes: result.rowCount };
        } catch (error) {
            console.error('❌ Error actualizando estado:', error.message);
            throw error;
        }
    }

    // Guardar métrica/evento
    async saveMetric(phoneNumber, action, data = null) {
        const query = `
            INSERT INTO metrics (phone_number, action, data) 
            VALUES ($1, $2, $3) 
            RETURNING id
        `;

        const params = [phoneNumber, action, JSON.stringify(data)];

        try {
            const result = await this.db.query(query, params);
            return { id: result.rows[0].id };
        } catch (error) {
            console.error('❌ Error guardando métrica:', error.message);
            throw error;
        }
    }

    // Obtener estadísticas básicas
    async getStats() {
        const queries = {
            totalQuotations: "SELECT COUNT(*) as count FROM quotations",
            quotationsByService: `
                SELECT service_name, COUNT(*) as count 
                FROM quotations 
                GROUP BY service_name 
                ORDER BY count DESC
            `,
            quotationsByStatus: `
                SELECT status, COUNT(*) as count 
                FROM quotations 
                GROUP BY status
            `,
            recentQuotations: `
                SELECT * FROM quotations 
                ORDER BY created_at DESC 
                LIMIT 5
            `
        };

        try {
            const results = {};
            
            for (const [key, query] of Object.entries(queries)) {
                const result = await this.db.query(query);
                results[key] = result.rows;
            }
            
            return results;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    // Buscar cotizaciones (funcionalidad extra)
    async searchQuotations(criteria) {
        let query = `SELECT * FROM quotations WHERE 1=1`;
        const params = [];
        let paramCount = 0;

        if (criteria.serviceId) {
            paramCount++;
            query += ` AND service_id = $${paramCount}`;
            params.push(criteria.serviceId);
        }

        if (criteria.status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(criteria.status);
        }

        if (criteria.email) {
            paramCount++;
            query += ` AND email ILIKE $${paramCount}`;
            params.push(`%${criteria.email}%`);
        }

        if (criteria.clientName) {
            paramCount++;
            query += ` AND client_name ILIKE $${paramCount}`;
            params.push(`%${criteria.clientName}%`);
        }

        query += ` ORDER BY created_at DESC`;

        try {
            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Error buscando cotizaciones:', error.message);
            throw error;
        }
    }

    // Obtener cotizaciones por período
    async getQuotationsByPeriod(startDate, endDate) {
        const query = `
            SELECT * FROM quotations 
            WHERE created_at BETWEEN $1 AND $2 
            ORDER BY created_at DESC
        `;

        try {
            const result = await this.db.query(query, [startDate, endDate]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo cotizaciones por período:', error.message);
            throw error;
        }
    }

    // Obtener métricas por período
    async getMetricsByPeriod(startDate, endDate) {
        const query = `
            SELECT action, COUNT(*) as count 
            FROM metrics 
            WHERE created_at BETWEEN $1 AND $2 
            GROUP BY action 
            ORDER BY count DESC
        `;

        try {
            const result = await this.db.query(query, [startDate, endDate]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo métricas por período:', error.message);
            throw error;
        }
    }

    // Cerrar conexión
    async close() {
        try {
            await this.db.end();
            console.log('✅ Conexión PostgreSQL cerrada');
        } catch (error) {
            console.error('❌ Error cerrando conexión:', error.message);
            throw error;
        }
    }

    // Health check para monitoreo
    async healthCheck() {
        try {
            await this.db.query('SELECT 1');
            return { status: 'healthy', database: 'postgresql' };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

module.exports = Database;