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
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
} from "@mui/material";
import {
  Edit,
  Delete,
  PlayArrow,
  Pause,
  ExpandMore,
  ExpandLess,
  Group,
  DataObject,
} from "@mui/icons-material";
import { GroupAutomation, AvailableGroup, ACTION_TYPES } from "./types";

interface AutomationsTableProps {
  automations: GroupAutomation[];
  groups: AvailableGroup[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleActive: (id: string) => void;
  onEdit: (automation: GroupAutomation) => void;
  onDelete: (id: string) => void;
  onViewData: (id: string) => void;
}

/**
 * Tabela de automações de grupo
 */
export default function AutomationsTable({
  automations,
  groups,
  expandedId,
  onToggleExpand,
  onToggleActive,
  onEdit,
  onDelete,
  onViewData,
}: AutomationsTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR");
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
              Grupo
            </TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
              Tipo
            </TableCell>
            <TableCell
              align="center"
              sx={{ display: { xs: "none", md: "table-cell" } }}
            >
              Dados
            </TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell
              align="center"
              sx={{ display: { xs: "none", lg: "table-cell" } }}
            >
              Validade
            </TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {automations.map((auto) => (
            <React.Fragment key={auto.id}>
              <TableRow hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{auto.name}</Typography>
                    {auto.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: { xs: "none", sm: "block" } }}
                      >
                        {auto.description.substring(0, 50)}...
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {auto.groupRemoteJid ? (
                    <Chip
                      size="small"
                      icon={<Group />}
                      label={
                        groups.find((g) => g.remoteJid === auto.groupRemoteJid)
                          ?.groupName || "Grupo"
                      }
                    />
                  ) : (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={auto.groupNameMatch || "Padrão"}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Chip
                    size="small"
                    label={
                      ACTION_TYPES.find((t) => t.value === auto.actionType)
                        ?.label || auto.actionType
                    }
                    color={
                      auto.actionType === "collect_data" ? "primary" : "default"
                    }
                  />
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ display: { xs: "none", md: "table-cell" } }}
                >
                  {auto._count?.collectedData ? (
                    <Chip
                      size="small"
                      icon={<DataObject />}
                      label={auto._count.collectedData}
                      color="success"
                      onClick={() => onViewData(auto.id)}
                      sx={{ cursor: "pointer" }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    icon={auto.isActive ? <PlayArrow /> : <Pause />}
                    label={auto.isActive ? "Ativo" : "Inativo"}
                    color={auto.isActive ? "success" : "default"}
                  />
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ display: { xs: "none", lg: "table-cell" } }}
                >
                  {auto.expiresAt ? (
                    new Date(auto.expiresAt) > new Date() ? (
                      <Typography variant="caption">
                        até{" "}
                        {new Date(auto.expiresAt).toLocaleDateString("pt-BR")}
                      </Typography>
                    ) : (
                      <Chip size="small" label="Expirado" color="error" />
                    )
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Sem limite
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 0.5,
                    }}
                  >
                    <Tooltip title="Ver detalhes">
                      <IconButton
                        size="small"
                        onClick={() => onToggleExpand(auto.id)}
                      >
                        {expandedId === auto.id ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={auto.isActive ? "Desativar" : "Ativar"}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleActive(auto.id)}
                      >
                        {auto.isActive ? <Pause /> : <PlayArrow />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => onEdit(auto)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(auto.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
              {/* Expanded details row */}
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 0 }}>
                  <Collapse in={expandedId === auto.id}>
                    <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Detalhes da Automação
                      </Typography>
                      <Box
                        display="grid"
                        gridTemplateColumns={{
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                          md: "repeat(3, 1fr)",
                        }}
                        gap={2}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Padrão de Captura
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {auto.capturePattern || "Qualquer mensagem"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Prioridade
                          </Typography>
                          <Typography variant="body2">
                            {auto.priority}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Criado em
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(auto.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                        <Chip
                          size="small"
                          label={auto.shouldReply ? "Responde" : "Não responde"}
                        />
                        <Chip
                          size="small"
                          label={
                            auto.replyOnlyOnce ? "1x por pessoa" : "Sempre"
                          }
                        />
                        <Chip
                          size="small"
                          label={auto.skipAiAfter ? "Pula IA" : "Continua IA"}
                        />
                      </Box>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
