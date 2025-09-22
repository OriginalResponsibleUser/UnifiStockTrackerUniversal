const express = require('express');
const router = express.Router();

// Get available stores
router.get('/stores', (req, res) => {
  try {
    const stockService = req.app.locals.stockService;
    const stores = stockService.getAvailableStores();
    res.json(stores);
  } catch (error) {
    console.error('Error getting stores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available collections for a store
router.get('/stores/:store/collections', (req, res) => {
  try {
    const stockService = req.app.locals.stockService;
    const { store } = req.params;
    const collections = stockService.getAvailableCollections(store);
    res.json({ store, collections });
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock for a specific store
router.get('/stores/:store', async (req, res) => {
  try {
    const stockService = req.app.locals.stockService;
    const db = req.app.locals.db;
    const { store } = req.params;
    const { collections } = req.query;

    let collectionsArray = [];
    if (collections) {
      collectionsArray = Array.isArray(collections) ? collections : collections.split(',');
    }

    console.log(`📊 Fetching stock for ${store} with collections:`, collectionsArray);

    const stock = await stockService.getStock(store, collectionsArray);
    
    // Save stock history (async, don't wait)
    if (stock.length > 0 && db) {
      db.saveStockHistory(stock.map(product => ({ ...product, store })))
        .catch(err => console.warn('Failed to save stock history:', err.message));
    }

    const response = {
      store,
      collections: collectionsArray,
      timestamp: new Date(),
      products: stock,
      summary: {
        total: stock.length,
        available: stock.filter(p => p.available).length,
        categories: [...new Set(stock.map(p => p.category))].sort()
      }
    };

    console.log(`✅ Retrieved ${stock.length} products for ${store}`);
    res.json(response);
  } catch (error) {
    console.error('Error getting stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search products
router.get('/stores/:store/search', async (req, res) => {
  try {
    const stockService = req.app.locals.stockService;
    const { store } = req.params;
    const { q: query, collections } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    let collectionsArray = [];
    if (collections) {
      collectionsArray = Array.isArray(collections) ? collections : collections.split(',');
    }

    console.log(`🔍 Searching for "${query}" in ${store}`);

    const results = await stockService.searchProducts(store, query, collectionsArray);

    const response = {
      store,
      query,
      collections: collectionsArray,
      timestamp: new Date(),
      results: results,
      summary: {
        total: results.length,
        available: results.filter(p => p.available).length
      }
    };

    console.log(`✅ Found ${results.length} products matching "${query}" in ${store}`);
    res.json(response);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific product details
router.get('/stores/:store/products/:sku', async (req, res) => {
  try {
    const stockService = req.app.locals.stockService;
    const { store, sku } = req.params;

    const allStock = await stockService.getStock(store);
    const product = allStock.find(p => p.sku === sku);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      store,
      sku,
      product,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting product details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk check products
router.post('/check', async (req, res) => {
  try {
    const stockService = req.app.locals.stockService;
    const { requests } = req.body;

    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'Requests must be an array' });
    }

    console.log(`🔄 Processing ${requests.length} bulk check requests`);

    const results = [];

    for (const request of requests) {
      try {
        let products = [];
        
        if (request.sku) {
          const allStock = await stockService.getStock(request.store, request.collections);
          const product = allStock.find(p => p.sku === request.sku);
          if (product) products.push(product);
        } else if (request.name) {
          products = await stockService.searchProducts(request.store, request.name, request.collections);
        } else {
          products = await stockService.getStock(request.store, request.collections);
        }

        results.push({
          request,
          success: true,
          products,
          summary: {
            total: products.length,
            available: products.filter(p => p.available).length
          }
        });
      } catch (error) {
        results.push({
          request,
          success: false,
          error: error.message,
          products: []
        });
      }
    }

    const response = {
      timestamp: new Date(),
      results,
      summary: {
        totalRequests: requests.length,
        successfulRequests: results.filter(r => r.success).length,
        totalProducts: results.reduce((sum, r) => sum + r.products.length, 0),
        totalAvailable: results.reduce((sum, r) => sum + r.products.filter(p => p.available).length, 0)
      }
    };

    console.log(`✅ Completed bulk check: ${response.summary.successfulRequests}/${requests.length} successful`);
    res.json(response);
  } catch (error) {
    console.error('Error in bulk check:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
