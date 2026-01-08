import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
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
} from '@mui/material';
import {
  Close,
  Email,
  LocationOn,
  Business,
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

const memoryTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  fact: { label: "Fatos", icon: CheckCircle, color: "#60a5fa" }, // blue-400
  preference: { label: "Preferências", icon: Star, color: "#facc15" }, // yellow-400
  need: { label: "Necessidades", icon: Warning, color: "#f87171" }, // red-400
  objection: { label: "Objeções", icon: Block, color: "#fb923c" }, // orange-400
  interest: { label: "Interesses", icon: TrendingUp, color: "#4ade80" }, // green-400
  context: { label: "Contexto", icon: ChatBubble, color: "#a78bfa" }, // purple-400
};

const leadStatusConfig: Record<string, { label: string; color: string; bgcolor: string }> = {
  cold: { label: "Frio", color: "#60a5fa", bgcolor: "rgba(59, 130, 246, 0.2)" },
  warm: { label: "Morno", color: "#facc15", bgcolor: "rgba(234, 179, 8, 0.2)" },
  hot: { label: "Quente", color: "#fb923c", bgcolor: "rgba(249, 115, 22, 0.2)" },
  qualified: { label: "Qualificado", color: "#4ade80", bgcolor: "rgba(34, 197, 94, 0.2)" },
  unqualified: { label: "Não Qualificado", color: "#9ca3af", bgcolor: "rgba(107, 114, 128, 0.2)" },
};

