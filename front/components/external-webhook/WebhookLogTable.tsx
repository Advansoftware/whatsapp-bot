"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import { Visibility, CheckCircle, Error, Schedule } from "@mui/icons-material";
import { WebhookLog } from "./types";

interface WebhookLogTableProps {
  logs: WebhookLog[];
  onViewPayload: (log: WebhookLog) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  github: "#24292e",
  gitlab: "#fc6d26",
  coolify: "#6875f5",
  "uptime-kuma": "#5cdd8b",
  n8n: "#ff6d5a",
};

const WebhookLogTable: React.FC<WebhookLogTableProps> = ({ logs, onViewPayload }) => {
  const theme = useTheme();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle fontSize="small" color="success" />;
      case "failed":
        return <Error fontSize="small" color="error" />;
      default:
        return <Schedule fontSize="small" color="action" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR");
  };

  if (logs.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        py={6}
        bgcolor={alpha(theme.palette.background.paper, 0.4)}
        borderRadius={2}
      >
        <Typography color="text.secondary">
          Nenhum log de webhook ainda
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data/Hora</TableCell>
            <TableCell>Fonte</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} hover>
              <TableCell>
                <Typography variant="body2">{formatDate(log.createdAt)}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={log.source || "Desconhecido"}
                  size="small"
                  sx={{
                    bgcolor: log.source
                      ? SOURCE_COLORS[log.source] || theme.palette.grey[600]
                      : theme.palette.grey[600],
                    color: "#fff",
                  }}
                />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {getStatusIcon(log.status)}
                  <Typography variant="body2" textTransform="capitalize">
                    {log.status}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Ver payload">
                  <IconButton size="small" onClick={() => onViewPayload(log)}>
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WebhookLogTable;
