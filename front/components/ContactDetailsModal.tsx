"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
  Tag,
  Brain,
  Star,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  CircularProgress,
  Chip,
  Button,
  Grid,
  Divider,
  Collapse,
  useTheme,
  alpha,
  Avatar,
  Stack,
  Card,
  CardHeader,
  CardContent,
} from "@mui/material";
import api from "../lib/api";

// Função para renderizar markdown básico
const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    // Headers
    if (line.startsWith("### ")) {
      return (
        <Typography key={index} variant="subtitle1" fontWeight="bold" color="primary" mt={2} mb={1}>
          {line.replace("### ", "")}
        </Typography>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <Typography key={index} variant="h6" fontWeight="bold" color="primary" mt={2} mb={1}>
          {line.replace("## ", "")}
        </Typography>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <Typography key={index} variant="h5" fontWeight="bold" color="primary" mt={2} mb={1}>
          {line.replace("# ", "")}
        </Typography>
      );
    }

    // Bold text
    let formattedLine: React.ReactNode = line;
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      formattedLine = parts.map((part, i) =>
        i % 2 === 1 ? (
          <b key={i}>
            {part}
          </b>
        ) : (
          part
        )
      );
    }

    // Empty line
    if (line.trim() === "") {
      return <br key={index} />;
    }

    return (
      <Typography key={index} variant="body2" color="text.secondary" mb={0.5}>
        {formattedLine}
      </Typography>
    );
  });
};

interface ContactDetailsModalProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ContactDetails {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags: string[];
  birthDate?: string;
  gender?: string;
  city?: string;
  state?: string;
  university?: string;
  course?: string;
  occupation?: string;
  leadScore?: number;
  leadStatus?: string;
  aiAnalysis?: string;
  aiAnalyzedAt?: string;
  totalMessages: number;
  firstContactAt?: string;
  createdAt: string;
  profilePicUrl?: string;
  memoriesByType: {
    fact: Array<{ key: string; value: string; confidence: number }>;
    preference: Array<{ key: string; value: string; confidence: number }>;
    need: Array<{ key: string; value: string; confidence: number }>;
    objection: Array<{ key: string; value: string; confidence: number }>;
    interest: Array<{ key: string; value: string; confidence: number }>;
    context: Array<{ key: string; value: string; confidence: number }>;
  };
}

const memoryTypeLabels: Record<
  string,
  { label: string; icon: any; color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" }
> = {
  fact: { label: "Fatos", icon: CheckCircle, color: "info" },
  preference: { label: "Preferências", icon: Star, color: "warning" },
  need: { label: "Necessidades", icon: AlertCircle, color: "error" },
  objection: { label: "Objeções", icon: X, color: "warning" },
  interest: { label: "Interesses", icon: TrendingUp, color: "success" },
  context: { label: "Contexto", icon: MessageCircle, color: "secondary" },
};

const leadStatusColors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  cold: "info",
  warm: "warning",
  hot: "error",
  qualified: "success",
  unqualified: "default",
};

const leadStatusLabels: Record<string, string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
  qualified: "Qualificado",
  unqualified: "Não Qualificado",
};

