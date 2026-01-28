"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Box, Typography, Button, IconButton, CircularProgress } from "@mui/material";
import { Add } from "@mui/icons-material";
import KanbanColumn from "./KanbanColumn";
import DealCard from "./DealCard";
import CreateDealModal from "./CreateDealModal";
import api from "../../lib/api";
import io, { Socket } from "socket.io-client";

const KanbanBoard: React.FC = () => {
  const [pipeline, setPipeline] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]); // Flat list of deals
  const [loading, setLoading] = useState(true);
  
  const [activeDeal, setActiveDeal] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStageId, setModalStageId] = useState<string>("");
  const [editingDeal, setEditingDeal] = useState<any | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Setup Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
        // Require movement of 10px before drag starts to prevent accidental drags on click
        activationConstraint: {
          distance: 10,
        },
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 5,
        },
    })
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const pipelines = await api.getPipelines();
      if (pipelines.length > 0) {
        // Use first pipeline for MVP
        const currentPipeline = pipelines[0];
        // Fetch full details
        const details = await api.getPipelineById(currentPipeline.id);
        setPipeline(details);
        setStages(details.stages);
        // Flatten deals
        const allDeals = details.stages.flatMap((s: any) => s.deals);
        setDeals(allDeals);
        
        // Connect socket
        if (!socketRef.current) {
            socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/crm`, {
                // transprots: ['websocket'], // opt
            });
            socketRef.current.emit('join_pipeline', currentPipeline.id);
            
            socketRef.current.on('deal_moved', (data) => {
                // Handle remote update (simplistic: reload or careful merge)
                // For MVP, simplistic reload if not dragging
                // if (!activeDeal) fetchData();
            });
        }
      } else {
        // Create default pipeline
        const newPipeline = await api.createPipeline({ name: "Vendas Padrão", isDefault: true });
        // Reload
        const details = await api.getPipelineById(newPipeline.id);
        setPipeline(details);
        setStages(details.stages);
        setDeals([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
        socketRef.current?.disconnect();
    };
  }, [fetchData]);

  // DND Handlers
  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = deals.find((d) => d.id === active.id);
    if (deal) setActiveDeal(deal);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isActiveDeal = active.data.current?.type === "Deal";
    // Find containers
    // If over a column
    const overColumn = stages.find(s => s.id === overId);
    
    // Logic handles visual updates only. Actual data update happens onDragEnd usually
    // But for Sortable we might need arrayMove here if we want real-time sort
    // Implementing simple column jumping for now.
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeDeal = deals.find(d => d.id === activeId);
    if (!activeDeal) return;

    // Check if dropped on a column
    const overColumn = stages.find(s => s.id === overId);
    // OR dropped on another deal
    const overDeal = deals.find(d => d.id === overId);
    
    let newStageId = activeDeal.stageId;
    let newIndex = 0; // default top

    if (overColumn) {
        // Dropped on a column (empty area)
        newStageId = overColumn.id;
        // Logic: append to end? Or check position?
        // Usually if dropped on column directly, it goes to end or start.
        // Let's say end.
        const dealsInStage = deals.filter(d => d.stageId === newStageId);
        newIndex = dealsInStage.length;
    } else if (overDeal) {
        // Dropped on another deal
        newStageId = overDeal.stageId;
        const dealsInStage = deals.filter(d => d.stageId === newStageId).sort((a, b) => a.position - b.position);
        const overIndex = dealsInStage.findIndex(d => d.id === overId);
        
        // Calculate index based on direction (not precise in simple logic without rects, usually overIndex)
        newIndex = overIndex;
        // In Sortable, we use arrayMove index
    }

    // Optimistic Update
    const oldStageId = activeDeal.stageId;
    
    // Update local state
    setDeals((prevDeals) => {
        const updated = prevDeals.map(d => {
            if (d.id === activeId) {
                return { ...d, stageId: newStageId };
            }
            return d;
        });
        return updated;
    });

    try {
        await api.moveDeal(activeId, newStageId, newIndex);
        // Refresh to ensure order is correct from server
        // fetchData(); 
    } catch (err) {
        console.error("Failed to move deal", err);
        // Revert?
        fetchData(); // Force sync
    }
  };
  
  const handleAddDeal = (stageId: string) => {
      setModalStageId(stageId);
      setEditingDeal(null);
      setIsModalOpen(true);
  };

  const handleCreateDeal = async (data: any) => {
      if (editingDeal) {
          await api.updateDeal(editingDeal.id, data);
      } else {
          await api.createDeal(data);
      }
      fetchData();
  };
  
  const handleDeleteDeal = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir?")) {
          await api.deleteDeal(id);
          setDeals((prev) => prev.filter(d => d.id !== id));
      }
  };

  if (loading && !pipeline) {
      return (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: "100vh" }}>
              <CircularProgress />
          </Box>
      );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <Box sx={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
        {/* Board Header */}
        <Box p={3} pb={2} display="flex" justifyContent="space-between" alignItems="center">
             <Typography variant="h5" fontWeight="bold">
                 {pipeline?.name || "Pipeline"}
             </Typography>
             <Button variant="outlined" startIcon={<Add />} onClick={() => handleAddDeal(stages[0]?.id)}>
                 Novo Negócio
             </Button>
        </Box>

        {/* Board Columns */}
        <Box
          sx={{
            flexGrow: 1,
            overflowX: "auto",
            display: "flex",
            gap: 2,
            px: 3,
            pb: 3,
            alignItems: "flex-start", // Top align
          }}
        >
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter((d) => d.stageId === stage.id).sort((a,b) => a.position - b.position)}
              onAddDeal={handleAddDeal}
              onEditDeal={(deal) => {
                  setEditingDeal(deal);
                  setModalStageId(deal.stageId);
                  setIsModalOpen(true);
              }}
              onDeleteDeal={handleDeleteDeal}
            />
          ))}
        </Box>
        
        <DragOverlay>
            {activeDeal ? (
               <DealCard deal={activeDeal} onEdit={() => {}} onDelete={() => {}} />
            ) : null}
        </DragOverlay>

        <CreateDealModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateDeal}
            initialStageId={modalStageId}
            dealToEdit={editingDeal}
        />
      </Box>
    </DndContext>
  );
};

export default KanbanBoard;
