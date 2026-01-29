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
  Avatar,
} from "@mui/material";
import { Edit, Delete, Phone, CalendarMonth, AttachMoney, DragIndicator } from "@mui/icons-material";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DealCardProps {
  deal: any;
  onEdit: (deal: any) => void;
  onDelete: (id: string) => void;
  onClick?: (deal: any) => void;
  isMobile?: boolean;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onEdit, onDelete, onClick, isMobile = false }) => {
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent": return "Urgente";
      case "high": return "Alta";
      case "medium": return "Média";
      case "low": return "Baixa";
      default: return priority;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger click if user clicked on action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    if (onClick) onClick(deal);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      elevation={0}
      onClick={handleCardClick}
      sx={{
        mb: 1.5,
        cursor: onClick ? "pointer" : "grab",
        bgcolor: (theme) => theme.palette.mode === 'dark' 
          ? "rgba(255,255,255,0.04)" 
          : "#ffffff",
        border: "1px solid",
        borderColor: (theme) => theme.palette.mode === 'dark' 
          ? "rgba(255,255,255,0.08)" 
          : "rgba(0,0,0,0.06)",
        borderRadius: 2.5,
        overflow: "visible",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? "0 8px 24px rgba(0,0,0,0.4)" 
            : "0 8px 24px rgba(0,0,0,0.1)",
          borderColor: "primary.main",
          "& .drag-handle": {
            opacity: 1,
          },
          "& .action-buttons": {
            opacity: 1,
          },
        },
        "&:active": {
          cursor: "grabbing",
        },
        position: "relative",
      }}
    >
      {/* Drag Handle */}
      <Box
        {...attributes}
        {...listeners}
        className="drag-handle"
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: "opacity 0.2s",
          cursor: "grab",
          color: "text.secondary",
          "&:active": { cursor: "grabbing" },
        }}
      >
        <DragIndicator fontSize="small" />
      </Box>

      <CardContent sx={{ p: isMobile ? 1.5 : 2, pl: 3.5, "&:last-child": { pb: isMobile ? 1.5 : 2 } }}>
        {/* Header: Title + Actions */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography 
            variant="subtitle2" 
            fontWeight="600" 
            sx={{ 
              maxWidth: "85%",
              lineHeight: 1.3,
              fontSize: isMobile ? "0.85rem" : "0.875rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {deal.title}
          </Typography>
          <Box 
            className="action-buttons"
            sx={{ 
              opacity: isMobile ? 1 : 0, 
              transition: "opacity 0.2s",
              display: "flex",
              gap: 0.5,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(deal);
              }}
              sx={{ 
                width: 28, 
                height: 28,
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? "rgba(255,255,255,0.1)" 
                  : "rgba(0,0,0,0.04)",
              }}
            >
              <Edit sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Contact Info */}
        {deal.contact && (
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <Avatar 
              src={deal.contact.profilePicUrl} 
              sx={{ width: 24, height: 24, fontSize: "0.75rem" }}
            >
              {(deal.contact.pushName || deal.contact.remoteJid)?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {deal.contact.pushName || deal.contact.remoteJid?.split('@')[0]}
            </Typography>
          </Box>
        )}

        {/* Value - Prominent Display */}
        {deal.value > 0 && (
          <Box 
            sx={{ 
              mb: 1.5,
              py: 0.5,
              px: 1,
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? "rgba(16, 185, 129, 0.15)" 
                : "rgba(16, 185, 129, 0.08)",
              borderRadius: 1.5,
              display: "inline-block",
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: "success.main", 
                fontWeight: 700,
                fontSize: isMobile ? "0.9rem" : "1rem",
              }}
            >
              {formatCurrency(deal.value)}
            </Typography>
          </Box>
        )}

        {/* Footer: Priority + Date */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
          <Chip
            label={getPriorityLabel(deal.priority)}
            size="small"
            color={getPriorityColor(deal.priority) as any}
            variant="outlined"
            sx={{ 
              height: 22, 
              fontSize: "0.7rem", 
              fontWeight: 600,
              borderRadius: 1,
            }}
          />

          {deal.expectedCloseDate && (
            <Tooltip title={`Previsão: ${format(new Date(deal.expectedCloseDate), "dd 'de' MMMM", { locale: ptBR })}`}>
              <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? "rgba(255,255,255,0.05)" 
                    : "rgba(0,0,0,0.03)",
                }}
              >
                <CalendarMonth sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
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
