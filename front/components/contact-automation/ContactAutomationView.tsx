"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Divider,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  SmartToy as BotIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import api from "../../lib/api";
import ProfileCard from "./ProfileCard";
import ProfileDialog from "./ProfileDialog";
import SessionDialog from "./SessionDialog";
import StartSessionDialog from "./StartSessionDialog";
import {
  ContactAutomationProfile,
  ContactAutomationSession,
  AvailableContact,
  CreateProfileDto,
  SESSION_STATUS,
} from "./types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ContactAutomationView() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preselectedContact, setPreselectedContact] = useState<AvailableContact | null>(null);

  // Data
  const [profiles, setProfiles] = useState<ContactAutomationProfile[]>([]);
  const [sessions, setSessions] = useState<ContactAutomationSession[]>([]);
  const [availableContacts, setAvailableContacts] = useState<
    AvailableContact[]
  >([]);

  // Dialogs
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] =
    useState<ContactAutomationProfile | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [viewingSession, setViewingSession] =
    useState<ContactAutomationSession | null>(null);
  const [startSessionDialogOpen, setStartSessionDialogOpen] = useState(false);
  const [startingProfile, setStartingProfile] =
    useState<ContactAutomationProfile | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, sessionsRes, contactsRes] = await Promise.all([
        api.get("/api/contact-automation/profiles"),
        api.get("/api/contact-automation/sessions"),
        api.get("/api/contact-automation/available-contacts"),
      ]);
      setProfiles(profilesRes.data);
      setSessions(sessionsRes.data);
      setAvailableContacts(contactsRes.data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh sessions every 10 seconds when there are active sessions
    const interval = setInterval(() => {
      const hasActive = sessions.some((s) =>
        ["pending", "navigating", "waiting_response"].includes(s.status),
      );
      if (hasActive) {
        api
          .get("/api/contact-automation/sessions")
          .then((res) => setSessions(res.data));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Check for URL params to pre-select a contact and open dialog
  useEffect(() => {
    const remoteJid = searchParams.get("remoteJid");
    const name = searchParams.get("name");
    
    if (remoteJid && !loading) {
      // Check if this contact already has a profile
      const existingProfile = profiles.find(p => p.remoteJid === remoteJid);
      if (existingProfile) {
        // Just show message or edit existing
        setEditingProfile(existingProfile);
        setProfileDialogOpen(true);
      } else {
        // Create preselected contact and open dialog
        setPreselectedContact({
          remoteJid,
          name: name || remoteJid.replace("@s.whatsapp.net", ""),
          profilePicUrl: undefined,
        });
        setProfileDialogOpen(true);
      }
    }
  }, [searchParams, loading, profiles]);

  // Handlers
  const handleCreateProfile = async (dto: CreateProfileDto) => {
    await api.post("/api/contact-automation/profiles", dto);
    await loadData();
  };

  const handleUpdateProfile = async (dto: CreateProfileDto) => {
    if (!editingProfile) return;
    await api.put(`/api/contact-automation/profiles/${editingProfile.id}`, dto);
    await loadData();
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm("Tem certeza que deseja excluir este perfil de automação?"))
      return;
    await api.delete(`/api/contact-automation/profiles/${profileId}`);
    await loadData();
  };

  const handleToggleProfile = async (profileId: string) => {
    await api.post(`/api/contact-automation/profiles/${profileId}/toggle`);
    await loadData();
  };

  const handleStartSession = async (profileId: string, query: string) => {
    await api.post("/api/contact-automation/sessions/start", {
      profileId,
      query,
    });
    await loadData();
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta sessão?")) return;
    await api.post(`/api/contact-automation/sessions/${sessionId}/cancel`);
    await loadData();
    setSessionDialogOpen(false);
  };

  const handleViewSession = async (sessionId: string) => {
    const res = await api.get(`/api/contact-automation/sessions/${sessionId}`);
    setViewingSession(res.data);
    setSessionDialogOpen(true);
  };

  const handleOpenStartDialog = (profile: ContactAutomationProfile) => {
    setStartingProfile(profile);
    setStartSessionDialogOpen(true);
  };

  const handleEditProfile = (profile: ContactAutomationProfile) => {
    setEditingProfile(profile);
    setProfileDialogOpen(true);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Automação de Contatos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure contatos para interação automática (bots de empresas,
            bancos, etc)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingProfile(null);
              setProfileDialogOpen(true);
            }}
          >
            Novo Perfil
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info Card */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "info.50" }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 Como funciona?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure perfis com dados de contatos (como Copasa, banco, etc) e
          seus campos pessoais (CPF, identificador). Depois, basta pedir para a
          Secretária IA: <strong>"pergunte na Copasa se estou sem água"</strong>
          e ela vai interagir automaticamente com o bot, fornecendo seus dados e
          te retornando o resultado final.
        </Typography>
      </Paper>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab
          icon={<BotIcon />}
          label={`Perfis (${profiles.length})`}
          iconPosition="start"
        />
        <Tab
          icon={<HistoryIcon />}
          label={`Sessões (${sessions.length})`}
          iconPosition="start"
        />
      </Tabs>

      {/* Profiles Tab */}
      <TabPanel value={tab} index={0}>
        {profiles.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <BotIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Nenhum perfil de automação
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Crie um perfil para automatizar interações com bots de empresas
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingProfile(null);
                  setProfileDialogOpen(true);
                }}
              >
                Criar Primeiro Perfil
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {profiles.map((profile) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={profile.id}>
                <ProfileCard
                  profile={profile}
                  onEdit={handleEditProfile}
                  onDelete={handleDeleteProfile}
                  onToggle={handleToggleProfile}
                  onStartSession={() => handleOpenStartDialog(profile)}
                  onViewSession={handleViewSession}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Sessions Tab */}
      <TabPanel value={tab} index={1}>
        {sessions.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <HistoryIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                Nenhuma sessão de automação
              </Typography>
              <Typography variant="body2" color="text.secondary">
                As sessões aparecerão aqui quando você ou a Secretária IA
                iniciar uma automação
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <List>
            {sessions.map((session, index) => {
              const statusInfo =
                SESSION_STATUS[session.status] || SESSION_STATUS.pending;
              return (
                <React.Fragment key={session.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <IconButton onClick={() => handleViewSession(session.id)}>
                        <ViewIcon />
                      </IconButton>
                    }
                    sx={{ cursor: "pointer" }}
                    onClick={() => handleViewSession(session.id)}
                  >
                    <ListItemAvatar>
                      <Avatar src={session.profile?.profilePicUrl}>
                        {session.profile?.contactName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="subtitle2">
                            {session.profile?.contactName}
                          </Typography>
                          <Chip
                            label={statusInfo.label}
                            color={statusInfo.color}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {session.objective}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(session.startedAt).toLocaleString(
                              "pt-BR",
                            )}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </TabPanel>

      {/* Dialogs */}
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => {
          setProfileDialogOpen(false);
          setEditingProfile(null);
          setPreselectedContact(null);
        }}
        onSave={editingProfile ? handleUpdateProfile : handleCreateProfile}
        profile={editingProfile}
        availableContacts={availableContacts}
        preselectedContact={preselectedContact}
      />

      <SessionDialog
        open={sessionDialogOpen}
        onClose={() => {
          setSessionDialogOpen(false);
          setViewingSession(null);
        }}
        session={viewingSession}
        onCancel={handleCancelSession}
      />

      <StartSessionDialog
        open={startSessionDialogOpen}
        onClose={() => {
          setStartSessionDialogOpen(false);
          setStartingProfile(null);
        }}
        onStart={handleStartSession}
        profile={startingProfile}
      />
    </Box>
  );
}
