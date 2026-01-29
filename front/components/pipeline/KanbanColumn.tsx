"use client";

import React, { useMemo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Box, Typography, Paper, IconButton, Chip, Button } from "@mui/material";
import { Add, MoreHoriz } from "@mui/icons-material";
import DealCard from "./DealCard";

interface KanbanColumnProps {
  stage: any;
  deals: any[];
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: any) => void;
  onDeleteDeal: (id: string) => void;
  onDealClick?: (deal: any) => void;
  isMobile?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  deals,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
  onDealClick,
  isMobile = false,
}) => {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: {
      type: "Column",
      stage,
    },
  });

  const dealsIds = useMemo(() => deals.map((deal) => deal.id), [deals]);

  const totalValue = deals.reduce((acc, deal) => acc + (Number(deal.value) || 0), 0);

  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        width: isMobile ? 280 : 320,
        minWidth: isMobile ? 280 : 320,
        bgcolor: (theme) => theme.palette.mode === 'dark' 
          ? "rgba(255,255,255,0.03)" 
          : "linear-gradient(180deg, #f8f9fa 0%, #f1f3f4 100%)",
        background: (theme) => theme.palette.mode === 'dark'
          ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)"
          : "linear-gradient(180deg, #f8f9fa 0%, #f1f3f4 100%)",
        height: "100%",
        maxHeight: isMobile ? "calc(100vh - 140px)" : "calc(100vh - 120px)",
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        border: (theme) => theme.palette.mode === 'dark' 
          ? "1px solid rgba(255,255,255,0.08)" 
          : "1px solid rgba(0,0,0,0.06)",
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? "0 4px 12px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {/* Header */}
      <Box 
        p={2} 
        sx={{ 
          borderBottom: "1px solid",
          borderColor: (theme) => theme.palette.mode === 'dark' 
            ? "rgba(255,255,255,0.08)" 
            : "rgba(0,0,0,0.08)",
          background: (theme) => theme.palette.mode === 'dark'
            ? "rgba(255,255,255,0.02)"
            : "rgba(255,255,255,0.5)",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
                sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    bgcolor: stage.color || "primary.main",
                    boxShadow: `0 0 8px ${stage.color || '#3b82f6'}40`,
                }}
            />
            <Typography 
              variant="subtitle1" 
              fontWeight="bold"
              sx={{ 
                letterSpacing: '-0.02em',
                fontSize: isMobile ? '0.9rem' : '1rem',
              }}
            >
              {stage.name}
            </Typography>
            <Chip 
              label={deals.length} 
              size="small" 
              sx={{ 
                height: 22, 
                fontSize: "0.75rem",
                fontWeight: 600,
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? "rgba(255,255,255,0.1)" 
                  : "rgba(0,0,0,0.08)",
              }} 
            />
          </Box>
        </Box>
        {totalValue > 0 && (
            <Typography 
              variant="caption" 
              fontWeight="600"
              sx={{
                color: "success.main",
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? "rgba(16, 185, 129, 0.15)" 
                  : "rgba(16, 185, 129, 0.1)",
                px: 1,
                py: 0.25,
                borderRadius: 1,
                display: "inline-block",
              }}
            >
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
            </Typography>
        )}
      </Box>

      {/* Cards List */}
      <Box
        sx={{
          p: 1.5,
          flexGrow: 1,
          overflowY: "auto",
          minHeight: 100,
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.15)",
            borderRadius: 3,
          },
        }}
      >
        <SortableContext items={dealsIds} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
              onClick={onDealClick}
              isMobile={isMobile}
            />
          ))}
        </SortableContext>
        
        {deals.length === 0 && (
          <Box 
            sx={{ 
              py: 4, 
              textAlign: "center",
              opacity: 0.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Arraste cards aqui
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer / Add Action */}
      <Box p={1.5} pt={0}>
        <Button
            fullWidth
            onClick={() => onAddDeal(stage.id)}
            sx={{
                borderRadius: 2,
                justifyContent: "flex-start",
                color: "text.secondary",
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                py: 1,
                "&:hover": { 
                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? "rgba(255,255,255,0.05)" 
                    : "rgba(0,0,0,0.04)", 
                  color: "primary.main" 
                }
            }}
        >
            <Add fontSize="small" sx={{ mr: 1 }} />
            Novo Negócio
        </Button>
      </Box>
    </Paper>
  );
};

export default KanbanColumn;
