import axios, { AxiosResponse } from 'axios';
import {
  Product,
  StockResponse,
  SearchResponse,
  StoreInfo,
  MonitoringSession,
  MonitoringStats,
  MonitoringFormData
} from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
);

export class ApiService {
  // Stock API
  static async getStores(): Promise<StoreInfo> {
    const response = await api.get<StoreInfo>('/stock/stores');
    return response.data;
  }

  static async getStoreCollections(store: string): Promise<{ store: string; collections: string[] }> {
    const response = await api.get<{ store: string; collections: string[] }>(`/stock/stores/${store}/collections`);
    return response.data;
  }

  static async getStock(store: string, collections: string[] = []): Promise<StockResponse> {
    const params = collections.length > 0 ? { collections: collections.join(',') } : {};
    const response = await api.get<StockResponse>(`/stock/stores/${store}`, { params });
    return response.data;
  }

  static async searchProducts(store: string, query: string, collections: string[] = []): Promise<SearchResponse> {
    const params = { 
      q: query, 
      ...(collections.length > 0 ? { collections: collections.join(',') } : {})
    };
    const response = await api.get<SearchResponse>(`/stock/stores/${store}/search`, { params });
    return response.data;
  }

  static async getProductDetails(store: string, sku: string): Promise<{ store: string; sku: string; product: Product; timestamp: Date }> {
    const response = await api.get(`/stock/stores/${store}/products/${sku}`);
    return response.data;
  }

  // Monitoring API
  static async getMonitoringSessions(): Promise<{
    sessions: MonitoringSession[];
    summary: { total: number; active: number; stopped: number };
  }> {
    const response = await api.get('/monitoring/sessions');
    return response.data;
  }

  static async createMonitoringSession(data: MonitoringFormData): Promise<{ 
    success: boolean; 
    session: MonitoringSession 
  }> {
    // Transform form data to API format
    const sessionData = {
      store: data.store,
      products: data.productInputs.map(input => ({
        type: input.type,
        [input.type]: input.value
      })),
      collections: data.collections,
      interval: data.interval,
      notifications: data.notifications
    };

    const response = await api.post('/monitoring/sessions', sessionData);
    return response.data;
  }

  static async getMonitoringSession(sessionId: string): Promise<{ session: MonitoringSession }> {
    const response = await api.get(`/monitoring/sessions/${sessionId}`);
    return response.data;
  }

  static async stopMonitoringSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/monitoring/sessions/${sessionId}/stop`);
    return response.data;
  }

  static async resumeMonitoringSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/monitoring/sessions/${sessionId}/resume`);
    return response.data;
  }

  static async deleteMonitoringSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/monitoring/sessions/${sessionId}`);
    return response.data;
  }

  static async forceCheckSession(sessionId: string): Promise<{
    success: boolean;
    message: string;
    lastCheck: Date;
    checkCount: number;
  }> {
    const response = await api.post(`/monitoring/sessions/${sessionId}/check`);
    return response.data;
  }

  static async getMonitoringStats(): Promise<{ stats: MonitoringStats; timestamp: Date }> {
    const response = await api.get('/monitoring/stats');
    return response.data;
  }

  // Health check
  static async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  }> {
    const response = await api.get('/health');
    return response.data;
  }
}

export default ApiService;
