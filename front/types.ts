import React from 'react';

export interface StatData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtext: string;
  icon: React.ReactNode;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  lastMessage: string;
  status: 'Open' | 'Pending' | 'Closed';
  time: string;
}

export interface ChartDataPoint {
  time: string;
  messages: number;
}

export interface Product {
  id: string;
  name: string;
  variant: string; // ex: Gelada, Natural, 600ml, Lata
  quantity: number;
  price: string;
  sku: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export type View = 'dashboard' | 'connections' | 'inventory' | 'chatbot' | 'livechat' | 'ai-secretary' | 'secretary-tasks' | 'group-automations' | 'integrations' | 'external-webhook' | 'crm' | 'campaigns' | 'analytics' | 'team' | 'profile' | 'settings' | 'subscription';