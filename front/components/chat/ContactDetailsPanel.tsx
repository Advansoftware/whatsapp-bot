"use client";

import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close,
  Email,
  LocationOn,
  Notes,
  Label,
  ExpandMore,
  Star,
  SmartToy,
  Work,
  Cake,
  Person,
  CheckCircle,
  Warning,
  TrendingUp,
  ChatBubble,
  Block
} from '@mui/icons-material';
import api from '../../lib/api';

interface ContactDetailsPanelProps {
  remoteJid: string;
  contactName: string;
  profilePicUrl?: string | null;
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

const memoryTypeConfig: Record<string, { label: string; icon: any; color: "info" | "warning" | "error" | "success" | "secondary" | "primary" }> = {
  fact: { label: "Fatos", icon: CheckCircle, color: "info" },
  preference: { label: "Preferências", icon: Star, color: "warning" },
  need: { label: "Necessidades", icon: Warning, color: "error" },
  objection: { label: "Objeções", icon: Block, color: "warning" },
  interest: { label: "Interesses", icon: TrendingUp, color: "success" },
  context: { label: "Contexto", icon: ChatBubble, color: "secondary" },
};

const leadStatusConfig: Record<string, { label: string; color: "info" | "warning" | "error" | "success" | "default" }> = {
  cold: { label: "Frio", color: "info" },
  warm: { label: "Morno", color: "warning" },
  hot: { label: "Quente", color: "error" },
  qualified: { label: "Qualificado", color: "success" },
  unqualified: { label: "Não Qualificado", color: "default" },
};

// Função para renderizar markdown básico adaptado para MUI
const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    // Headers
    if (line.startsWith("### ")) {
      return (
        <Typography key={index} variant="subtitle1" color="secondary.main" fontWeight="bold" mt={2} mb={1}>
          {line.replace("### ", "")}
        </Typography>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <Typography key={index} variant="h6" color="secondary.light" fontWeight="bold" mt={2} mb={1}>
          {line.replace("## ", "")}
        </Typography>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <Typography key={index} variant="h5" color="secondary.light" fontWeight="bold" mt={2} mb={1}>
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
          <Box component="span" key={i} fontWeight="bold" color="text.primary">
            {part}
          </Box>
        ) : (
          part
        )
      );
    }

    // Empty line
    if (line.trim() === "") {
      return <Box key={index} sx={{ height: 8 }} />;
    }

    return (
      <Typography key={index} variant="body2" color="text.secondary" mb={0.5}>
        {formattedLine}
      </Typography>
    );
  });
};

