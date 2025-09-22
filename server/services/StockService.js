const axios = require('axios');

class StockService {
  constructor() {
    // Modern stores (GraphQL API)
    this.modernStores = {
      'USA': 'us',
      'Europe': 'eu',
      'UK': 'uk'
    };

    this.modernStoreLinks = {
      'USA': 'https://store.ui.com/us/en',
      'Europe': 'https://eu.store.ui.com/eu/en',
      'UK': 'https://uk.store.ui.com/uk/en'
    };

    // Legacy stores (JSON API)
    this.legacyStores = {
      'Brazil': 'https://br.store.ui.com',
      'India': 'https://store-ui.in',
      'Japan': 'https://jp.store.ui.com',
      'Taiwan': 'https://tw.store.ui.com',
      'Singapore': 'https://sg.store.ui.com',
      'Mexico': 'https://mx.store.ui.com',
      'China': 'https://store.ui.com.cn'
    };

    // Legacy collections mapping
    this.legacyCollections = {
      'Protect': 'unifi-protect',
      'ProtectNVR': 'unifi-protect-nvr',
      'ProtectAccessories': 'unifi-protect-accessories',
      'NetworkOS': 'unifi-network-unifi-os-consoles',
      'NetworkRoutingSwitching': 'unifi-network-routing-switching',
      'NetworkSmartPower': 'unifi-network-smartpower',
      'NetworkHost': 'unifi-network-host',
      'NetworkSwitching': 'unifi-network-switching',
      'NetworkWifi': 'unifi-network-wireless',
      'UnifiAccessories': 'unifi-accessories',
      'EarlyAccess': 'early-access',
      'UnifiConnect': 'unifi-connect',
      'UnifiDoorAccess': 'unifi-door-access',
      'UnifiPhoneSystem': 'unifi-phone-system'
    };

    // Modern API category mappings (subset of most common ones)
    this.categoryMappings = {
      'unifi-dream-machine': 'DreamMachine',
      'unifi-dream-router': 'DreamRouter',
      'unifi-switching-enterprise-aggregation': 'SwitchingEnterpriseAggregation',
      'unifi-switching-pro-ethernet': 'SwitchingProEthernet',
      'unifi-switching-standard-ethernet': 'SwitchingStandardEthernet',
      'unifi-wifi-flagship-compact': 'WiFiFlagshipCompact',
      'unifi-wifi-flagship-high-capacity': 'WiFiFlagshipHighCapacity',
      'unifi-camera-security-bullet-high-performance': 'CameraSecurityBulletHighPerformance',
      'unifi-camera-security-compact-poe-wired': 'CameraSecurityCompactPoEWired',
      'unifi-camera-security-dome-360': 'CameraSecurityDome360',
      'unifi-accessory-tech-hosting-and-gateways-cloud': 'HostingAndGatewaysCloud'
    };

    // Axios instance with timeout and error handling
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'UniFi-Stock-Tracker-Web/1.0.0'
      }
    });
  }

  /**
   * Get stock for modern API stores (USA, Europe, UK)
   */
  async getModernStock(store, collections = []) {
    const storeId = this.modernStores[store];
    if (!storeId) {
      throw new Error(`Invalid modern store: ${store}`);
    }

    const storeLink = this.modernStoreLinks[store];
    const products = [];
    let offset = 0;
    const limit = 100; // Reduced for better reliability
    let total = 1;

    try {
      while (offset < total) {
        const graphqlQuery = {
          operationName: "GetProductsForLandingPagePro",
          variables: {
            input: {
              limit: limit,
              offset: offset,
              filter: {
                storeId: storeId,
                language: "en",
                line: "Unifi"
              }
            }
          },
          query: `
            query GetProductsForLandingPagePro($input: StorefrontProductListInput!) {
              storefrontProducts(input: $input) {
                pagination {
                  limit
                  offset
                  total
                }
                items {
                  id
                  title
                  shortTitle
                  name
                  slug
                  collectionSlug
                  organizationalCollectionSlug
                  variants {
                    id
                    sku
                    status
                    title
                    isEarlyAccess
                    displayPrice {
                      amount
                      currency
                    }
                  }
                }
              }
            }
          `
        };

        const response = await this.axiosInstance.post('https://ecomm.svc.ui.com/graphql', graphqlQuery, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.data || !response.data.data) {
          throw new Error('Invalid GraphQL response');
        }

        const data = response.data.data.storefrontProducts;
        const currentProducts = data.items || [];
        
        // Process products
        for (const product of currentProducts) {
          for (const variant of product.variants || []) {
            const category = this.categoryMappings[product.collectionSlug] || 
                           this.categoryMappings[product.organizationalCollectionSlug] || 
                           'Unknown';

            // Filter by collections if specified
            if (collections.length > 0 && !collections.includes(category)) {
              continue;
            }

            products.push({
              name: product.title,
              shortName: product.shortTitle,
              available: variant.status === 'AVAILABLE',
              category: category,
              collection: product.collectionSlug,
              sku: variant.sku,
              skuName: variant.title,
              earlyAccess: variant.isEarlyAccess || false,
              price: variant.displayPrice ? {
                amount: parseFloat(variant.displayPrice.amount),
                currency: variant.displayPrice.currency
              } : null,
              productUrl: `${storeLink}/collections/${product.collectionSlug}/products/${product.slug}`,
              tags: []
            });
          }
        }

        total = data.pagination ? data.pagination.total : 0;
        offset += limit;

        // Safety break to prevent infinite loops
        if (offset > 10000) break;
      }

      return products;
    } catch (error) {
      console.error(`Error fetching modern stock for ${store}:`, error.message);
      throw new Error(`Failed to fetch stock for ${store}: ${error.message}`);
    }
  }

  /**
   * Get stock for legacy API stores
   */
  async getLegacyStock(store, collections = []) {
    const storeUrl = this.legacyStores[store];
    if (!storeUrl) {
      throw new Error(`Invalid legacy store: ${store}`);
    }

    const collectionsToCheck = collections.length > 0 ? 
      collections : Object.keys(this.legacyCollections);

    const products = [];

    try {
      for (const category of collectionsToCheck) {
        const collectionSlug = this.legacyCollections[category];
        if (!collectionSlug) continue;

        const url = `${storeUrl}/collections/${collectionSlug}/products.json`;
        
        try {
          const response = await this.axiosInstance.get(url);
          const data = response.data;

          for (const product of data.products || []) {
            for (const variant of product.variants || []) {
              products.push({
                name: product.title,
                available: variant.available === true,
                category: category,
                price: variant.price ? {
                  amount: parseFloat(variant.price) / 100,
                  currency: 'USD'
                } : null,
                sku: variant.sku,
                skuName: variant.title,
                created: variant.created_at ? new Date(variant.created_at) : null,
                updated: variant.updated_at ? new Date(variant.updated_at) : null,
                productUrl: `${storeUrl}/collections/${collectionSlug}/products/${product.handle}`,
                tags: product.tags ? product.tags.split(', ') : []
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch collection ${category} for ${store}:`, error.message);
          // Continue with other collections
        }
      }

      return products;
    } catch (error) {
      console.error(`Error fetching legacy stock for ${store}:`, error.message);
      throw new Error(`Failed to fetch legacy stock for ${store}: ${error.message}`);
    }
  }

  /**
   * Get stock for any store (automatically determines modern vs legacy)
   */
  async getStock(store, collections = []) {
    if (this.modernStores[store]) {
      return await this.getModernStock(store, collections);
    } else if (this.legacyStores[store]) {
      return await this.getLegacyStock(store, collections);
    } else {
      throw new Error(`Unknown store: ${store}`);
    }
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(store, query, collections = []) {
    const allProducts = await this.getStock(store, collections);
    const searchQuery = query.toLowerCase();

    return allProducts.filter(product => 
      product.name.toLowerCase().includes(searchQuery) ||
      product.sku.toLowerCase().includes(searchQuery) ||
      (product.skuName && product.skuName.toLowerCase().includes(searchQuery))
    );
  }

  /**
   * Get available stores
   */
  getAvailableStores() {
    return {
      modern: Object.keys(this.modernStores),
      legacy: Object.keys(this.legacyStores)
    };
  }

  /**
   * Get available collections for a store
   */
  getAvailableCollections(store) {
    if (this.modernStores[store]) {
      return Object.values(this.categoryMappings).sort();
    } else if (this.legacyStores[store]) {
      return Object.keys(this.legacyCollections).sort();
    } else {
      return [];
    }
  }
}

module.exports = StockService;
