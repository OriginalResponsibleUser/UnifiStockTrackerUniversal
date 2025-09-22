const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/stock_tracker.db');
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          reject(err);
          return;
        }
        console.log('📊 Connected to SQLite database');
        this.createTables().then(() => {
          this.isInitialized = true;
          resolve();
        }).catch(reject);
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS monitoring_sessions (
          id TEXT PRIMARY KEY,
          store TEXT NOT NULL,
          products TEXT,
          collections TEXT,
          interval_seconds INTEGER DEFAULT 60,
          notifications TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_check DATETIME,
          check_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS stock_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store TEXT NOT NULL,
          product_name TEXT NOT NULL,
          sku TEXT NOT NULL,
          available BOOLEAN NOT NULL,
          price_amount DECIMAL,
          price_currency TEXT,
          category TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_status ON monitoring_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_stock_history_store_sku ON stock_history(store, sku);
        CREATE INDEX IF NOT EXISTS idx_stock_history_timestamp ON stock_history(timestamp);
      `;

      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err.message);
          reject(err);
        } else {
          console.log('✅ Database tables created successfully');
          resolve();
        }
      });
    });
  }

  async saveMonitoringSession(session) {
    if (!this.isInitialized) {
      console.warn('⚠️ Database not initialized, skipping save');
      return;
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO monitoring_sessions 
        (id, store, products, collections, interval_seconds, notifications, status, created_at, last_check, check_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        session.id,
        session.store,
        JSON.stringify(session.products || []),
        JSON.stringify(session.collections || []),
        session.interval || 60,
        JSON.stringify(session.notifications || {}),
        session.status || 'active',
        session.createdAt?.toISOString() || new Date().toISOString(),
        session.lastCheck?.toISOString() || null,
        session.checkCount || 0
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Error saving monitoring session:', err.message);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async saveStockHistory(stockData) {
    if (!this.isInitialized) {
      console.warn('⚠️ Database not initialized, skipping stock history save');
      return;
    }

    if (!stockData || (Array.isArray(stockData) && stockData.length === 0)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO stock_history 
        (store, product_name, sku, available, price_amount, price_currency, category, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = this.db.prepare(sql);
      const records = Array.isArray(stockData) ? stockData : [stockData];
      let completed = 0;
      let hasError = false;

      if (records.length === 0) {
        resolve();
        return;
      }

      for (const record of records) {
        if (!record.sku || !record.name) {
          completed++;
          if (completed === records.length && !hasError) {
            stmt.finalize();
            resolve();
          }
          continue;
        }

        const params = [
          record.store,
          record.name || record.product_name,
          record.sku,
          record.available ? 1 : 0,
          record.price?.amount || null,
          record.price?.currency || null,
          record.category,
          new Date().toISOString()
        ];

        stmt.run(params, (err) => {
          completed++;
          if (err && !hasError) {
            hasError = true;
            console.error('❌ Error saving stock history:', err.message);
            stmt.finalize();
            reject(err);
            return;
          }
          
          if (completed === records.length && !hasError) {
            stmt.finalize();
            resolve();
          }
        });
      }
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
        } else {
          console.log('📊 Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
