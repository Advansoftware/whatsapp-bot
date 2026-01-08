import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
  FormControlLabel,
  Checkbox,
  Stack,
  alpha,
} from "@mui/material";
import {
  PersonAdd,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  AdminPanelSettings,
  SupervisorAccount,
  SupportAgent,
} from "@mui/icons-material";
import ConfirmDialog, { ConfirmDialogProps } from "../common/ConfirmDialog";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: "admin" | "manager" | "agent";
  isActive: boolean;
  createdAt: string;
  activeConversations: number;
}

export const TeamView: React.FC = () => {
  const theme = useTheme();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<
    Omit<ConfirmDialogProps, "open" | "onClose"> & { open: boolean }
  >({
    open: false,
    title: "",
    content: "",
    onConfirm: async () => {},
  });

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent" as "admin" | "manager" | "agent",
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.get("/api/team/members");
      setMembers(data);
    } catch (error) {
      console.error("Erro ao carregar equipe:", error);
      setError("Erro ao carregar lista de equipe.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    try {
      await api.post("/api/team/members", newMember);
      setShowAddModal(false);
      setNewMember({ name: "", email: "", password: "", role: "agent" });
      setSuccess("Membro adicionado com sucesso!");
      loadMembers();
    } catch (error: any) {
      setError(error.response?.data?.message || "Erro ao adicionar membro");
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      await api.put(`/api/team/members/${editingMember.id}`, {
        name: editingMember.name,
        role: editingMember.role,
        isActive: editingMember.isActive,
      });
      setEditingMember(null);
      setSuccess("Membro atualizado com sucesso!");
      loadMembers();
    } catch (error: any) {
      setError(error.response?.data?.message || "Erro ao atualizar membro");
    }
  };

  const handleRemoveMember = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Remover Membro",
      content: "Tem certeza que deseja remover este membro da equipe?",
      confirmText: "Remover",
      cancelText: "Cancelar",
      confirmColor: "error",
      onConfirm: async () => {
        try {
          await api.delete(`/api/team/members/${id}`);
          setSuccess("Membro removido com sucesso!");
          loadMembers();
        } catch (error: any) {
          setError(error.response?.data?.message || "Erro ao remover membro");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <AdminPanelSettings fontSize="small" />;
      case "manager":
        return <SupervisorAccount fontSize="small" />;
      default:
        return <SupportAgent fontSize="small" />;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: "Admin",
      manager: "Gerente",
      agent: "Atendente",
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: "error",
      manager: "info",
      agent: "success",
    };
    return colors[role as keyof typeof colors] || "default";
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        title={confirmDialog.title}
        content={confirmDialog.content}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmColor={confirmDialog.confirmColor}
        onConfirm={confirmDialog.onConfirm}
      />

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Equipe
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie os membros da sua equipe
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setShowAddModal(true)}
        >
          Adicionar Membro
        </Button>
      </Box>

      {/* Team Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total de Membros
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {members.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Admins
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {members.filter((m) => m.role === "admin").length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Gerentes
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {members.filter((m) => m.role === "manager").length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Atendentes
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {members.filter((m) => m.role === "agent").length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Members List */}
      <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Membro</TableCell>
                <TableCell>Cargo</TableCell>
                <TableCell>Conversas Ativas</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar src={member.picture} alt={member.name}>
                        {member.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {member.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getRoleIcon(member.role)}
                      label={getRoleLabel(member.role)}
                      color={getRoleColor(member.role) as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {member.activeConversations}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {member.isActive ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Ativo"
                        color="success"
                        size="small"
                        variant="soft"
                      />
                    ) : (
                      <Chip
                        icon={<Cancel />}
                        label="Inativo"
                        color="default"
                        size="small"
                        variant="soft"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton
                        onClick={() => setEditingMember({ ...member })}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton
                        onClick={() => handleRemoveMember(member.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Modal */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Adicionar Membro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Nome"
              value={newMember.name}
              onChange={(e) =>
                setNewMember({ ...newMember, name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={newMember.email}
              onChange={(e) =>
                setNewMember({ ...newMember, email: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              value={newMember.password}
              onChange={(e) =>
                setNewMember({ ...newMember, password: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Cargo</InputLabel>
              <Select
                value={newMember.role}
                label="Cargo"
                onChange={(e) =>
                  setNewMember({ ...newMember, role: e.target.value as any })
                }
              >
                <MenuItem value="agent">Atendente</MenuItem>
                <MenuItem value="manager">Gerente</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddMember}>
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Editar Membro</DialogTitle>
        <DialogContent>
          {editingMember && (
            <Stack spacing={2} pt={1}>
              <TextField
                label="Nome"
                value={editingMember.name}
                onChange={(e) =>
                  setEditingMember({ ...editingMember, name: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Cargo</InputLabel>
                <Select
                  value={editingMember.role}
                  label="Cargo"
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      role: e.target.value as any,
                    })
                  }
                >
                  <MenuItem value="agent">Atendente</MenuItem>
                  <MenuItem value="manager">Gerente</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingMember.isActive}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        isActive: e.target.checked,
                      })
                    }
                  />
                }
                label="Usuário ativo"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingMember(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdateMember}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
