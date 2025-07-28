const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        // Crear base de datos en la carpeta del proyecto
        const dbPath = path.join(__dirname, 'quotations.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error abriendo base de datos:', err.message);
            } else {
                console.log('✅ Conectado a la base de datos SQLite');
                this.createTables();
            }
        });
    }

    createTables() {
        // Tabla de cotizaciones
        const createQuotationsTable = `
            CREATE TABLE IF NOT EXISTS quotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL,
                service_id INTEGER NOT NULL,
                service_name TEXT NOT NULL,
                client_name TEXT,
                company_name TEXT,
                email TEXT,
                phone TEXT,
                description TEXT,
                price_usd TEXT,
                price_mxn TEXT,
                estimated_time TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Tabla de sesiones de usuario (opcional, para persistir sesiones)
        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS user_sessions (
                phone_number TEXT PRIMARY KEY,
                step TEXT NOT NULL,
                selected_service INTEGER,
                session_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Tabla de métricas (para estadísticas)
        const createMetricsTable = `
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT NOT NULL,
                action TEXT NOT NULL,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createQuotationsTable, (err) => {
            if (err) {
                console.error('Error creando tabla quotations:', err.message);
            } else {
                console.log('✅ Tabla quotations creada/verificada');
            }
        });

        this.db.run(createSessionsTable, (err) => {
            if (err) {
                console.error('Error creando tabla sessions:', err.message);
            } else {
                console.log('✅ Tabla user_sessions creada/verificada');
            }
        });

        this.db.run(createMetricsTable, (err) => {
            if (err) {
                console.error('Error creando tabla metrics:', err.message);
            } else {
                console.log('✅ Tabla metrics creada/verificada');
            }
        });
    }

    // Guardar cotización
    saveQuotation(quotationData) {
        return new Promise((resolve, reject) => {
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                phoneNumber, serviceId, serviceName, clientName,
                companyName, email, phone, description,
                priceUsd, priceMxn, estimatedTime
            ], function(err) {
                if (err) {
                    console.error('Error guardando cotización:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ Cotización guardada con ID: ${this.lastID}`);
                    resolve({ id: this.lastID, ...quotationData });
                }
            });
        });
    }

    // Obtener todas las cotizaciones
    getAllQuotations() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM quotations 
                ORDER BY created_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('Error obteniendo cotizaciones:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Obtener cotizaciones por teléfono
    getQuotationsByPhone(phoneNumber) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM quotations 
                WHERE phone_number = ?
                ORDER BY created_at DESC
            `;

            this.db.all(query, [phoneNumber], (err, rows) => {
                if (err) {
                    console.error('Error obteniendo cotizaciones por teléfono:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Actualizar estado de cotización
    updateQuotationStatus(id, status) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE quotations 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.run(query, [status, id], function(err) {
                if (err) {
                    console.error('Error actualizando estado:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ Estado actualizado para cotización ${id}: ${status}`);
                    resolve({ id, status, changes: this.changes });
                }
            });
        });
    }

    // Guardar métrica/evento
    saveMetric(phoneNumber, action, data = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO metrics (phone_number, action, data)
                VALUES (?, ?, ?)
            `;

            this.db.run(query, [phoneNumber, action, JSON.stringify(data)], function(err) {
                if (err) {
                    console.error('Error guardando métrica:', err.message);
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    // Obtener estadísticas básicas
    getStats() {
        return new Promise((resolve, reject) => {
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

            const results = {};
            let completed = 0;
            const total = Object.keys(queries).length;

            for (const [key, query] of Object.entries(queries)) {
                this.db.all(query, [], (err, rows) => {
                    if (err) {
                        console.error(`Error en consulta ${key}:`, err.message);
                        results[key] = [];
                    } else {
                        results[key] = rows;
                    }
                    
                    completed++;
                    if (completed === total) {
                        resolve(results);
                    }
                });
            }
        });
    }

    // Cerrar conexión
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error cerrando base de datos:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conexión a base de datos cerrada');
                    resolve();
                }
            });
        });
    }
}

module.exports = Database;