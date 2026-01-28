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
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  deals,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
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
        width: 320,
        minWidth: 320,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "#f4f5f7",
        height: "100%",
        maxHeight: "calc(100vh - 120px)",
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        border: (theme) => theme.palette.mode === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "none",
      }}
    >
      {/* Header */}
      <Box p={2} borderBottom="1px solid" borderColor="divider">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
                sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: stage.color || "primary.main",
                }}
            />
            <Typography variant="subtitle1" fontWeight="bold">
              {stage.name}
            </Typography>
            <Chip label={deals.length} size="small" sx={{ height: 20, fontSize: "0.75rem" }} />
          </Box>
          <IconButton size="small">
            <MoreHoriz />
          </IconButton>
        </Box>
        {totalValue > 0 && (
            <Typography variant="caption" color="text.secondary" fontWeight="500">
                Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
            </Typography>
        )}
      </Box>

      {/* Cards List */}
      <Box
        sx={{
          p: 1.5,
          flexGrow: 1,
          overflowY: "auto",
          minHeight: 100, // Important for drag-over empty column
        }}
      >
        <SortableContext items={dealsIds} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={onEditDeal}
              onDelete={onDeleteDeal}
            />
          ))}
        </SortableContext>
      </Box>

      {/* Footer / Add Action */}
      <Box p={1.5} pt={0}>
        <Button
            fullWidth
            onClick={() => onAddDeal(stage.id)}
            sx={{
                borderRadius: 1,
                justifyContent: "flex-start",
                color: "text.secondary",
                fontSize: "0.875rem",
                "&:hover": { bgcolor: "rgba(0,0,0,0.04)", color: "primary.main" }
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
