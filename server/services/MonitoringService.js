const StockService = require('./StockService');

class MonitoringService {
  constructor(io) {
    this.io = io;
    this.stockService = new StockService();
    this.sessions = new Map();
    this.activeChecks = new Set();
  }

  /**
   * Create a new monitoring session
   */
  createSession(sessionData) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      store: sessionData.store,
      products: sessionData.products || [],
      collections: sessionData.collections || [],
      interval: Math.max(sessionData.interval || 60, 10),
      notifications: {
        web: sessionData.notifications?.web !== false,
        sound: sessionData.notifications?.sound !== false
      },
      status: 'active',
      createdAt: new Date(),
      lastCheck: null,
      foundProducts: [],
      checkCount: 0
    };

    this.sessions.set(sessionId, session);
    
    // Emit session created event
    this.io.to(`monitoring-${sessionId}`).emit('session-created', {
      sessionId,
      session: this.sanitizeSession(session)
    });

    console.log(`✅ Created monitoring session ${sessionId} for store ${session.store}`);
    return session;
  }

  /**
   * Stop a monitoring session
   */
  stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
      this.io.to(`monitoring-${sessionId}`).emit('session-stopped', {
        sessionId,
        reason: 'User requested'
      });
      console.log(`⏹️ Stopped monitoring session ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Remove a monitoring session
   */
  removeSession(sessionId) {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      this.io.to(`monitoring-${sessionId}`).emit('session-removed', { sessionId });
      console.log(`🗑️ Removed monitoring session ${sessionId}`);
    }
    return removed;
  }

  /**
   * Get session details
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(session => session.status === 'active');
  }

  /**
   * Check all active monitoring sessions
   */
  async checkAllMonitoringSessions() {
    const activeSessions = this.getActiveSessions();
    
    for (const session of activeSessions) {
      if (this.activeChecks.has(session.id)) {
        continue;
      }

      const now = new Date();
      const lastCheck = session.lastCheck;
      const intervalMs = session.interval * 1000;

      if (lastCheck && (now - lastCheck) < intervalMs) {
        continue;
      }

      this.activeChecks.add(session.id);
      
      try {
        await this.checkSession(session.id);
      } catch (error) {
        console.error(`❌ Error checking session ${session.id}:`, error.message);
        this.io.to(`monitoring-${session.id}`).emit('check-error', {
          sessionId: session.id,
          error: error.message
        });
      } finally {
        this.activeChecks.delete(session.id);
      }
    }
  }

  /**
   * Check a specific monitoring session
   */
  async checkSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }

    console.log(`🔍 Checking session ${sessionId} for store ${session.store}`);

    try {
      const allStock = await this.stockService.getStock(session.store, session.collections);
      const monitoredProducts = this.filterMonitoredProducts(allStock, session.products);
      
      const newlyAvailable = monitoredProducts.filter(product => {
        const wasAvailable = session.foundProducts.some(fp => 
          fp.sku === product.sku && fp.available
        );
        return product.available && !wasAvailable;
      });

      session.lastCheck = new Date();
      session.checkCount += 1;
      session.foundProducts = monitoredProducts;

      this.io.to(`monitoring-${sessionId}`).emit('check-completed', {
        sessionId,
        checkCount: session.checkCount,
        timestamp: session.lastCheck,
        totalProducts: monitoredProducts.length,
        availableCount: monitoredProducts.filter(p => p.available).length,
        newlyAvailable: newlyAvailable.length
      });

      if (newlyAvailable.length > 0) {
        await this.handleNewlyAvailableProducts(sessionId, newlyAvailable);
      }

      this.io.to(`monitoring-${sessionId}`).emit('stock-update', {
        sessionId,
        products: monitoredProducts,
        timestamp: session.lastCheck
      });

    } catch (error) {
      console.error(`❌ Error checking session ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Filter products based on monitoring criteria
   */
  filterMonitoredProducts(allStock, monitoringProducts) {
    if (monitoringProducts.length === 0) {
      return allStock;
    }

    const filtered = [];

    for (const monitoringProduct of monitoringProducts) {
      if (monitoringProduct.type === 'sku' && monitoringProduct.sku) {
        const product = allStock.find(p => p.sku === monitoringProduct.sku);
        if (product) {
          filtered.push(product);
        }
      } else if (monitoringProduct.type === 'name' && monitoringProduct.name) {
        const products = allStock.filter(p => 
          p.name.toLowerCase().includes(monitoringProduct.name.toLowerCase())
        );
        filtered.push(...products);
      }
    }

    return this.removeDuplicateProducts(filtered);
  }

  /**
   * Remove duplicate products based on SKU
   */
  removeDuplicateProducts(products) {
    return products.filter((product, index, self) =>
      index === self.findIndex(p => p.sku === product.sku)
    );
  }

  /**
   * Handle newly available products
   */
  async handleNewlyAvailableProducts(sessionId, products) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🎉 Found ${products.length} newly available products for session ${sessionId}`);

    for (const product of products) {
      this.io.to(`monitoring-${sessionId}`).emit('product-available', {
        sessionId,
        product,
        timestamp: new Date(),
        notifications: session.notifications
      });

      console.log(`📦 Product available in ${session.store}: ${product.name} (${product.sku})`);
    }

    this.io.to(`monitoring-${sessionId}`).emit('availability-alert', {
      sessionId,
      count: products.length,
      products: products.map(p => ({ 
        name: p.name, 
        sku: p.sku, 
        url: p.productUrl 
      })),
      timestamp: new Date()
    });
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      stoppedSessions: sessions.filter(s => s.status === 'stopped').length,
      totalChecks: sessions.reduce((sum, s) => sum + s.checkCount, 0),
      storeDistribution: sessions.reduce((dist, session) => {
        dist[session.store] = (dist[session.store] || 0) + 1;
        return dist;
      }, {})
    };
  }

  /**
   * Validate monitoring request
   */
  validateMonitoringRequest(data) {
    const errors = [];

    if (!data.store) {
      errors.push('Store is required');
    } else {
      const availableStores = this.stockService.getAvailableStores();
      const allStores = [...availableStores.modern, ...availableStores.legacy];
      if (!allStores.includes(data.store)) {
        errors.push(`Invalid store. Available stores: ${allStores.join(', ')}`);
      }
    }

    if (data.products && !Array.isArray(data.products)) {
      errors.push('Products must be an array');
    }

    if (data.collections && !Array.isArray(data.collections)) {
      errors.push('Collections must be an array');
    }

    if (data.interval && (typeof data.interval !== 'number' || data.interval < 10)) {
      errors.push('Interval must be a number >= 10 seconds');
    }

    return errors;
  }

  /**
   * Sanitize session data for client
   */
  sanitizeSession(session) {
    const sanitized = { ...session };
    delete sanitized.foundProducts;
    return sanitized;
  }
}

module.exports = MonitoringService;
