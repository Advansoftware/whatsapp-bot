import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Add missing interfaces
export interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  metadata?: any;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let token: string | null = null;

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  if (!token) {
    token = localStorage.getItem('accessToken');
  }
  return token;
};

export const setToken = (newToken: string | null) => {
  token = newToken;
  if (typeof window !== 'undefined') {
    if (newToken) {
      localStorage.setItem('accessToken', newToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
};

// Request interceptor - add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const currentToken = getToken();
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setToken(null);
      // Don't redirect if it's a login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Internal axios client (renamed to avoid conflict with exported 'api')
const axiosClient = axiosInstance;

// Auth endpoints
export const authApi = {
  loginWithGoogle: async (idToken: string) => {
    const response = await axiosClient.post<{ accessToken: string; user: any }>('/auth/google', { idToken });
    setToken(response.data.accessToken);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await axiosClient.post<{ accessToken: string; user: any }>('/auth/login', data);
    setToken(response.data.accessToken);
    return response.data;
  },

  register: async (data: { name: string; email: string; password: string }) => {
    const response = await axiosClient.post<{ accessToken: string; user: any }>('/auth/register', data);
    setToken(response.data.accessToken);
    return response.data;
  },

  getProfile: async () => {
    const response = await axiosClient.get<any>('/auth/me');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string; picture?: string }) => {
    const response = await axiosClient.put<any>('/auth/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await axiosClient.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  hasPassword: async () => {
    const response = await axiosClient.get<{ hasPassword: boolean }>('/auth/has-password');
    return response.data;
  },

  verifyToken: async () => {
    const response = await axiosClient.get<{ valid: boolean; user: any }>('/auth/verify');
    return response.data;
  },

  logout: () => {
    setToken(null);
  },
};

// Dashboard endpoints
export const dashboardApi = {
  getStats: async () => {
    const response = await axiosClient.get<{
      totalMessages: number;
      todayMessages: number;
      messageGrowth: string;
      activeLeads: number;
      activeInstances: number;
      balance: number;
      apiStatus: string;
      uptime: string;
    }>('/api/dashboard/stats');
    return response.data;
  },

  getActivity: async () => {
    const response = await axiosClient.get<Array<{
      name: string;
      incoming: number;
      outgoing: number;
    }>>('/api/dashboard/activity');
    return response.data;
  },
};

// Connections endpoints
export const connectionsApi = {
  getAll: async () => {
    const response = await axiosClient.get<Array<{
      id: string;
      name: string;
      instanceKey: string;
      status: string;
      createdAt: string;
    }>>('/api/connections');
    return response.data;
  },

  create: async (name: string) => {
    const response = await axiosClient.post<{
      id: string;
      name: string;
      instanceKey: string;
      status: string;
      qrCodeUrl: string;
    }>('/api/connections', { name });
    return response.data;
  },

  delete: async (id: string) => {
    await axiosClient.delete(`/api/connections/${id}`);
  },

  refreshQr: async (id: string) => {
    const response = await axiosClient.post<{ instanceKey: string; qrCodeUrl: string }>(
      `/api/connections/${id}/refresh-qr`
    );
    return response.data;
  },

  reconnect: async (id: string) => {
    const response = await axiosClient.post<{
      success: boolean;
      id: string;
      name: string;
      instanceKey: string;
      status: string;
      qrCodeUrl: string;
      message: string;
    }>(`/api/connections/${id}/reconnect`);
    return response.data;
  },
};

// Messages endpoints
export const messagesApi = {
  getMessages: async (params: { page?: number; limit?: number; instanceId?: string; remoteJid?: string }) => {
    const response = await axiosClient.get('/api/messages', { params });
    return response.data;
  },

  send: async (data: {
    instanceKey: string;
    remoteJid: string;
    content: string;
    options?: { quotedMessageId?: string; mediaUrl?: string; mediaType?: string }
  }) => {
    const response = await axiosClient.post<{ success: boolean; messageId?: string }>('/api/messages/send', data);
    return response.data;
  },

  sendMedia: async (instanceKey: string, remoteJid: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('instanceKey', instanceKey);
    formData.append('remoteJid', remoteJid);
    if (caption) formData.append('caption', caption);

    const response = await axiosClient.post<{ success: boolean; messageId?: string }>(
      '/api/messages/send-media',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  transcribe: async (messageId: string) => {
    const response = await axiosClient.post<{ success: boolean; transcription: string; content: string }>(
      `/api/messages/${messageId}/transcribe`
    );
    return response.data;
  },

  getRecentConversations: async (page = 1, limit = 30) => {
    const response = await axiosClient.get('/api/messages/recent', { params: { page, limit } });
    return response.data;
  },

  search: async (query: string, limit = 20) => {
    const response = await axiosClient.get('/api/messages/search', { params: { q: query, limit } });
    return response.data;
  },

  getContacts: async (params: { page?: number; limit?: number; q?: string }) => {
    const response = await axiosClient.get('/api/messages/contacts', { params });
    return response.data;
  },

  getMediaUrl: (messageId: string) => {
    return `${API_URL}/api/messages/media/${messageId}?token=${getToken()}`;
  },
};

// CRM Contacts endpoints
export const contactsApi = {
  getAll: async (params: { page?: number; limit?: number; q?: string; tag?: string; status?: string }) => {
    const response = await axiosClient.get('/api/contacts', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosClient.get(`/api/contacts/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await axiosClient.put(`/api/contacts/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axiosClient.delete<{ success: boolean }>(`/api/contacts/${id}`);
    return response.data;
  },

  qualify: async (id: string) => {
    const response = await axiosClient.post(`/api/contacts/${id}/qualify`);
    return response.data;
  },

  getStats: async () => {
    const response = await axiosClient.get('/api/contacts/meta/stats');
    return response.data;
  },

  getTags: async () => {
    const response = await axiosClient.get<string[]>('/api/contacts/meta/tags');
    return response.data;
  },

  getSegmentOptions: async () => {
    const response = await axiosClient.get('/api/contacts/meta/segments');
    return response.data;
  },

  getDemographicAnalytics: async () => {
    const response = await axiosClient.get('/api/contacts/meta/analytics');
    return response.data;
  },
};

// AI Secretary endpoints
export const aiSecretaryApi = {
  getConfig: async () => {
    const response = await axiosClient.get('/api/ai-secretary/config');
    return response.data;
  },

  updateConfig: async (data: any) => {
    const response = await axiosClient.put('/api/ai-secretary/config', data);
    return response.data;
  },

  getConversations: async () => {
    const response = await axiosClient.get('/api/messages/conversations');
    return response.data.data;
  },

  toggleAI: async (conversationId: string, aiEnabled: boolean) => {
    const response = await axiosClient.post(`/api/messages/conversations/${conversationId}/toggle-ai`, { aiEnabled });
    return response.data;
  },

  getConversationByJid: async (remoteJid: string) => {
    const response = await axiosClient.get(`/api/messages/conversations/by-jid/${encodeURIComponent(remoteJid)}`);
    return response.data;
  },

  getSuggestions: async (remoteJid: string) => {
    const response = await axiosClient.get(`/api/ai-secretary/suggestions/${encodeURIComponent(remoteJid)}`);
    return response.data;
  },

  approve: async (data: { remoteJid: string; instanceKey: string; response: string }) => {
    const response = await axiosClient.post('/api/ai-secretary/approve', data);
    return response.data;
  },

  override: async (data: { remoteJid: string; aiSuggestion: string; humanResponse: string }) => {
    const response = await axiosClient.post('/api/ai-secretary/override', data);
    return response.data;
  },

  getStats: async () => {
    const response = await axiosClient.get('/api/ai-secretary/stats');
    return response.data;
  },
};

// Secretary Tasks endpoints
export const secretaryTasksApi = {
  getAll: async () => {
    const response = await axiosClient.get('/api/secretary-tasks');
    return response.data;
  },
  create: async (data: any) => {
    const response = await axiosClient.post('/api/secretary-tasks', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await axiosClient.put(`/api/secretary-tasks/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await axiosClient.delete(`/api/secretary-tasks/${id}`);
  },
  toggle: async (id: string) => {
    const response = await axiosClient.patch(`/api/secretary-tasks/${id}/toggle`);
    return response.data;
  },
};

// Campaigns endpoints
export const campaignsApi = {
  getAll: async () => {
    const response = await axiosClient.get('/api/campaigns');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosClient.get(`/api/campaigns/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await axiosClient.post('/api/campaigns', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await axiosClient.put(`/api/campaigns/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axiosClient.delete<{ success: boolean }>(`/api/campaigns/${id}`);
    return response.data;
  },

  start: async (id: string) => {
    const response = await axiosClient.post(`/api/campaigns/${id}/start`);
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await axiosClient.post(`/api/campaigns/${id}/cancel`);
    return response.data;
  },

  getStats: async () => {
    const response = await axiosClient.get('/api/campaigns/meta/stats');
    return response.data;
  },
};

// Chatbot endpoints
export const chatbotApi = {
  getFlows: async () => {
    const response = await axiosClient.get('/api/chatbot/flows');
    return response.data;
  },

  createFlow: async (data: any) => {
    const response = await axiosClient.post('/api/chatbot/flows', data);
    return response.data;
  },

  updateFlow: async (id: string, data: any) => {
    const response = await axiosClient.put(`/api/chatbot/flows/${id}`, data);
    return response.data;
  },

  deleteFlow: async (id: string) => {
    await axiosClient.delete(`/api/chatbot/flows/${id}`);
  },
};

// Products endpoints
export const productsApi = {
  getAll: async () => {
    const response = await axiosClient.get('/api/products');
    return response.data;
  },

  create: async (data: any) => {
    const response = await axiosClient.post('/api/products', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await axiosClient.put(`/api/products/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await axiosClient.delete(`/api/products/${id}`);
  },
};

// Team / Users Endpoints
export const teamApi = {
  getTeamMembers: async () => {
    try {
      const response = await axiosClient.get('/api/team/members');
      return response.data || [];
    } catch {
      return [];
    }
  }
};

// Integrations Endpoints
export const integrationsApi = {
  getGastometriaStatus: async () => {
    try {
      const response = await axiosClient.get<{ connected: boolean; settings?: any; config?: any }>('/api/integrations/gastometria/status');
      return response.data;
    } catch {
      return { connected: false };
    }
  },
  connectGastometria: async (email: string, password: string) => {
    const response = await axiosClient.post('/api/integrations/gastometria/connect', { email, password });
    return response.data;
  },
  disconnectGastometria: async () => {
    const response = await axiosClient.post('/api/integrations/gastometria/disconnect');
    return response.data;
  },
  setGastometriaConfig: async (config: { defaultWalletId: string }) => {
    const response = await axiosClient.put('/api/integrations/gastometria/config', config);
    return response.data;
  },
  getGastometriaWallets: async () => {
    const response = await axiosClient.get('/api/integrations/gastometria/wallets');
    return response.data;
  },
  getGoogleCalendarStatus: async () => {
    try {
      const response = await axiosClient.get<{ connected: boolean }>('/api/integrations/google-calendar/status');
      return response.data;
    } catch {
      return { connected: false };
    }
  },
  getGoogleCalendarAuthUrl: async () => {
    const response = await axiosClient.get('/api/integrations/google-calendar/auth-url');
    return response.data;
  },
  disconnectGoogleCalendar: async () => {
    const response = await axiosClient.post('/api/integrations/google-calendar/disconnect');
    return response.data;
  }
}

// Notifications Endpoints
export const notificationsApi = {
  getNotifications: async (params?: { limit?: number }) => {
    const response = await axiosClient.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications', { params });
    return response.data;
  },
  getNotificationCount: async () => {
    const response = await axiosClient.get<{ count: number }>('/api/notifications/unread-count');
    return response.data;
  },
  markNotificationAsRead: async (id: string) => {
    const response = await axiosClient.post(`/api/notifications/${id}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async () => {
    const response = await axiosClient.post('/api/notifications/read-all');
    return response.data;
  },
  deleteNotification: async (id: string) => {
    const response = await axiosClient.delete(`/api/notifications/${id}`);
    return response.data;
  }
}

// Group Automations Endpoints
export const groupAutomationsApi = {
  getGroupAutomations: async () => {
    const response = await axiosClient.get('/api/group-automations');
    return response.data;
  },

  getAvailableGroups: async () => {
    const response = await axiosClient.get('/api/group-automations/groups');
    return response.data;
  },

  getGroupAutomationData: async (id: string) => {
    const response = await axiosClient.get(`/api/group-automations/${id}/data`);
    return response.data;
  },

  createGroupAutomation: async (data: any) => {
    const response = await axiosClient.post('/api/group-automations', data);
    return response.data;
  },

  updateGroupAutomation: async (id: string, data: any) => {
    const response = await axiosClient.put(`/api/group-automations/${id}`, data);
    return response.data;
  },

  deleteGroupAutomation: async (id: string) => {
    await axiosClient.delete(`/api/group-automations/${id}`);
  },

  toggleGroupAutomation: async (id: string) => {
    const response = await axiosClient.post(`/api/group-automations/${id}/toggle`);
    return response.data;
  },
}

// ViaCEP helper
export const fetchAddressByCep = async (cep: string) => {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (response.data.erro) return null;
    return response.data;
  } catch {
    return null;
  }
};

/* ==========================================================================================
   DEFAULT EXPORT
   This object merges all API groups and axios instance methods for backward compatibility
   and ease of use (api.getNotifications, api.get, etc.)
   ========================================================================================== */
const defaultClient = {
  ...axiosClient, // Axios instance methods

  // Auth
  ...authApi,

  // Dashboard
  getDashboardStats: dashboardApi.getStats,
  getDashboardActivity: dashboardApi.getActivity,

  // Connections
  getConnections: connectionsApi.getAll,
  createConnection: connectionsApi.create,
  deleteConnection: connectionsApi.delete,
  refreshQr: connectionsApi.refreshQr,
  refreshQrCode: connectionsApi.refreshQr,
  reconnect: connectionsApi.reconnect,
  reconnectInstance: connectionsApi.reconnect,

  // Notifications
  getNotifications: notificationsApi.getNotifications,
  getNotificationCount: notificationsApi.getNotificationCount,
  markNotificationAsRead: notificationsApi.markNotificationAsRead,
  markAllNotificationsAsRead: notificationsApi.markAllNotificationsAsRead,
  deleteNotification: notificationsApi.deleteNotification,

  getFlows: chatbotApi.getFlows,
  createFlow: chatbotApi.createFlow,
  updateFlow: chatbotApi.updateFlow,
  deleteFlow: chatbotApi.deleteFlow,

  getContactStats: contactsApi.getStats,
  qualifyContact: contactsApi.qualify,
  updateContact: contactsApi.update,
  updateCRMContact: contactsApi.update,
  deleteContact: contactsApi.delete,
  deleteCRMContact: contactsApi.delete,
  getContactTags: contactsApi.getTags,
  getSegmentOptions: contactsApi.getSegmentOptions,
  getDemographicAnalytics: contactsApi.getDemographicAnalytics,
  fetchAddressByCep: async (cep: string) => {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    return response.json();
  },

  getGastometriaStatus: integrationsApi.getGastometriaStatus,
  connectGastometria: integrationsApi.connectGastometria,
  disconnectGastometria: integrationsApi.disconnectGastometria,
  setGastometriaConfig: integrationsApi.setGastometriaConfig,
  getGastometriaWallets: integrationsApi.getGastometriaWallets,
  getGoogleCalendarStatus: integrationsApi.getGoogleCalendarStatus,
  getGoogleCalendarAuthUrl: integrationsApi.getGoogleCalendarAuthUrl,
  disconnectGoogleCalendar: integrationsApi.disconnectGoogleCalendar,

  getAIStats: aiSecretaryApi.getStats,
  getAISecretaryConfig: aiSecretaryApi.getConfig,
  updateAISecretaryConfig: aiSecretaryApi.updateConfig,
  getAIConversations: aiSecretaryApi.getConversations,
  getAISuggestions: aiSecretaryApi.getSuggestions,
  approveAISuggestion: aiSecretaryApi.approve,
  overrideAISuggestion: aiSecretaryApi.override,
  getConversationByJid: aiSecretaryApi.getConversationByJid,
  toggleAI: aiSecretaryApi.toggleAI,
  toggleConversationAI: aiSecretaryApi.toggleAI,

  // Secretary Tasks
  getSecretaryTasks: secretaryTasksApi.getAll,
  createSecretaryTask: secretaryTasksApi.create,
  updateSecretaryTask: secretaryTasksApi.update,
  deleteSecretaryTask: secretaryTasksApi.delete,
  toggleSecretaryTask: secretaryTasksApi.toggle,

  getGroupAutomations: groupAutomationsApi.getGroupAutomations,
  getAvailableGroups: groupAutomationsApi.getAvailableGroups,
  getGroupAutomationData: groupAutomationsApi.getGroupAutomationData,
  createGroupAutomation: groupAutomationsApi.createGroupAutomation,
  updateGroupAutomation: groupAutomationsApi.updateGroupAutomation,
  deleteGroupAutomation: groupAutomationsApi.deleteGroupAutomation,
  toggleGroupAutomation: groupAutomationsApi.toggleGroupAutomation,

  getTeamMembers: teamApi.getTeamMembers,

  // Products methods
  getProducts: productsApi.getAll,
  createProduct: productsApi.create,
  updateProduct: productsApi.update,
  deleteProduct: productsApi.delete,

  // Message methods
  getMessages: messagesApi.getMessages,
  sendMessage: messagesApi.send, // Alias if needed, but likely api.send is used? check usages. Error says api.getMediaUrl.
  send: messagesApi.send,
  sendMedia: messagesApi.sendMedia,
  transcribe: messagesApi.transcribe,
  transcribeMessage: messagesApi.transcribe,
  getRecentConversations: messagesApi.getRecentConversations,
  searchMessages: messagesApi.search, // api.search is generic, maybe?
  search: messagesApi.search,
  searchConversations: messagesApi.search,
  getMessageContacts: messagesApi.getContacts,
  getContacts: (page?: number, limit?: number, q?: string) => messagesApi.getContacts({ page, limit, q }),
  getCRMContacts: (page?: number, limit?: number, q?: string, tag?: string, status?: string) =>
    contactsApi.getAll({ page, limit, q, tag, status }),
  getMediaUrl: messagesApi.getMediaUrl,

  // Also expose the groups themselves
  auth: authApi,
  dashboard: dashboardApi,
  connections: connectionsApi,
  messages: messagesApi,
  contacts: contactsApi,
  getContactDetails: contactsApi.getById,
  aiSecretary: aiSecretaryApi,
  campaigns: campaignsApi,
  getCampaignStats: campaignsApi.getStats,
  getCampaigns: campaignsApi.getAll,
  createCampaign: campaignsApi.create,
  updateCampaign: campaignsApi.update,
  deleteCampaign: campaignsApi.delete,
  startCampaign: campaignsApi.start,
  cancelCampaign: campaignsApi.cancel,
  chatbot: chatbotApi,
  products: productsApi,
  integrations: integrationsApi,
  notifications: notificationsApi,
  team: teamApi,

  // Support calls like api.get(...) directly
  get: axiosClient.get,
  post: axiosClient.post,
  put: axiosClient.put,
  delete: axiosClient.delete,
  patch: axiosClient.patch,
};

// EXPORT THE UNIFIED CLIENT AS BOTH NAMED AND DEFAULT
export const api = defaultClient;
export default defaultClient;
