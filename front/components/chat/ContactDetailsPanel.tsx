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
  Collapse,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  Phone,
  Email,
  LocationOn,
  Business,
  Notes,
  Label,
  ExpandMore,
  ExpandLess,
  Block,
  Star,
  History,
  SmartToy,
} from '@mui/icons-material';
import api from '../../lib/api';

interface ContactDetailsPanelProps {
  remoteJid: string;
  contactName: string;
  profilePicUrl?: string | null;
  onClose: () => void;
}

interface ContactData {
  id: string;
  remoteJid: string;
  pushName?: string;
  profilePicUrl?: string;
  phone?: string;
  email?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  lastMessageAt?: string;
  totalMessages?: number;
  aiEnabled?: boolean;
}

/**
 * Contact details panel - CRM style sidebar
 * Shows contact info, tags, notes, and conversation history summary
 */
const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = memo(({
  remoteJid,
  contactName,
  profilePicUrl,
  onClose,
}) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    tags: true,
    notes: false,
    history: false,
  });

  // Fetch contact details
  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/contacts/${encodeURIComponent(remoteJid)}`);
        setContact(data);
      } catch (err) {
        console.error('Failed to fetch contact:', err);
        // Set basic info if API fails
        setContact({
          id: remoteJid,
          remoteJid,
          pushName: contactName,
          profilePicUrl: profilePicUrl || undefined,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, [remoteJid, contactName, profilePicUrl]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatPhone = (jid: string) => {
    const number = jid.replace(/@.*/, '');
    if (number.length >= 10) {
      const countryCode = number.slice(0, 2);
      const areaCode = number.slice(2, 4);
      const firstPart = number.slice(4, 9);
      const secondPart = number.slice(9);
      return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
    }
    return number;
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: 340,
          height: '100%',
          bgcolor: '#111b21',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: '#00a884' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 340,
        height: '100%',
        bgcolor: '#111b21',
        borderLeft: '1px solid #2a3942',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          bgcolor: '#202c33',
        }}
      >
        <IconButton onClick={onClose} sx={{ mr: 2, color: '#aebac1' }}>
          <Close />
        </IconButton>
        <Typography variant="h6" sx={{ color: '#e9edef', fontWeight: 500 }}>
          Detalhes do contato
        </Typography>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Profile section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
            bgcolor: '#202c33',
          }}
        >
          <Avatar
            src={contact?.profilePicUrl || profilePicUrl || undefined}
            sx={{
              width: 200,
              height: 200,
              fontSize: 64,
              bgcolor: '#00a884',
              mb: 2,
            }}
          >
            {contactName?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h5" sx={{ color: '#e9edef', fontWeight: 500 }}>
            {contact?.pushName || contactName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#8696a0', mt: 0.5 }}>
            {formatPhone(remoteJid)}
          </Typography>
        </Box>

        {/* Info section */}
        <Box sx={{ bgcolor: '#111b21', mt: 2 }}>
          <ListItem
            onClick={() => toggleSection('info')}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <ListItemText
              primary="Informações"
              primaryTypographyProps={{ color: '#00a884', fontWeight: 500 }}
            />
            {expandedSections.info ? <ExpandLess sx={{ color: '#8696a0' }} /> : <ExpandMore sx={{ color: '#8696a0' }} />}
          </ListItem>
          <Collapse in={expandedSections.info}>
            <List disablePadding>
              <ListItem>
                <ListItemIcon>
                  <Phone sx={{ color: '#8696a0' }} />
                </ListItemIcon>
                <ListItemText
                  primary={formatPhone(remoteJid)}
                  secondary="Telefone"
                  primaryTypographyProps={{ color: '#e9edef' }}
                  secondaryTypographyProps={{ color: '#8696a0' }}
                />
              </ListItem>

              {contact?.email && (
                <ListItem>
                  <ListItemIcon>
                    <Email sx={{ color: '#8696a0' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={contact.email}
                    secondary="Email"
                    primaryTypographyProps={{ color: '#e9edef' }}
                    secondaryTypographyProps={{ color: '#8696a0' }}
                  />
                </ListItem>
              )}

              {contact?.company && (
                <ListItem>
                  <ListItemIcon>
                    <Business sx={{ color: '#8696a0' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={contact.company}
                    secondary="Empresa"
                    primaryTypographyProps={{ color: '#e9edef' }}
                    secondaryTypographyProps={{ color: '#8696a0' }}
                  />
                </ListItem>
              )}

              <ListItem>
                <ListItemIcon>
                  <SmartToy sx={{ color: contact?.aiEnabled !== false ? '#00a884' : '#8696a0' }} />
                </ListItemIcon>
                <ListItemText
                  primary={contact?.aiEnabled !== false ? 'Ativa' : 'Desativada'}
                  secondary="IA nesta conversa"
                  primaryTypographyProps={{ color: '#e9edef' }}
                  secondaryTypographyProps={{ color: '#8696a0' }}
                />
              </ListItem>
            </List>
          </Collapse>
        </Box>

        <Divider sx={{ bgcolor: '#2a3942' }} />

        {/* Tags section */}
        <Box sx={{ bgcolor: '#111b21' }}>
          <ListItem
            onClick={() => toggleSection('tags')}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <ListItemIcon>
              <Label sx={{ color: '#8696a0' }} />
            </ListItemIcon>
            <ListItemText
              primary="Tags"
              primaryTypographyProps={{ color: '#e9edef' }}
            />
            {expandedSections.tags ? <ExpandLess sx={{ color: '#8696a0' }} /> : <ExpandMore sx={{ color: '#8696a0' }} />}
          </ListItem>
          <Collapse in={expandedSections.tags}>
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {contact?.tags && contact.tags.length > 0 ? (
                contact.tags.map((tag, i) => (
                  <Chip
                    key={i}
                    label={tag}
                    size="small"
                    sx={{
                      bgcolor: '#00a884',
                      color: 'white',
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: '#8696a0' }}>
                  Nenhuma tag
                </Typography>
              )}
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ bgcolor: '#2a3942' }} />

        {/* Notes section */}
        <Box sx={{ bgcolor: '#111b21' }}>
          <ListItem
            onClick={() => toggleSection('notes')}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <ListItemIcon>
              <Notes sx={{ color: '#8696a0' }} />
            </ListItemIcon>
            <ListItemText
              primary="Anotações"
              primaryTypographyProps={{ color: '#e9edef' }}
            />
            {expandedSections.notes ? <ExpandLess sx={{ color: '#8696a0' }} /> : <ExpandMore sx={{ color: '#8696a0' }} />}
          </ListItem>
          <Collapse in={expandedSections.notes}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8696a0', whiteSpace: 'pre-wrap' }}>
                {contact?.notes || 'Nenhuma anotação'}
              </Typography>
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ bgcolor: '#2a3942' }} />

        {/* History summary */}
        <Box sx={{ bgcolor: '#111b21' }}>
          <ListItem
            onClick={() => toggleSection('history')}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <ListItemIcon>
              <History sx={{ color: '#8696a0' }} />
            </ListItemIcon>
            <ListItemText
              primary="Histórico"
              primaryTypographyProps={{ color: '#e9edef' }}
            />
            {expandedSections.history ? <ExpandLess sx={{ color: '#8696a0' }} /> : <ExpandMore sx={{ color: '#8696a0' }} />}
          </ListItem>
          <Collapse in={expandedSections.history}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="body2" sx={{ color: '#8696a0' }}>
                Total de mensagens: {contact?.totalMessages || 0}
              </Typography>
              {contact?.createdAt && (
                <Typography variant="body2" sx={{ color: '#8696a0', mt: 1 }}>
                  Primeiro contato: {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                </Typography>
              )}
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ bgcolor: '#2a3942' }} />

        {/* Actions */}
        <List>
          <ListItem
            component="button"
            sx={{
              cursor: 'pointer',
              border: 'none',
              width: '100%',
              bgcolor: 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            <ListItemIcon>
              <Star sx={{ color: '#8696a0' }} />
            </ListItemIcon>
            <ListItemText
              primary="Favoritar contato"
              primaryTypographyProps={{ color: '#e9edef' }}
            />
          </ListItem>
          <ListItem
            component="button"
            sx={{
              cursor: 'pointer',
              border: 'none',
              width: '100%',
              bgcolor: 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            <ListItemIcon>
              <Block sx={{ color: '#ea4335' }} />
            </ListItemIcon>
            <ListItemText
              primary="Bloquear contato"
              primaryTypographyProps={{ color: '#ea4335' }}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
});

ContactDetailsPanel.displayName = 'ContactDetailsPanel';

export default ContactDetailsPanel;