const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = memo(({
  remoteJid,
  contactName,
  profilePicUrl,
  onClose,
}) => {
  const theme = useTheme();
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  
  // Use 'panel1' (Analysis) and 'panel2' (Info) as default expanded
  const [expanded, setExpanded] = useState<string | false>('panel1');

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true);
      try {
        const data = await api.getContactDetails(encodeURIComponent(remoteJid));
        // @ts-ignore
        setContact(data);
      } catch (err) {
        console.error('Failed to fetch contact details:', err);
        setContact({
          id: remoteJid,
          name: contactName,
          phone: remoteJid.replace('@s.whatsapp.net', ''),
          tags: [],
          totalMessages: 0,
          createdAt: new Date().toISOString(),
          profilePicUrl: profilePicUrl || undefined,
          memoriesByType: { fact: [], preference: [], need: [], objection: [], interest: [], context: [] }
        } as any);
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, [remoteJid, contactName, profilePicUrl]);

  const handleQualify = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    if (!contact) return;
    setQualifying(true);
    try {
      const result = await api.qualifyContact(encodeURIComponent(remoteJid));
      if (result.success) {
        setContact(prev => prev ? ({
          ...prev,
          leadScore: result.score,
          leadStatus: result.status,
          aiAnalysis: result.analysis,
          aiAnalyzedAt: new Date().toISOString()
        }) : null);
      }
    } catch (error) {
      console.error("Error qualifying contact:", error);
    } finally {
      setQualifying(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text.disabled";
    if (score >= 80) return "success.main";
    if (score >= 60) return "warning.main";
    if (score >= 40) return "warning.light";
    return "error.main";
  };

  if (loading) {
    return (
      <Box sx={{ width: 340, height: '100%', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: 1, borderColor: 'divider' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statusConfig = contact?.leadStatus ? leadStatusConfig[contact.leadStatus] : null;

  return (
    <Box sx={{ width: 340, height: '100%', bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'background.default', zIndex: 10, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={onClose} sx={{ mr: 2 }}>
          <Close />
        </IconButton>
        <Typography variant="h6" color="text.primary">Detalhes do contato</Typography>
      </Box>

      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
            width: '6px',
        },
        '&::-webkit-scrollbar-track': {
            background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.action.hover,
            borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme.palette.action.selected,
        },
      }}>
        {/* Profile Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, borderBottom: 1, borderColor: 'divider' }}>
            <Avatar
            src={contact?.profilePicUrl}
            sx={{ width: 120, height: 120, mb: 2, border: `2px solid ${theme.palette.primary.main}`, fontSize: '2rem' }}
            >
                 {contact?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Typography variant="h6" align="center" color="text.primary">
            {contact?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
            {contact?.phone}
            </Typography>
        </Box>

        {/* Accordions */}
        <Box>
            {/* Analysis Accordion */}
            <Accordion 
                expanded={expanded === 'panel1'} 
                onChange={handleChange('panel1')}
                disableGutters
                sx={{ 
                    bgcolor: 'transparent', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: 1,
                    borderColor: 'divider'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore color="action" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SmartToy color="secondary" />
                            <Typography fontWeight={500} color="text.primary">Análise de Lead</Typography>
                        </Box>
                        {/* Qualify button inside summary */}
                        <Button 
                            variant="contained" 
                            size="small" 
                            onClick={handleQualify}
                            disabled={qualifying}
                            sx={{ 
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                minWidth: 'auto',
                                px: 1.5,
                                py: 0.5,
                                height: 24,
                                color: 'white' // Always white for contrast
                            }}
                        >
                            {qualifying ? '...' : (contact?.aiAnalyzedAt ? 'Reanalisar' : 'Qualificar')}
                        </Button>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'action.hover', p: 2 }}>
                     <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
                        <Box sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, textAlign: 'center', boxShadow: 1 }}>
                            <Typography variant="caption" color="text.secondary">Score</Typography>
                            <Typography variant="h5" color={getScoreColor(contact?.leadScore)} fontWeight="bold">
                                {contact?.leadScore ?? '-'}
                            </Typography>
                        </Box>
                        <Box sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, textAlign: 'center', boxShadow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            {statusConfig ? (
                                <Chip 
                                    label={statusConfig.label} 
                                    size="small"
                                    color={statusConfig.color}
                                    sx={{ 
                                        height: 20, 
                                        fontSize: '0.65rem', 
                                        mt: 0.5
                                    }} 
                                />
                            ) : (
                                <Typography variant="body2" color="text.primary">-</Typography>
                            )}
                        </Box>
                        <Box sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, textAlign: 'center', boxShadow: 1 }}>
                            <Typography variant="caption" color="text.secondary">Msgs</Typography>
                            <Typography variant="h6" color="text.primary">
                                {contact?.totalMessages || 0}
                            </Typography>
                        </Box>
                    </Box>

                     {contact?.aiAnalysis && (
                        <Box sx={{ 
                            bgcolor: 'background.paper',
                            p: 1.5, 
                            borderRadius: 1, 
                            maxHeight: 300, 
                            overflowY: 'auto',
                            boxShadow: 1,
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: theme.palette.action.hover,
                                borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                backgroundColor: theme.palette.action.selected,
                            },
                        }}>
                            {renderMarkdown(contact.aiAnalysis)}
                        </Box>
                    )}
                </AccordionDetails>
            </Accordion>

            {/* Info Accordion */}
            <Accordion 
                expanded={expanded === 'panel2'} 
                onChange={handleChange('panel2')}
                disableGutters
                sx={{ 
                    bgcolor: 'transparent', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: 1,
                    borderColor: 'divider'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore color="action" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person color="action" />
                        <Typography fontWeight={500} color="text.primary">Informações</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><Email sx={{ fontSize: 20 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Email" 
                                secondary={contact?.email || '-'} 
                                primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: 'text.primary' }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><Cake sx={{ fontSize: 20 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Nascimento" 
                                secondary={formatDate(contact?.birthDate)} 
                                primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: 'text.primary' }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><LocationOn sx={{ fontSize: 20 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Localização" 
                                secondary={[contact?.city, contact?.state].filter(Boolean).join(', ') || '-'} 
                                primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: 'text.primary' }}
                            />
                        </ListItem>
                         <ListItem>
                            <ListItemIcon><Work sx={{ fontSize: 20 }} /></ListItemIcon>
                            <ListItemText 
                                primary="Ocupação" 
                                secondary={contact?.occupation || '-'} 
                                primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: 'text.primary' }}
                            />
                        </ListItem>
                    </List>
                </AccordionDetails>
            </Accordion>

            {/* Memories Accordion */}
            <Accordion 
                expanded={expanded === 'panel3'} 
                onChange={handleChange('panel3')}
                disableGutters
                sx={{ 
                    bgcolor: 'transparent', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: 1,
                    borderColor: 'divider'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore color="action" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToy color="secondary" />
                        <Typography fontWeight={500} color="text.primary">Memória da IA</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, bgcolor: 'action.hover' }}>
                    {contact?.memoriesByType && Object.entries(contact.memoriesByType).map(([type, memories]) => {
                        if (!memories || memories.length === 0) return null;
                        const config = memoryTypeConfig[type] || { label: type, icon: Star, color: "info" as const };
                        const Icon = config.icon;

                        return (
                            <Box key={type} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Icon sx={{ fontSize: 16 }} color={config.color} />
                                    <Typography variant="subtitle2" sx={{ fontSize: '0.8rem' }} color="text.primary">
                                        {config.label}
                                    </Typography>
                                </Box>
                                {memories.map((m, i) => (
                                    <Box key={i} sx={{ 
                                        p: 1, 
                                        mb: 0.5, 
                                        bgcolor: 'background.paper', 
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                        border: 1,
                                        borderColor: 'divider'
                                    }}>
                                        <Typography component="span" fontWeight={500} color={`${config.color}.main`}>
                                            {m.key}:
                                        </Typography>
                                        <Typography component="span" color="text.secondary" ml={1}>
                                            {m.value}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        );
                    })}
                    {(!contact?.memoriesByType || Object.values(contact.memoriesByType).every(arr => arr.length === 0)) && (
                        <Typography variant="body2" align="center" py={2} color="text.secondary">
                            Nenhuma memória registrada.
                        </Typography>
                    )}
                </AccordionDetails>
            </Accordion>

            {/* Tags Accordion */}
            <Accordion 
                expanded={expanded === 'panel4'} 
                onChange={handleChange('panel4')}
                disableGutters
                sx={{ 
                    bgcolor: 'transparent', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: 1,
                    borderColor: 'divider'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore color="action" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Label color="action" />
                        <Typography fontWeight={500} color="text.primary">Tags</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {contact?.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            color="primary"
                        />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                        Nenhuma tag
                        </Typography>
                    )}
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Notes Accordion */}
            <Accordion 
                expanded={expanded === 'panel5'} 
                onChange={handleChange('panel5')}
                disableGutters
                sx={{ 
                    bgcolor: 'transparent', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: 1,
                    borderColor: 'divider'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore color="action" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Notes color="action" />
                        <Typography fontWeight={500} color="text.primary">Anotações</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {contact?.notes || 'Nenhuma anotação'}
                    </Typography>
                </AccordionDetails>
            </Accordion>
        </Box>
     </Box>
   </Box>
  );
});

export default ContactDetailsPanel;