export default function ContactDetailsModal({
  contactId,
  isOpen,
  onClose,
}: ContactDetailsModalProps) {
  const theme = useTheme();
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["info", "memories"])
  );

  useEffect(() => {
    if (isOpen && contactId) {
      loadContactDetails();
    }
  }, [isOpen, contactId]);

  const loadContactDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getContactDetails(contactId);
      setContact(data);
    } catch (error) {
      console.error("Error loading contact details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualify = async () => {
    if (!contact) return;

    setQualifying(true);
    try {
      const result = await api.qualifyContact(contact.id);
      if (result.success) {
        setContact((prev) =>
          prev
            ? {
                ...prev,
                leadScore: result.score,
                leadStatus: result.status,
                aiAnalysis: result.analysis,
                aiAnalyzedAt: new Date().toISOString(),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error qualifying contact:", error);
    } finally {
      setQualifying(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text.disabled";
    if (score >= 80) return "success.main";
    if (score >= 60) return "warning.main";
    if (score >= 40) return "warning.light";
    return "error.main";
  };

  const getTotalMemories = () => {
    if (!contact) return 0;
    return Object.values(contact.memoriesByType).reduce(
      (acc, arr) => acc + arr.length,
      0
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        }
      }}
    >
        <Box sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(to right, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`
        }}>
          <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                src={contact?.profilePicUrl || undefined}
                sx={{
                    width: 64,
                    height: 64,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                }}
              >
                 {contact?.name?.charAt(0)?.toUpperCase() || "?"}
              </Avatar>
            <Box>
                <Typography variant="h5" fontWeight="bold">
                  {contact?.name || "Carregando..."}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                  <Phone size={16} />
                  <Typography variant="body2">
                    {contact?.phone}
                  </Typography>
                </Box>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <X size={24} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : contact ? (
            <>
              {/* Lead Score Section */}
              <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  bgcolor: alpha(theme.palette.background.default, 0.5) 
              }}>
                <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Brain size={20} color={theme.palette.primary.main} />
                    <Typography variant="h6" fontWeight="bold">
                      Análise de Lead
                    </Typography>
                  </Box>
                  <Button
                    onClick={handleQualify}
                    disabled={qualifying}
                    variant="contained"
                    size="small"
                    startIcon={qualifying ? <CircularProgress size={16} color="inherit" /> : <Sparkles size={16} />}
                    sx={{
                        background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        color: 'white',
                    }}
                  >
                    {qualifying ? "Analisando..." : (contact.aiAnalyzedAt ? "Reanalisar" : "Qualificar Lead")}
                  </Button>
                </Box>

                <Grid container spacing={2} mb={3}>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'background.paper',
                        textAlign: 'center',
                        boxShadow: 1
                    }}>
                      <Typography variant="caption" color="text.secondary">Score</Typography>
                      <Typography variant="h4" fontWeight="bold" color={getScoreColor(contact.leadScore)}>
                        {contact.leadScore ?? "-"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'background.paper',
                        textAlign: 'center',
                        boxShadow: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                      <Typography variant="caption" color="text.secondary" mb={1}>Status</Typography>
                      {contact.leadStatus ? (
                        <Chip
                          label={leadStatusLabels[contact.leadStatus] || contact.leadStatus}
                          color={leadStatusColors[contact.leadStatus] || "default"}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : (
                        <Typography color="text.disabled">-</Typography>
                      )}
                    </Box>
                  </Grid>
                   <Grid size={{ xs: 4 }}>
                    <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'background.paper',
                        textAlign: 'center',
                        boxShadow: 1
                    }}>
                      <Typography variant="caption" color="text.secondary">Mensagens</Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {contact.totalMessages}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {contact.aiAnalysis && (
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                    <Box>
                      {renderMarkdown(contact.aiAnalysis)}
                    </Box>
                    {contact.aiAnalyzedAt && (
                      <Box display="flex" alignItems="center" gap={1} mt={2} pt={2} borderTop={1} borderColor="divider">
                        <Clock size={12} color={theme.palette.text.secondary} />
                        <Typography variant="caption" color="text.secondary">
                          Analisado em {new Date(contact.aiAnalyzedAt).toLocaleString("pt-BR")}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {!contact.aiAnalysis && (
                  <Typography variant="body2" color="text.secondary" align="center" py={2}>
                    Clique em "Qualificar Lead" para gerar uma análise com IA
                  </Typography>
                )}
                </CardContent>
              </Card>

              {/* Info Section */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <Box 
                    component="div"
                    onClick={() => toggleSection("info")} 
                    sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', bgcolor: 'action.hover' }}
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <User size={20} color={theme.palette.info.main} />
                        <Typography variant="h6">Informações</Typography>
                    </Box>
                    {expandedSections.has("info") ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Box>
                <Collapse in={expandedSections.has("info")}>
                    <CardContent>
                      <Grid container spacing={3}>
                        {[
                            { icon: Mail, label: 'Email', value: contact.email },
                            { icon: Calendar, label: 'Nascimento', value: contact.birthDate ? `${formatDate(contact.birthDate)} (${calculateAge(contact.birthDate)} anos)` : null },
                            { icon: User, label: 'Gênero', value: contact.gender, capitalize: true },
                            { icon: MapPin, label: 'Localização', value: [contact.city, contact.state].filter(Boolean).join(", ") },
                            { icon: GraduationCap, label: 'Universidade', value: contact.university },
                            { icon: GraduationCap, label: 'Curso', value: contact.course },
                            { icon: Briefcase, label: 'Ocupação', value: contact.occupation },
                            { icon: Clock, label: 'Primeiro Contato', value: formatDate(contact.firstContactAt) },
                        ].map((item, i) => (
                            item.value ? (
                                <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                    <Box display="flex" gap={2}>
                                        <item.icon size={18} color={theme.palette.text.secondary} />
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
                                            <Typography variant="body2" sx={{ textTransform: item.capitalize ? 'capitalize' : 'none' }}>{item.value}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            ) : null
                        ))}
                      </Grid>
                      
                      {contact.tags && contact.tags.length > 0 && (
                          <Box mt={3}>
                             <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Tag size={16} color={theme.palette.text.secondary} />
                                <Typography variant="caption" color="text.secondary">Tags</Typography>
                             </Box>
                             <Box display="flex" flexWrap="wrap" gap={1}>
                                {contact.tags.map((tag) => (
                                    <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
                                ))}
                             </Box>
                          </Box>
                      )}

                      {contact.notes && (
                          <Box mt={3} p={2} bgcolor="action.hover" borderRadius={2}>
                              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Notas</Typography>
                              <Typography variant="body2">{contact.notes}</Typography>
                          </Box>
                      )}
                    </CardContent>
                </Collapse>
              </Card>

              {/* AI Memory Section */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                 <Box 
                    component="div"
                    onClick={() => toggleSection("memories")} 
                    sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', bgcolor: 'action.hover' }}
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <Brain size={20} color={theme.palette.secondary.main} />
                        <Typography variant="h6">Memória da IA</Typography>
                        <Chip label={`${getTotalMemories()} itens`} size="small" color="secondary" variant="outlined" />
                    </Box>
                    {expandedSections.has("memories") ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Box>
                <Collapse in={expandedSections.has("memories")}>
                  <CardContent>
                     <Stack spacing={2}>
                        {Object.entries(contact.memoriesByType).map(([type, memories]) => {
                             if (memories.length === 0) return null;
                             const config = memoryTypeLabels[type];
                             const Icon = config?.icon || Brain;

                             return (
                                 <Box key={type}>
                                     <Box display="flex" alignItems="center" gap={1} mb={1}>
                                         <Icon size={16} color={config.color && config.color !== 'default' ? theme.palette[config.color].main : theme.palette.info.main} />
                                         <Typography variant="subtitle2" fontWeight="bold">{config.label}</Typography>
                                         <Typography variant="caption" color="text.secondary">({memories.length})</Typography>
                                     </Box>
                                     <Stack spacing={1} pl={3}>
                                         {memories.map((memory, i) => (
                                             <Box key={i} p={1.5} bgcolor="background.paper" borderRadius={1} border={1} borderColor="divider">
                                                 <Typography variant="body2">
                                                     <Box component="span" color="primary.main" fontWeight="medium">{memory.key}: </Box>
                                                     {memory.value}
                                                 </Typography>
                                                  {memory.confidence < 0.8 && (
                                                      <Typography variant="caption" color="text.disabled">
                                                          ({Math.round(memory.confidence * 100)}% confiança)
                                                      </Typography>
                                                  )}
                                             </Box>
                                         ))}
                                     </Stack>
                                 </Box>
                             )
                        })}
                        {getTotalMemories() === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" py={2}>
                                Nenhuma memória registrada ainda.
                            </Typography>
                        )}
                     </Stack>
                  </CardContent>
                </Collapse>
              </Card>
            </>
          ) : (
            <Typography align="center" color="text.secondary" py={4}>
              Erro ao carregar contato
            </Typography>
          )}
        </Stack>
        </DialogContent>
    </Dialog>
  );
}
