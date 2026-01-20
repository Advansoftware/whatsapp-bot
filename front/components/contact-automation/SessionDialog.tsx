"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Send as SendIcon,
  Message as MessageIcon,
} from "@mui/icons-material";
import {
  ContactAutomationSession,
  SESSION_STATUS,
  NavigationLogEntry,
} from "./types";

interface SessionDialogProps {
  open: boolean;
  onClose: () => void;
  session: ContactAutomationSession | null;
  onCancel?: (sessionId: string) => void;
}

export default function SessionDialog({
  open,
  onClose,
  session,
  onCancel,
}: SessionDialogProps) {
  if (!session) return null;

  const statusInfo = SESSION_STATUS[session.status] || SESSION_STATUS.pending;
  const navigationLog = (session.navigationLog || []) as NavigationLogEntry[];
  const isActive = ["pending", "navigating", "waiting_response"].includes(
    session.status,
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={session.profile?.profilePicUrl}
          sx={{ width: 40, height: 40 }}
        >
          {session.profile?.contactName?.[0]}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{session.profile?.contactName}</Typography>
          <Typography variant="caption" color="text.secondary">
            Sessão de Automação
          </Typography>
        </Box>
        <Chip
          label={statusInfo.label}
          color={statusInfo.color}
          size="small"
          icon={
            session.status === "completed" ? (
              <CheckIcon />
            ) : session.status === "failed" || session.status === "timeout" ? (
              <ErrorIcon />
            ) : (
              <CircularProgress size={14} color="inherit" />
            )
          }
        />
      </DialogTitle>

      <DialogContent>
        {/* Objective */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Objetivo
          </Typography>
          <Typography variant="body1">{session.originalQuery}</Typography>
        </Paper>

        {/* Result (if completed) */}
        {session.result && (
          <Alert
            severity={session.success ? "success" : "error"}
            sx={{ mb: 2 }}
            icon={session.success ? <CheckIcon /> : <ErrorIcon />}
          >
            <Typography variant="subtitle2" gutterBottom>
              {session.success ? "Resultado" : "Erro"}
            </Typography>
            <Typography variant="body2">{session.result}</Typography>
            {session.resultSummary && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                {session.resultSummary}
              </Typography>
            )}
          </Alert>
        )}

        {/* Stats */}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Chip
            icon={<SendIcon />}
            label={`${session.messagesSent} enviadas`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<MessageIcon />}
            label={`${session.messagesReceived} recebidas`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<TimeIcon />}
            label={`Iniciado: ${formatTime(session.startedAt)}`}
            size="small"
            variant="outlined"
          />
          {session.completedAt && (
            <Chip
              icon={<TimeIcon />}
              label={`Finalizado: ${formatTime(session.completedAt)}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Navigation Log */}
        <Typography variant="subtitle2" gutterBottom>
          Histórico da Navegação
        </Typography>

        {navigationLog.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhuma interação registrada ainda.
          </Typography>
        ) : (
          <Stepper orientation="vertical" sx={{ mt: 1 }}>
            {navigationLog.map((log, index) => (
              <Step key={index} active completed>
                <StepLabel
                  icon={
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: 12,
                        bgcolor:
                          log.type === "bot" ? "primary.main" : "success.main",
                      }}
                    >
                      {log.type === "bot" ? "B" : "N"}
                    </Avatar>
                  }
                >
                  <Typography variant="caption" color="text.secondary">
                    {log.type === "bot" ? "Bot" : "Nós"} -{" "}
                    {formatTime(log.timestamp)}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: log.type === "bot" ? "grey.50" : "success.50",
                      maxHeight: 150,
                      overflow: "auto",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {log.message}
                    </Typography>
                  </Paper>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        )}
      </DialogContent>

      <DialogActions>
        {isActive && onCancel && (
          <Button color="error" onClick={() => onCancel(session.id)}>
            Cancelar Sessão
          </Button>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
