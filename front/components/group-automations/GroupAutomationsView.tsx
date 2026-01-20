"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Add, AutoAwesome, Group } from "@mui/icons-material";
import api from "../../lib/api";
import ConfirmDialog from "../common/ConfirmDialog";

// Componentes separados
import TemplateGrid from "./TemplateGrid";
import AutomationsTable from "./AutomationsTable";
import AutomationDialog from "./AutomationDialog";
import CollectedDataDialog from "./CollectedDataDialog";

// Types e constantes
import {
  GroupAutomation,
  AvailableGroup,
  AutomationFormData,
  AutomationTemplate,
  DATA_TYPES,
  INITIAL_FORM_DATA,
} from "./types";

/**
 * View principal de automações de grupo
 */
export default function GroupAutomationsView() {
  // State
  const [automations, setAutomations] = useState<GroupAutomation[]>([]);
  const [groups, setGroups] = useState<AvailableGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  const [viewDataOpen, setViewDataOpen] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<any[]>([]);
  const [editingAutomation, setEditingAutomation] =
    useState<GroupAutomation | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState({
    title: "",
    content: "",
  });

  // Form state
  const [formData, setFormData] =
    useState<AutomationFormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [automationsData, groupsData] = await Promise.all([
        api.getGroupAutomations(),
        api.getAvailableGroups(),
      ]);
      setAutomations(automationsData);
      setGroups(groupsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (automation?: GroupAutomation) => {
    if (automation) {
      setEditingAutomation(automation);
      setFormData({
        name: automation.name,
        description: automation.description || "",
        groupRemoteJid: automation.groupRemoteJid || "",
        groupNameMatch: automation.groupNameMatch || "",
        capturePattern: automation.capturePattern || "",
        actionType: automation.actionType,
        actionConfig: automation.actionConfig || {},
        startsAt: automation.startsAt ? automation.startsAt.slice(0, 16) : "",
        expiresAt: automation.expiresAt
          ? automation.expiresAt.slice(0, 16)
          : "",
        priority: automation.priority,
        shouldReply: automation.shouldReply,
        replyOnlyOnce: automation.replyOnlyOnce,
        skipAiAfter: automation.skipAiAfter,
        isActive: automation.isActive,
        dataType: automation.actionConfig?.dataType || "lottery_numbers",
        replyTemplate: automation.actionConfig?.replyTemplate || "",
        webhookUrl: automation.actionConfig?.url || "",
      });
    } else {
      setEditingAutomation(null);
      setFormData(INITIAL_FORM_DATA);
    }
    setDialogOpen(true);
  };

  const handleUseTemplate = (template: AutomationTemplate) => {
    setEditingAutomation(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      name: template.config.name || "",
      description: template.config.description || "",
      capturePattern: template.config.capturePattern || "",
      actionType: template.config.actionType || "collect_data",
      shouldReply: template.config.shouldReply ?? true,
      replyOnlyOnce: template.config.replyOnlyOnce ?? false,
      skipAiAfter: template.config.skipAiAfter ?? true,
      isActive: template.config.isActive ?? true,
      dataType: template.config.dataType || "lottery_numbers",
      replyTemplate: template.config.replyTemplate || "",
      webhookUrl: template.config.webhookUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // Build actionConfig based on actionType
      let actionConfig: any = {};

      if (formData.actionType === "collect_data") {
        actionConfig = {
          dataType: formData.dataType,
          replyTemplate: formData.replyTemplate,
        };
      } else if (formData.actionType === "auto_reply") {
        actionConfig = {
          replyTemplate: formData.replyTemplate,
        };
      } else if (formData.actionType === "webhook") {
        actionConfig = {
          url: formData.webhookUrl,
          method: "POST",
          successReply: formData.replyTemplate,
        };
      } else if (formData.actionType === "aggregate") {
        actionConfig = {
          operation: "count",
          replyTemplate: formData.replyTemplate,
        };
      }

      // Set capture pattern based on data type
      let capturePattern = formData.capturePattern;
      if (!capturePattern && formData.dataType) {
        const dataTypeConfig = DATA_TYPES.find(
          (dt) => dt.value === formData.dataType,
        );
        if (dataTypeConfig) {
          capturePattern = dataTypeConfig.pattern;
        }
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        groupRemoteJid: formData.groupRemoteJid || null,
        groupNameMatch: formData.groupNameMatch || null,
        capturePattern,
        actionType: formData.actionType,
        actionConfig,
        startsAt: formData.startsAt || null,
        expiresAt: formData.expiresAt || null,
        priority: formData.priority,
        shouldReply: formData.shouldReply,
        replyOnlyOnce: formData.replyOnlyOnce,
        skipAiAfter: formData.skipAiAfter,
        isActive: formData.isActive,
      };

      if (editingAutomation) {
        await api.updateGroupAutomation(editingAutomation.id, payload);
        setSuccess("Automação atualizada com sucesso!");
      } else {
        await api.createGroupAutomation(payload);
        setSuccess("Automação criada com sucesso!");
      }

      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleGroupAutomation(id);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmMessage({
      title: "Confirmar Exclusão",
      content:
        "Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.",
    });
    setConfirmAction(() => async () => {
      try {
        await api.deleteGroupAutomation(id);
        setSuccess("Automação excluída com sucesso!");
        loadData();
      } catch (err: any) {
        setError(err.message);
      }
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const handleViewData = async (id: string) => {
    try {
      const data = await api.getGroupAutomationData(id);
      setCollectedData(data);
      setViewDataOpen(id);
    } catch (err: any) {
      setError(err.message);
    }
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
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            gap={1}
          >
            <AutoAwesome color="primary" />
            Automações de Grupo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crie regras automáticas para processar mensagens em grupos
            específicos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          Nova Automação
        </Button>
      </Box>

      {/* Templates */}
      <TemplateGrid onSelectTemplate={handleUseTemplate} />

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Content */}
      {automations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Group sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma automação configurada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Crie sua primeira automação para processar mensagens de grupos
            automaticamente
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Criar Automação
          </Button>
        </Paper>
      ) : (
        <AutomationsTable
          automations={automations}
          groups={groups}
          expandedId={detailsOpen}
          onToggleExpand={(id) =>
            setDetailsOpen(detailsOpen === id ? null : id)
          }
          onToggleActive={handleToggle}
          onEdit={handleOpenDialog}
          onDelete={handleDelete}
          onViewData={handleViewData}
        />
      )}

      {/* Dialogs */}
      <AutomationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        formData={formData}
        setFormData={setFormData}
        editingAutomation={editingAutomation}
        groups={groups}
      />

      <CollectedDataDialog
        open={!!viewDataOpen}
        onClose={() => setViewDataOpen(null)}
        data={collectedData}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={confirmMessage.title}
        content={confirmMessage.content}
        onConfirm={confirmAction || (() => {})}
        onCancel={() => setConfirmOpen(false)}
        confirmColor="error"
        confirmText="Excluir"
      />
    </Box>
  );
}
