"use client";

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Alert,
  Tooltip
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

interface DailyIntegrationsProps {
  appId: string;
}

export default function DailyIntegrations({ appId }: DailyIntegrationsProps) {
  const [success, setSuccess] = useState<string | null>(null);

  const getWebhookUrl = (type: string) => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin.replace(':3000', ':3001'); // Assuming backend is on 3001
    return `${baseUrl}/webhook/${type}/${appId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('URL copiada!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>URLs de Webhook</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure estas URLs nas plataformas de pagamento (Hotmart, Kiwify, Monetizze, etc.) para cadastrar clientes automaticamente neste aplicativo.
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              🛒 Webhook de Compra Aprovada
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Use esta URL para cadastrar novos clientes quando uma compra for aprovada.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.default', p: 1.5, borderRadius: 1, fontFamily: 'monospace' }}>
              <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
                {getWebhookUrl('purchase')}
              </Typography>
              <Tooltip title="Copiar">
                <IconButton size="small" onClick={() => copyToClipboard(getWebhookUrl('purchase'))}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="secondary" gutterBottom>
              🔥 Webhook Hotmart (Específico)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Use esta URL especificamente na Hotmart se preferir a integração nativa.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.default', p: 1.5, borderRadius: 1, fontFamily: 'monospace' }}>
              <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
                {getWebhookUrl('hotmart')}
              </Typography>
              <Tooltip title="Copiar">
                <IconButton size="small" onClick={() => copyToClipboard(getWebhookUrl('hotmart'))}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="error" gutterBottom>
              ↩️ Webhook de Reembolso/Cancelamento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Use a mesma URL de compra. O sistema detecta automaticamente eventos de reembolso, cancelamento e chargeback.
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" color="warning.main" gutterBottom>
              📝 Formato de Payload Genérico (JSON)
            </Typography>
            <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto' }}>
              <pre style={{ margin: 0 }}>{`{
  "event": "purchase" | "refund",
  "customer": {
    "name": "Nome do Cliente",
    "phone": "+5535999999999",
    "email": "email@exemplo.com"
  },
  "transaction": {
    "id": "123456",
    "product": "Nome do Produto"
  }
}`}</pre>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
