"use client";

import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  SmartToy as AIIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  PanTool as InterventionIcon,
  PowerSettingsNew as ToggleAIIcon,
} from "@mui/icons-material";
import { Conversation, getPriorityColor, formatPhone } from "./types";

interface ConversationsTabProps {
  conversations: Conversation[];
  expandedId: string | null;
  togglingAI: string | null;
  onRefresh: () => void;
  onToggleExpand: (id: string) => void;
  onToggleAI: (conversationId: string, currentAiEnabled: boolean) => void;
  onIntervene: (conversation: Conversation) => void;
}

/**
 * Tab de conversas da Secretária IA
 */
export default function ConversationsTab({
  conversations,
  expandedId,
  togglingAI,
  onRefresh,
  onToggleExpand,
  onToggleAI,
  onIntervene,
}: ConversationsTabProps) {
  return (
    <>
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={2}
      >
        <Typography variant="h6">
          Conversas Monitoradas ({conversations.length})
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={onRefresh} size="small">
          Atualizar
        </Button>
      </Box>

      {conversations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <ChatIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography color="text.secondary">
            Nenhuma conversa ativa no momento
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {conversations.map((conv) => (
            <Grid size={{ xs: 12 }} key={conv.id}>
              <ConversationCard
                conversation={conv}
                isExpanded={expandedId === conv.id}
                isTogglingAI={togglingAI === conv.id}
                onToggleExpand={() => onToggleExpand(conv.id)}
                onToggleAI={() => onToggleAI(conv.id, conv.aiEnabled)}
                onIntervene={() => onIntervene(conv)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  isExpanded: boolean;
  isTogglingAI: boolean;
  onToggleExpand: () => void;
  onToggleAI: () => void;
  onIntervene: () => void;
}

function ConversationCard({
  conversation: conv,
  isExpanded,
  isTogglingAI,
  onToggleExpand,
  onToggleAI,
  onIntervene,
}: ConversationCardProps) {
  return (
    <Card
      sx={{
        border: !conv.aiEnabled ? 2 : 0,
        borderColor: "warning.main",
        bgcolor: isExpanded ? "action.hover" : "background.paper",
      }}
    >
      <CardContent>
        {/* Header */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={1}
          mb={1}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {conv.contact.profilePicUrl ? (
              <Box
                component="img"
                src={conv.contact.profilePicUrl}
                sx={{ width: 40, height: 40, borderRadius: "50%" }}
              />
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <PersonIcon />
              </Box>
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {conv.contact.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatPhone(conv.remoteJid)} • {conv.instanceName}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip
              label={conv.priority}
              color={getPriorityColor(conv.priority) as any}
              size="small"
            />
            <Chip
              icon={conv.aiEnabled ? <AIIcon /> : <PersonIcon />}
              label={conv.aiEnabled ? "IA" : "Humano"}
              color={conv.aiEnabled ? "success" : "warning"}
              size="small"
              variant="outlined"
            />

            <Tooltip title={conv.aiEnabled ? "Desabilitar IA" : "Habilitar IA"}>
              <IconButton
                size="small"
                color={conv.aiEnabled ? "error" : "success"}
                onClick={onToggleAI}
                disabled={isTogglingAI}
              >
                {isTogglingAI ? (
                  <CircularProgress size={20} />
                ) : (
                  <ToggleAIIcon />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Intervir (abre chat)">
              <IconButton size="small" color="primary" onClick={onIntervene}>
                <InterventionIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={isExpanded ? "Recolher" : "Ver mensagens"}>
              <IconButton size="small" onClick={onToggleExpand}>
                <ViewIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Preview */}
        {conv.recentMessages.length > 0 && !isExpanded && (
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ ml: { xs: 0, sm: 6 } }}
          >
            {conv.recentMessages[conv.recentMessages.length - 1]?.direction ===
            "incoming"
              ? "👤"
              : "🤖"}{" "}
            {conv.recentMessages[
              conv.recentMessages.length - 1
            ]?.content?.substring(0, 80)}
            {(conv.recentMessages[conv.recentMessages.length - 1]?.content
              ?.length || 0) > 80
              ? "..."
              : ""}
          </Typography>
        )}

        {/* Expanded messages */}
        {isExpanded && (
          <Paper
            sx={{
              mt: 2,
              p: 2,
              maxHeight: 300,
              overflow: "auto",
              bgcolor: "background.default",
            }}
          >
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Últimas mensagens:
            </Typography>
            {conv.recentMessages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  mb: 1.5,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    msg.direction === "incoming"
                      ? theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.05)"
                        : "grey.100"
                      : theme.palette.mode === "dark"
                        ? "rgba(0,168,132,0.15)"
                        : "primary.50",
                  borderLeft: 3,
                  borderColor:
                    msg.direction === "incoming" ? "grey.500" : "primary.main",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={0.5}
                >
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color={
                      msg.direction === "incoming"
                        ? "text.primary"
                        : "primary.main"
                    }
                  >
                    {msg.direction === "incoming" ? "👤 Cliente" : "🤖 IA"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(msg.createdAt).toLocaleTimeString("pt-BR")}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </Typography>
                {msg.response && msg.direction === "incoming" && (
                  <Box
                    sx={{
                      mt: 1,
                      pl: 2,
                      borderLeft: 2,
                      borderColor: "success.main",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="success.main"
                      fontWeight="bold"
                    >
                      💬 Resposta da IA:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {msg.response}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Paper>
        )}

        {/* Footer */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={1}
          sx={{ ml: { xs: 0, sm: 6 } }}
        >
          {conv.summary && (
            <Typography variant="caption" color="text.secondary">
              📝 {conv.summary}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {new Date(conv.lastMessageAt).toLocaleString("pt-BR")}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
