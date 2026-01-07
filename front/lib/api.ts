const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
        mediaUrl?: string | null;
        mediaType?: string | null;
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

  async sendMedia(instanceKey: string, remoteJid: string, file: File, caption?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('instanceKey', instanceKey);
    formData.append('remoteJid', remoteJid);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await fetch(`${API_URL}/api/messages/send-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to send media');
    }

    return response.json() as Promise<{ success: boolean; messageId?: string }>;
  }

  async transcribeMessage(messageId: string) {
    return this.request<{ success: boolean; transcription: string; content: string }>(
      `/api/messages/${messageId}/transcribe`,
      { method: 'POST' }
    );
  }

  async getRecentConversations(page = 1, limit = 30) {
    return this.request<{
      data: Array<{
        id: string;
        contact: string;
        remoteJid: string;
        lastMessage: string;
        status: string;
        instanceName: string;
        instanceKey: string;
        timestamp: string;
        profilePicUrl?: string | null;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/messages/recent?page=${page}&limit=${limit}`);
  }

  async searchConversations(query: string, limit = 20) {
    return this.request<{
      data: Array<{
        id: string;
        contact: string;
        remoteJid: string;
        lastMessage: string | null;
        instanceName: string | null;
        instanceKey: string;
        timestamp: string;
        profilePicUrl?: string | null;
      }>;
    }>(`/api/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getContacts(page = 1, limit = 50, query?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (query) {
      params.append('q', query);
    }
    return this.request<{
      data: Array<{
        id: string;
        remoteJid: string;
        pushName: string | null;
        displayName: string;
        profilePicUrl?: string | null;
        instanceId: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/messages/contacts?${params.toString()}`);
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

  // Products/Inventory endpoints
  async getProducts() {
    return this.request<Array<{
      id: string;
      name: string;
      variant: string;
      quantity: number;
      price: string;
      priceRaw: number;
      sku: string;
      imageUrl?: string;
      status: string;
    }>>('/api/products');
  }

  async createProduct(data: any) {
    return this.request<any>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<void>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // AI Secretary endpoints
  async getAISecretaryConfig() {
    return this.request<{
      id: string;
      enabled: boolean;
      mode: 'passive' | 'active' | 'supervised';
      systemPrompt: string;
      temperature: number;
      ownerPhone: string | null;
      ownerName: string | null;
      businessHours: string | null;
      escalationWords: string | null;
      personality: string;
      testMode: boolean;
    }>('/api/ai-secretary/config');
  }

  async updateAISecretaryConfig(data: Partial<{
    enabled: boolean;
    mode: string;
    systemPrompt: string;
    temperature: number;
    ownerPhone: string;
    ownerName: string;
    businessHours: string;
    escalationWords: string;
    personality: string;
    testMode: boolean;
  }>) {
    return this.request<any>('/api/ai-secretary/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAIConversations() {
    const response = await this.request<{
      data: Array<{
        id: string;
        remoteJid: string;
        status: string;
        priority: string;
        assignedTo: string | null;
        aiEnabled: boolean;
        summary: string | null;
        lastMessageAt: string;
        instanceName: string;
        instanceKey: string;
        contact: {
          id?: string;
          name: string;
          profilePicUrl: string | null;
        };
        recentMessages: Array<{
          id: string;
          content: string;
          direction: string;
          createdAt: string;
          response: string | null;
        }>;
      }>;
    }>('/api/messages/conversations');
    return response.data;
  }

  async toggleConversationAI(conversationId: string, aiEnabled: boolean) {
    return this.request<{ success: boolean; aiEnabled: boolean; assignedTo: string }>(
      `/api/messages/conversations/${conversationId}/toggle-ai`,
      {
        method: 'POST',
        body: JSON.stringify({ aiEnabled }),
      }
    );
  }

  async getConversationByJid(remoteJid: string) {
    return this.request<{
      exists: boolean;
      id?: string;
      aiEnabled: boolean;
      assignedTo: string | null;
      status?: string;
      priority?: string;
    }>(`/api/messages/conversations/by-jid/${encodeURIComponent(remoteJid)}`);
  }

  async getAISuggestions(remoteJid: string) {
    return this.request<{
      suggestion: string | null;
      confidence: number;
      reasoning: string;
      intent: string;
      urgency: string;
      sentiment: string;
      shouldEscalate: boolean;
    }>(`/api/ai-secretary/suggestions/${encodeURIComponent(remoteJid)}`);
  }

  async approveAISuggestion(remoteJid: string, instanceKey: string, response: string) {
    return this.request<{ success: boolean }>('/api/ai-secretary/approve', {
      method: 'POST',
      body: JSON.stringify({ remoteJid, instanceKey, response }),
    });
  }

  async overrideAISuggestion(remoteJid: string, aiSuggestion: string, humanResponse: string) {
    return this.request<{ success: boolean }>('/api/ai-secretary/override', {
      method: 'POST',
      body: JSON.stringify({ remoteJid, aiSuggestion, humanResponse }),
    });
  }

  async getAIStats() {
    return this.request<{
      totalInteractions: number;
      approvedSuggestions: number;
      overrides: number;
      escalations: number;
      approvalRate: string;
      activeConversations: number;
    }>('/api/ai-secretary/stats');
  }

  // CRM Contacts endpoints
  async getCRMContacts(page = 1, limit = 30, query?: string, tag?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query) params.append('q', query);
    if (tag) params.append('tag', tag);
    return this.request<{
      data: Array<{
        id: string;
        remoteJid: string;
        pushName: string | null;
        displayName: string;
        profilePicUrl: string | null;
        notes: string | null;
        tags: string[];
        lastMessage: string | null;
        lastMessageAt: string | null;
        messageCount: number;
        createdAt: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/api/contacts?${params.toString()}`);
  }

  async getCRMContact(id: string) {
    return this.request<any>(`/api/contacts/${id}`);
  }

  async updateCRMContact(id: string, data: {
    pushName?: string;
    notes?: string;
    tags?: string[];
    cep?: string;
    birthDate?: string;
    gender?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
    university?: string;
    course?: string;
    occupation?: string;
  }) {
    return this.request<any>(`/api/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ViaCEP integration
  async fetchAddressByCep(cep: string): Promise<{
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
  } | null> {
    try {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) return null;

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) return null;
      return data;
    } catch (error) {
      console.error('Error fetching CEP:', error);
      return null;
    }
  }

  async deleteCRMContact(id: string) {
    return this.request<{ success: boolean }>(`/api/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  async getContactDetails(id: string) {
    return this.request<{
      id: string;
      name: string;
      phone: string;
      email?: string;
      notes?: string;
      tags: string[];
      birthDate?: string;
      gender?: string;
      city?: string;
      state?: string;
      university?: string;
      course?: string;
      occupation?: string;
      leadScore?: number;
      leadStatus?: string;
      aiAnalysis?: string;
      aiAnalyzedAt?: string;
      totalMessages: number;
      firstContactAt?: string;
      createdAt: string;
      memoriesByType: {
        fact: Array<{ key: string; value: string; confidence: number }>;
        preference: Array<{ key: string; value: string; confidence: number }>;
        need: Array<{ key: string; value: string; confidence: number }>;
        objection: Array<{ key: string; value: string; confidence: number }>;
        interest: Array<{ key: string; value: string; confidence: number }>;
        context: Array<{ key: string; value: string; confidence: number }>;
      };
    }>(`/api/contacts/${id}`);
  }

  async qualifyContact(id: string) {
    return this.request<{
      success: boolean;
      score: number;
      status: string;
      analysis: string;
      error?: string;
    }>(`/api/contacts/${id}/qualify`, {
      method: 'POST',
    });
  }

  async getContactStats() {
    return this.request<{
      totalContacts: number;
      activeContacts: number;
      newThisWeek: number;
    }>('/api/contacts/meta/stats');
  }

  async getContactTags() {
    return this.request<string[]>('/api/contacts/meta/tags');
  }

  async getSegmentOptions() {
    return this.request<{
      tags: string[];
      genders: string[];
      cities: string[];
      states: string[];
      universities: string[];
      courses: string[];
      occupations: string[];
    }>('/api/contacts/meta/segments');
  }

  async getDemographicAnalytics() {
    return this.request<{
      totalContacts: number;
      byCity: Array<{ name: string; count: number }>;
      byState: Array<{ name: string; count: number }>;
      byNeighborhood: Array<{ name: string; count: number }>;
      byUniversity: Array<{ name: string; count: number }>;
      byCourse: Array<{ name: string; count: number }>;
      byOccupation: Array<{ name: string; count: number }>;
      byGender: Array<{ name: string; count: number }>;
      byAge: Array<{ range: string; count: number }>;
      byLeadStatus: Array<{ name: string; count: number }>;
    }>('/api/contacts/meta/analytics');
  }

  // Campaigns endpoints
  async getCampaigns() {
    return this.request<Array<{
      id: string;
      name: string;
      message: string;
      mediaUrl: string | null;
      mediaType: string | null;
      status: string;
      scheduledAt: string | null;
      startedAt: string | null;
      completedAt: string | null;
      targetAll: boolean;
      targetTags: string[];
      targetGenders: string[];
      targetCities: string[];
      targetStates: string[];
      targetUniversities: string[];
      targetCourses: string[];
      targetMinAge: number | null;
      targetMaxAge: number | null;
      totalRecipients: number;
      sentCount: number;
      pendingCount: number;
      failedCount: number;
      createdAt: string;
    }>>('/api/campaigns');
  }

  async getCampaign(id: string) {
    return this.request<any>(`/api/campaigns/${id}`);
  }

  async createCampaign(data: {
    name: string;
    message: string;
    mediaUrl?: string;
    targetAll?: boolean;
    targetTags?: string[];
    targetGenders?: string[];
    targetCities?: string[];
    targetStates?: string[];
    targetUniversities?: string[];
    targetCourses?: string[];
    targetMinAge?: number;
    targetMaxAge?: number;
    scheduledAt?: string;
  }) {
    return this.request<any>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: {
    name?: string;
    message?: string;
    mediaUrl?: string;
    targetAll?: boolean;
    targetTags?: string[];
    targetGenders?: string[];
    targetCities?: string[];
    targetStates?: string[];
    targetUniversities?: string[];
    targetCourses?: string[];
    targetMinAge?: number;
    targetMaxAge?: number;
    scheduledAt?: string;
  }) {
    return this.request<any>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string) {
    return this.request<{ success: boolean }>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  async startCampaign(id: string) {
    return this.request<{ message: string; recipientCount?: number; error?: string }>(`/api/campaigns/${id}/start`, {
      method: 'POST',
    });
  }

  async cancelCampaign(id: string) {
    return this.request<{ message: string }>(`/api/campaigns/${id}/cancel`, {
      method: 'POST',
    });
  }

  async getCampaignStats() {
    return this.request<{
      totalCampaigns: number;
      runningCampaigns: number;
      completedCampaigns: number;
      scheduledCampaigns: number;
      totalMessagesSent: number;
    }>('/api/campaigns/meta/stats');
  }

  // Get media URL for a message (proxy through backend)
  getMediaUrl(messageId: string): string {
    return `${API_URL}/api/messages/media/${messageId}?token=${this.token}`;
  }

  // ========================================
  // Secretary Tasks
  // ========================================
  async getSecretaryTasks() {
    return this.request<any[]>('/api/secretary-tasks');
  }

  async getSecretaryTask(id: string) {
    return this.request<any>(`/api/secretary-tasks/${id}`);
  }

  async createSecretaryTask(data: any) {
    return this.request<any>('/api/secretary-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSecretaryTask(id: string, data: any) {
    return this.request<any>(`/api/secretary-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSecretaryTask(id: string) {
    return this.request<any>(`/api/secretary-tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleSecretaryTask(id: string) {
    return this.request<any>(`/api/secretary-tasks/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  // ========================================
  // Integrations - Gastometria
  // ========================================
  async getGastometriaStatus() {
    return this.request<{ connected: boolean; config?: any }>('/api/integrations/gastometria/status');
  }

  async connectGastometria(email: string, password: string) {
    return this.request<{ success: boolean; message: string; wallets?: any[] }>('/api/integrations/gastometria/connect', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async disconnectGastometria() {
    return this.request<{ success: boolean }>('/api/integrations/gastometria', {
      method: 'DELETE',
    });
  }

  async getGastometriaWallets() {
    return this.request<any[]>('/api/integrations/gastometria/wallets');
  }

  async setGastometriaConfig(config: { defaultWalletId: string }) {
    return this.request<{ success: boolean }>('/api/integrations/gastometria/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getGastometriaBalance() {
    return this.request<{ success: boolean; balance?: number; wallets?: any[]; message?: string }>('/api/integrations/gastometria/balance');
  }

  async createGastometriaTransaction(data: {
    amount: number;
    type: 'income' | 'expense';
    category: string;
    item: string;
    date?: string;
    establishment?: string;
  }) {
    return this.request<{ success: boolean; message: string; transaction?: any }>('/api/integrations/gastometria/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // Integrations - Google Calendar
  // ========================================
  async getGoogleCalendarStatus() {
    return this.request<{ connected: boolean; expiresAt?: string }>('/api/integrations/google-calendar/status');
  }

  async getGoogleCalendarAuthUrl() {
    return this.request<{ authUrl: string }>('/api/integrations/google-calendar/auth-url');
  }

  async disconnectGoogleCalendar() {
    return this.request<{ success: boolean }>('/api/integrations/google-calendar', {
      method: 'DELETE',
    });
  }

  async listGoogleCalendarEvents(options?: { timeMin?: string; timeMax?: string; maxResults?: number }) {
    const params = new URLSearchParams();
    if (options?.timeMin) params.append('timeMin', options.timeMin);
    if (options?.timeMax) params.append('timeMax', options.timeMax);
    if (options?.maxResults) params.append('maxResults', options.maxResults.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/api/integrations/google-calendar/events${query}`);
  }

  async createGoogleCalendarEvent(data: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    attendees?: string[];
  }) {
    return this.request<any>('/api/integrations/google-calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteGoogleCalendarEvent(eventId: string) {
    return this.request<{ success: boolean }>(`/api/integrations/google-calendar/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async scheduleAppointment(data: {
    title: string;
    description?: string;
    date: string;
    time: string;
    duration: number;
    customerName?: string;
    customerPhone?: string;
  }) {
    return this.request<{ success: boolean; event?: any; message: string }>('/api/integrations/google-calendar/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // Notifications
  // ========================================
  async getNotifications(options?: { unreadOnly?: boolean; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{
      notifications: Notification[];
      total: number;
      unreadCount: number;
    }>(`/api/notifications${query}`);
  }

  async getNotificationCount() {
    return this.request<{ count: number }>('/api/notifications/unread-count');
  }

  async markNotificationAsRead(id: string) {
    return this.request<any>(`/api/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' });
  }

  async deleteNotification(id: string) {
    return this.request<any>(`/api/notifications/${id}`, { method: 'DELETE' });
  }

  // ================================
  // Group Automations
  // ================================

  async getGroupAutomations() {
    return this.request<any[]>('/api/group-automations');
  }

  async getGroupAutomation(id: string) {
    return this.request<any>(`/api/group-automations/${id}`);
  }

  async getGroupAutomationData(id: string) {
    return this.request<any[]>(`/api/group-automations/${id}/data`);
  }

  async getAvailableGroups() {
    return this.request<any[]>('/api/group-automations/groups');
  }

  async createGroupAutomation(data: any) {
    return this.request<any>('/api/group-automations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGroupAutomation(id: string, data: any) {
    return this.request<any>(`/api/group-automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGroupAutomation(id: string) {
    return this.request<any>(`/api/group-automations/${id}`, { method: 'DELETE' });
  }

  async toggleGroupAutomation(id: string) {
    return this.request<any>(`/api/group-automations/${id}/toggle`, { method: 'POST' });
  }

  // Logout
  logout() {
    this.setToken(null);
  }
}

// Notification interface
export interface Notification {
  id: string;
  companyId: string;
  userId?: string;
  type: 'hot_lead' | 'escalation' | 'integration_error' | 'campaign_complete' | 'low_balance' | 'system' | 'task_reminder' | 'new_contact' | 'message_failed';
  category: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export const api = new ApiClient();
export default api;
