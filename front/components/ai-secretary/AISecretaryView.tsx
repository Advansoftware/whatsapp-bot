"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import {
  SmartToy as AIIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import api from "../../lib/api";

// Componentes separados
import StatsCards from "./StatsCards";
import ConfigTab from "./ConfigTab";
import ConversationsTab from "./ConversationsTab";

// Types
import {
  AIConfig,
  AIStats,
  AIFormData,
  Conversation,
  INITIAL_FORM_DATA,
} from "./types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * View principal da Secretária IA
 */
const AISecretaryView: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedConversation, setExpandedConversation] = useState<
    string | null
  >(null);
  const [togglingAI, setTogglingAI] = useState<string | null>(null);
  const [formData, setFormData] = useState<AIFormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, statsData, conversationsData] = await Promise.all([
        api.getAISecretaryConfig(),
        api.getAIStats(),
        api.getAIConversations(),
      ]);
      setConfig(configData);
      setStats(statsData);
      setConversations(conversationsData);
      setFormData({
        enabled: configData.enabled,
        mode: configData.mode,
        systemPrompt: configData.systemPrompt,
        temperature: configData.temperature,
        ownerPhone: configData.ownerPhone || "",
        ownerName: configData.ownerName || "",
        escalationWords: configData.escalationWords || "",
        personality: configData.personality,
        testMode: configData.testMode || false,
      });
    } catch (err) {
      setError("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateAISecretaryConfig(formData);
      setSuccess("Configurações salvas com sucesso!");
      await loadData();
    } catch (err) {
      setError("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAI = async (
    conversationId: string,
    currentAiEnabled: boolean,
  ) => {
    setTogglingAI(conversationId);
    try {
      await api.toggleConversationAI(conversationId, !currentAiEnabled);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                aiEnabled: !currentAiEnabled,
                assignedTo: !currentAiEnabled ? "ai" : "human",
              }
            : conv,
        ),
      );
    } catch (err) {
      setError("Erro ao alterar status da IA");
    } finally {
      setTogglingAI(null);
    }
  };

  const handleIntervene = (conv: Conversation) => {
    handleToggleAI(conv.id, true);
    window.dispatchEvent(
      new CustomEvent("navigateToChat", {
        detail: {
          remoteJid: conv.remoteJid,
          instanceKey: conv.instanceKey,
          contactName: conv.contact.name,
        },
      }),
    );
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <AIIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h4" fontWeight="bold">
            Secretária IA
          </Typography>
          <Chip
            label={formData.enabled ? "Ativa" : "Desativada"}
            color={formData.enabled ? "success" : "default"}
            size="small"
          />
        </Box>
        <IconButton onClick={loadData}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Alerts */}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab
          icon={<SettingsIcon />}
          label="Configuração"
          iconPosition="start"
        />
        <Tab icon={<ChatIcon />} label="Conversas" iconPosition="start" />
      </Tabs>

      {/* Configuration Tab */}
      <TabPanel value={tabValue} index={0}>
        <ConfigTab
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onSave={handleSave}
        />
      </TabPanel>

      {/* Conversations Tab */}
      <TabPanel value={tabValue} index={1}>
        <ConversationsTab
          conversations={conversations}
          expandedId={expandedConversation}
          togglingAI={togglingAI}
          onRefresh={loadData}
          onToggleExpand={(id) =>
            setExpandedConversation(expandedConversation === id ? null : id)
          }
          onToggleAI={handleToggleAI}
          onIntervene={handleIntervene}
        />
      </TabPanel>
    </Box>
  );
};

export default AISecretaryView;
