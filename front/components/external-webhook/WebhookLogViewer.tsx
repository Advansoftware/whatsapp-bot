"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  ContentCopy,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Add,
} from "@mui/icons-material";
import { WebhookApplicationLog } from "./types";

interface WebhookLogViewerProps {
  logs: WebhookApplicationLog[];
  loading?: boolean;
  onRefresh?: () => void;
  onCreateEventFromLog?: (payload: any) => void;
  onUseAsTemplate?: (log: WebhookApplicationLog) => void;
}

const WebhookLogViewer: React.FC<WebhookLogViewerProps> = ({
  logs,
  loading,
  onRefresh,
  onCreateEventFromLog,
  onUseAsTemplate,
}) => {
  const theme = useTheme();
  const [selectedLog, setSelectedLog] = useState<WebhookApplicationLog | null>(null);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle color="success" fontSize="small" />;
      case "ERROR":
        return <Error color="error" fontSize="small" />;
      case "NO_MATCH":
        return <Warning color="warning" fontSize="small" />;
      default:
        return <CheckCircle color="info" fontSize="small" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "Sucesso";
      case "ERROR":
        return "Erro";
      case "NO_MATCH":
        return "Sem Match";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case "SUCCESS":
        return "success";
      case "ERROR":
        return "error";
      case "NO_MATCH":
        return "warning";
      default:
        return "default";
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleViewPayload = (log: WebhookApplicationLog) => {
    setSelectedLog(log);
    setPayloadDialogOpen(true);
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  const handleCreateEvent = () => {
    if (selectedLog) {
      if (onUseAsTemplate) {
        onUseAsTemplate(selectedLog);
        setPayloadDialogOpen(false);
      } else if (onCreateEventFromLog) {
        onCreateEventFromLog(selectedLog.payload);
        setPayloadDialogOpen(false);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (logs.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          Nenhuma requisição recebida ainda
        </Typography>
        <Typography variant="caption" color="text.secondary">
          As requisições aparecerão aqui assim que você configurar o webhook na aplicação
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          📜 Histórico de Requisições ({logs.length})
        </Typography>
        {onRefresh && (
          <Tooltip title="Atualizar">
            <IconButton size="small" onClick={onRefresh}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Evento</TableCell>
              <TableCell>IP de Origem</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                sx={{
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <TableCell>
                  <Chip
                    icon={getStatusIcon(log.status)}
                    label={getStatusLabel(log.status)}
                    color={getStatusColor(log.status)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                    {formatDate(log.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {log.matchedEvent ? (
                    <Chip
                      label={log.matchedEvent.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                    {log.sourceIp || "-"}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver Payload">
                    <IconButton size="small" onClick={() => handleViewPayload(log)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copiar Payload">
                    <IconButton size="small" onClick={() => handleCopyPayload(log.payload)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Payload */}
      <Dialog
        open={payloadDialogOpen}
        onClose={() => setPayloadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Detalhes da Requisição
            </Typography>
            {selectedLog && (
              <Chip
                icon={getStatusIcon(selectedLog.status)}
                label={getStatusLabel(selectedLog.status)}
                color={getStatusColor(selectedLog.status)}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Box display="flex" gap={2} mb={2}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Data:</strong> {formatDate(selectedLog.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>IP:</strong> {selectedLog.sourceIp || "-"}
                </Typography>
                {selectedLog.matchedEvent && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Evento:</strong> {selectedLog.matchedEvent.name}
                  </Typography>
                )}
              </Box>

              {selectedLog.errorMessage && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${theme.palette.error.main}`,
                  }}
                >
                  <Typography variant="body2" color="error">
                    <strong>Erro:</strong> {selectedLog.errorMessage}
                  </Typography>
                </Paper>
              )}

              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Payload Recebido:
              </Typography>
              <Paper
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  overflow: "auto",
                  maxHeight: 400,
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(selectedLog.payload, null, 2)}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {(onUseAsTemplate || onCreateEventFromLog) && selectedLog && !selectedLog.matchedEvent && (
            <Button
              startIcon={<Add />}
              onClick={handleCreateEvent}
              color="primary"
            >
              Criar Evento com este Payload
            </Button>
          )}
          <Button
            startIcon={<ContentCopy />}
            onClick={() => selectedLog && handleCopyPayload(selectedLog.payload)}
          >
            Copiar
          </Button>
          <Button onClick={() => setPayloadDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebhookLogViewer;
