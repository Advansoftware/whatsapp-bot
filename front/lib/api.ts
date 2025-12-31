const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('accessToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      // Don't redirect if it's a login attempt, so we can show the error
      if (!endpoint.includes('/auth/login')) {
        window.location.href = '/';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async loginWithGoogle(idToken: string) {
    const response = await this.request<{ accessToken: string; user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    this.setToken(response.accessToken);
    return response;
  }

  async login(data: any) {
    const response = await this.request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.accessToken);
    return response;
  }

  async register(data: any) {
    const response = await this.request<{ accessToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.accessToken);
    return response;
  }

  async getProfile() {
    return this.request<any>('/auth/me');
  }

  async verifyToken() {
    return this.request<{ valid: boolean; user: any }>('/auth/verify');
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request<{
      totalMessages: number;
      todayMessages: number;
      messageGrowth: string;
      activeLeads: number;
      activeInstances: number;
      balance: number;
      apiStatus: string;
      uptime: string;
    }>('/api/dashboard/stats');
  }

  async getDashboardActivity() {
    return this.request<Array<{
      name: string;
      incoming: number;
      outgoing: number;
    }>>('/api/dashboard/activity');
  }

  // Connections endpoints
  async getConnections() {
    return this.request<Array<{
      id: string;
      name: string;
      instanceKey: string;
      status: string;
      createdAt: string;
    }>>('/api/connections');
  }

  async createConnection(name: string) {
    return this.request<{
      id: string;
      name: string;
      instanceKey: string;
      status: string;
      qrCodeUrl: string;
    }>('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteConnection(id: string) {
    return this.request<void>(`/api/connections/${id}`, {
      method: 'DELETE',
    });
  }

  async refreshQrCode(id: string) {
    return this.request<{ instanceKey: string; qrCodeUrl: string }>(`/api/connections/${id}/refresh-qr`, {
      method: 'POST',
    });
  }

  // Messages endpoints
  async getMessages(page = 1, limit = 20, instanceId?: string, remoteJid?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (instanceId) params.append('instanceId', instanceId);
    if (remoteJid) params.append('remoteJid', remoteJid);

    return this.request<{
      data: Array<{
        id: string;
        contact: string;
        remoteJid: string;
        content: string;
        response: string | null;
        direction: string;
        status: string;
        instanceName: string;
        createdAt: string;
        processedAt: string | null;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/messages?${params}`);
  }

  async sendMessage(instanceKey: string, remoteJid: string, content: string) {
    return this.request<{ success: boolean; messageId?: string }>(`/api/messages/send`, {
      method: 'POST',
      body: JSON.stringify({ instanceKey, remoteJid, content }),
    });
  }

  async getRecentConversations() {
    return this.request<Array<{
      id: string;
      contact: string;
      remoteJid: string;
      lastMessage: string;
      status: string;
      instanceName: string;
      timestamp: string;
    }>>('/api/messages/recent');
  }

  // Chatbot endpoints
  async getFlows() {
    return this.request<Array<{
      id: string;
      name: string;
      keyword: string;
      isActive: boolean;
      nodes: Array<any>;
    }>>('/api/chatbot/flows');
  }

  async createFlow(data: any) {
    return this.request<any>('/api/chatbot/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFlow(id: string, data: any) {
    return this.request<any>(`/api/chatbot/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFlow(id: string) {
    return this.request<void>(`/api/chatbot/flows/${id}`, {
      method: 'DELETE',
    });
  }

  // Logout
  logout() {
    this.setToken(null);
  }
}

export const api = new ApiClient();
export default api;
