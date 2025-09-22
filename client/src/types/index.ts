// Product and Stock Types
export interface Product {
  name: string;
  shortName?: string;
  available: boolean;
  category: string;
  collection?: string;
  sku: string;
  skuName?: string;
  earlyAccess?: boolean;
  price?: {
    amount: number;
    currency: string;
  };
  productUrl: string;
  tags?: string[];
  created?: Date;
  updated?: Date;
}

export interface StockResponse {
  store: string;
  collections: string[];
  timestamp: Date;
  products: Product[];
  summary: {
    total: number;
    available: number;
    categories: string[];
  };
}

export interface SearchResponse {
  store: string;
  query: string;
  collections: string[];
  timestamp: Date;
  results: Product[];
  summary: {
    total: number;
    available: number;
  };
}

// Store Types
export interface StoreInfo {
  modern: string[];
  legacy: string[];
}

// Monitoring Types
export interface MonitoringProduct {
  type: 'name' | 'sku';
  name?: string;
  sku?: string;
}

export interface NotificationSettings {
  web: boolean;
  sound: boolean;
}

export interface MonitoringSession {
  id: string;
  store: string;
  products: MonitoringProduct[];
  collections: string[];
  interval: number; // seconds
  notifications: NotificationSettings;
  status: 'active' | 'stopped';
  createdAt: Date;
  lastCheck?: Date;
  checkCount: number;
}

export interface MonitoringStats {
  totalSessions: number;
  activeSessions: number;
  stoppedSessions: number;
  totalChecks: number;
  storeDistribution: Record<string, number>;
}

// Form Types
export interface MonitoringFormData {
  store: string;
  productInputs: Array<{
    type: 'name' | 'sku';
    value: string;
  }>;
  collections: string[];
  interval: number;
  notifications: {
    web: boolean;
    sound: boolean;
  };
}

// Socket Events (simplified)
export interface SocketEvents {
  'product-available': {
    sessionId: string;
    product: Product;
    timestamp: Date;
    notifications: NotificationSettings;
  };
  'availability-alert': {
    sessionId: string;
    count: number;
    products: Array<{ name: string; sku: string; url: string }>;
    timestamp: Date;
  };
  'check-completed': {
    sessionId: string;
    checkCount: number;
    timestamp: Date;
    totalProducts: number;
    availableCount: number;
    newlyAvailable: number;
  };
}
