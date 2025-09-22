const express = require('express');
const router = express.Router();

// Get all monitoring sessions
router.get('/sessions', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const sessions = Array.from(monitoringService.sessions.values());
    
    res.json({
      sessions: sessions.map(session => ({
        ...session,
        foundProducts: undefined // Don't expose internal data
      })),
      summary: {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        stopped: sessions.filter(s => s.status === 'stopped').length
      }
    });
  } catch (error) {
    console.error('Error getting monitoring sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new monitoring session
router.post('/sessions', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const db = req.app.locals.db;
    
    // Validate request
    const validationErrors = monitoringService.validateMonitoringRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    const session = monitoringService.createSession(req.body);
    
    // Save to database (async)
    if (db) {
      db.saveMonitoringSession(session).catch(err => 
        console.warn('Failed to save monitoring session to database:', err.message)
      );
    }

    res.status(201).json({
      success: true,
      session: {
        ...session,
        foundProducts: undefined
      }
    });
  } catch (error) {
    console.error('Error creating monitoring session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific monitoring session
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const { sessionId } = req.params;
    
    const session = monitoringService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      session: {
        ...session,
        foundProducts: session.foundProducts || []
      }
    });
  } catch (error) {
    console.error('Error getting monitoring session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop a monitoring session
router.post('/sessions/:sessionId/stop', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const { sessionId } = req.params;
    
    const success = monitoringService.stopSession(sessionId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error('Error stopping monitoring session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume a monitoring session
router.post('/sessions/:sessionId/resume', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const { sessionId } = req.params;
    
    const session = monitoringService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'active';

    res.json({ success: true, message: 'Session resumed' });
  } catch (error) {
    console.error('Error resuming monitoring session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a monitoring session
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const { sessionId } = req.params;
    
    const success = monitoringService.removeSession(sessionId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting monitoring session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Force check a monitoring session
router.post('/sessions/:sessionId/check', async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const { sessionId } = req.params;
    
    const session = monitoringService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await monitoringService.checkSession(sessionId);

    res.json({ 
      success: true, 
      message: 'Check completed',
      lastCheck: session.lastCheck,
      checkCount: session.checkCount
    });
  } catch (error) {
    console.error('Error forcing session check:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get monitoring statistics
router.get('/stats', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const stats = monitoringService.getStats();
    
    res.json({
      stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get products being monitored in a session
router.get('/sessions/:sessionId/products', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    const { sessionId } = req.params;
    
    const session = monitoringService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const products = session.foundProducts || [];

    res.json({
      sessionId,
      products: products.map(product => ({
        name: product.name,
        sku: product.sku,
        available: product.available,
        category: product.category,
        price: product.price,
        productUrl: product.productUrl,
        lastChecked: session.lastCheck
      })),
      summary: {
        total: products.length,
        available: products.filter(p => p.available).length,
        unavailable: products.filter(p => !p.available).length
      },
      lastCheck: session.lastCheck,
      nextCheck: session.lastCheck ? 
        new Date(session.lastCheck.getTime() + session.interval * 1000) : null
    });
  } catch (error) {
    console.error('Error getting session products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate monitoring request (dry run)
router.post('/validate', (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService;
    
    const errors = monitoringService.validateMonitoringRequest(req.body);
    
    res.json({
      valid: errors.length === 0,
      errors: errors,
      request: req.body
    });
  } catch (error) {
    console.error('Error validating monitoring request:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