// Função para renderizar markdown básico adaptado para MUI
const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    // Headers
    if (line.startsWith("### ")) {
      return (
        <Typography key={index} variant="subtitle1" sx={{ color: '#a78bfa', fontWeight: 'bold', mt: 2, mb: 1 }}>
          {line.replace("### ", "")}
        </Typography>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <Typography key={index} variant="h6" sx={{ color: '#d8b4fe', fontWeight: 'bold', mt: 2, mb: 1 }}>
          {line.replace("## ", "")}
        </Typography>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <Typography key={index} variant="h5" sx={{ color: '#e9d5ff', fontWeight: 'bold', mt: 2, mb: 1 }}>
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
          <Box component="span" key={i} sx={{ fontWeight: 'bold', color: '#e9edef' }}>
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
      <Typography key={index} variant="body2" sx={{ color: '#d1d7db', mb: 0.5 }}>
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
    if (!score) return "#9ca3af";
    if (score >= 80) return "#4ade80";
    if (score >= 60) return "#facc15";
    if (score >= 40) return "#fb923c";
    return "#f87171";
  };

  if (loading) {
    return (
      <Box sx={{ width: 340, height: '100%', bgcolor: '#111b21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#00a884' }} />
      </Box>
    );
  }

  const statusConfig = contact?.leadStatus ? leadStatusConfig[contact.leadStatus] : null;

  return (
    <Box sx={{ width: 340, height: '100%', bgcolor: '#111b21', borderLeft: '1px solid #2a3942', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: '#202c33', zIndex: 10 }}>
        <IconButton onClick={onClose} sx={{ mr: 2, color: '#aebac1' }}>
          <Close />
        </IconButton>
        <Typography variant="h6" sx={{ color: '#e9edef' }}>Detalhes do contato</Typography>
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
            backgroundColor: 'rgba(134, 150, 160, 0.3)',
            borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(134, 150, 160, 0.5)',
        },
      }}>
        {/* Profile Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, borderBottom: '1px solid #202c33' }}>
            <Avatar
            src={contact?.profilePicUrl}
            sx={{ width: 120, height: 120, mb: 2, border: '2px solid #00a884' }}
            />
            <Typography variant="h6" sx={{ color: '#e9edef', textAlign: 'center' }}>
            {contact?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#8696a0', mt: 0.5 }}>
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
                    color: '#e9edef', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid #2a3942'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#8696a0' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SmartToy sx={{ color: '#a78bfa' }} />
                            <Typography sx={{ fontWeight: 500 }}>Análise de Lead</Typography>
                        </Box>
                        {/* Qualify button inside summary */}
                        <Button 
                            variant="contained" 
                            size="small" 
                            onClick={handleQualify}
                            disabled={qualifying}
                            sx={{ 
                                bgcolor: '#00a884', 
                                '&:hover': { bgcolor: '#008f6f' },
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                minWidth: 'auto',
                                px: 1.5,
                                py: 0.5,
                                height: 24
                            }}
                        >
                            {qualifying ? '...' : (contact?.aiAnalyzedAt ? 'Reanalisar' : 'Qualificar')}
                        </Button>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(11, 20, 26, 0.3)', p: 2 }}>
                     <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 1, borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#8696a0' }}>Score</Typography>
                            <Typography variant="h5" sx={{ color: getScoreColor(contact?.leadScore), fontWeight: 'bold' }}>
                                {contact?.leadScore ?? '-'}
                            </Typography>
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 1, borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#8696a0' }}>Status</Typography>
                            {statusConfig ? (
                                <Chip 
                                    label={statusConfig.label} 
                                    size="small" 
                                    sx={{ 
                                        height: 20, 
                                        fontSize: '0.65rem', 
                                        bgcolor: statusConfig.bgcolor, 
                                        color: statusConfig.color,
                                        mt: 0.5
                                    }} 
                                />
                            ) : (
                                <Typography variant="body2" sx={{ color: '#e9edef' }}>-</Typography>
                            )}
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 1, borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#8696a0' }}>Msgs</Typography>
                            <Typography variant="h6" sx={{ color: '#e9edef' }}>
                                {contact?.totalMessages || 0}
                            </Typography>
                        </Box>
                    </Box>

                     {contact?.aiAnalysis && (
                        <Box sx={{ 
                            bgcolor: 'rgba(0,0,0,0.2)', 
                            p: 1.5, 
                            borderRadius: 1, 
                            maxHeight: 300, 
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'rgba(134, 150, 160, 0.3)',
                                borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                backgroundColor: 'rgba(134, 150, 160, 0.5)',
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
                    color: '#e9edef', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid #2a3942'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#8696a0' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#8696a0' }} />
                        <Typography sx={{ fontWeight: 500 }}>Informações</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <List dense>
                        <ListItem>
                            <ListItemIcon><Email sx={{ fontSize: 20, color: '#8696a0' }} /></ListItemIcon>
                            <ListItemText 
                                primary="Email" 
                                secondary={contact?.email || '-'} 
                                primaryTypographyProps={{ color: '#8696a0', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: '#e9edef' }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><Cake sx={{ fontSize: 20, color: '#8696a0' }} /></ListItemIcon>
                            <ListItemText 
                                primary="Nascimento" 
                                secondary={formatDate(contact?.birthDate)} 
                                primaryTypographyProps={{ color: '#8696a0', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: '#e9edef' }}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><LocationOn sx={{ fontSize: 20, color: '#8696a0' }} /></ListItemIcon>
                            <ListItemText 
                                primary="Localização" 
                                secondary={[contact?.city, contact?.state].filter(Boolean).join(', ') || '-'} 
                                primaryTypographyProps={{ color: '#8696a0', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: '#e9edef' }}
                            />
                        </ListItem>
                         <ListItem>
                            <ListItemIcon><Work sx={{ fontSize: 20, color: '#8696a0' }} /></ListItemIcon>
                            <ListItemText 
                                primary="Ocupação" 
                                secondary={contact?.occupation || '-'} 
                                primaryTypographyProps={{ color: '#8696a0', fontSize: '0.75rem' }}
                                secondaryTypographyProps={{ color: '#e9edef' }}
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
                    color: '#e9edef', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid #2a3942'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#8696a0' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToy sx={{ color: '#a78bfa' }} />
                        <Typography sx={{ fontWeight: 500 }}>Memória da IA</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, bgcolor: 'rgba(11, 20, 26, 0.3)' }}>
                    {contact?.memoriesByType && Object.entries(contact.memoriesByType).map(([type, memories]) => {
                        if (!memories || memories.length === 0) return null;
                        const config = memoryTypeConfig[type] || { label: type, icon: Star, color: '#fff' };
                        const Icon = config.icon;

                        return (
                            <Box key={type} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Icon sx={{ fontSize: 16, color: config.color }} />
                                    <Typography variant="subtitle2" sx={{ color: '#e9edef', fontSize: '0.8rem' }}>
                                        {config.label}
                                    </Typography>
                                </Box>
                                {memories.map((m, i) => (
                                    <Box key={i} sx={{ 
                                        p: 1, 
                                        mb: 0.5, 
                                        bgcolor: 'rgba(255,255,255,0.05)', 
                                        borderRadius: 1,
                                        fontSize: '0.75rem'
                                    }}>
                                        <Typography component="span" sx={{ color: config.color, fontWeight: 500 }}>
                                            {m.key}:
                                        </Typography>
                                        <Typography component="span" sx={{ color: '#d1d7db', ml: 1 }}>
                                            {m.value}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        );
                    })}
                    {(!contact?.memoriesByType || Object.values(contact.memoriesByType).every(arr => arr.length === 0)) && (
                        <Typography variant="body2" sx={{ color: '#8696a0', textAlign: 'center', py: 2 }}>
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
                    color: '#e9edef', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid #2a3942'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#8696a0' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Label sx={{ color: '#8696a0' }} />
                        <Typography sx={{ fontWeight: 500 }}>Tags</Typography>
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
                            sx={{
                            bgcolor: '#00a884',
                            color: '#ffffff',
                            '&:hover': { bgcolor: '#008f6f' },
                            }}
                        />
                        ))
                    ) : (
                        <Typography variant="body2" sx={{ color: '#8696a0' }}>
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
                    color: '#e9edef', 
                    boxShadow: 'none',
                    '&:before': { display: 'none' },
                    borderBottom: '1px solid #2a3942'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#8696a0' }} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Notes sx={{ color: '#8696a0' }} />
                        <Typography sx={{ fontWeight: 500 }}>Anotações</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ color: '#e9edef', whiteSpace: 'pre-wrap' }}>
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
