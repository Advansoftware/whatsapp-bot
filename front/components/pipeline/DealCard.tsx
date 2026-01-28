"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Edit, Delete, Phone, CalendarMonth } from "@mui/icons-material";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DealCardProps {
  deal: any;
  onEdit: (deal: any) => void;
  onDelete: (id: string) => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "Deal",
      deal,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      elevation={0}
      sx={{
        mb: 2,
        cursor: "grab",
        bgcolor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "#fff",
        border: "1px solid",
        borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        "&:hover": {
          boxShadow: (theme) => theme.palette.mode === 'dark' ? "0 4px 12px rgba(0,0,0,0.5)" : 3,
          borderColor: "primary.main",
        },
        position: "relative",
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: "80%" }}>
            {deal.title}
          </Typography>
          <Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(deal);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {deal.contact && (
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Phone fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {deal.contact.pushName || deal.contact.remoteJid.split('@')[0]}
            </Typography>
          </Box>
        )}

        {deal.value > 0 && (
          <Typography variant="body2" color="success.main" fontWeight="bold" gutterBottom>
            {formatCurrency(deal.value)}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Chip
            label={deal.priority || "normal"}
            size="small"
            color={getPriorityColor(deal.priority) as any}
            variant="outlined"
            sx={{ height: 20, fontSize: "0.7rem", textTransform: "capitalize" }}
          />

          {deal.expectedCloseDate && (
            <Tooltip title={`Fechamento: ${format(new Date(deal.expectedCloseDate), "dd/MM/yyyy")}`}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <CalendarMonth fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(deal.expectedCloseDate), "dd/MMM", { locale: ptBR })}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DealCard;
