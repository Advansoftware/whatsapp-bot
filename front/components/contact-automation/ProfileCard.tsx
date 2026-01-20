"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Tooltip,
  Button,
  Collapse,
  List,
  ListItem,
  Divider,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { ContactAutomationProfile, SESSION_STATUS } from "./types";

interface ProfileCardProps {
  profile: ContactAutomationProfile;
  onEdit: (profile: ContactAutomationProfile) => void;
  onDelete: (profileId: string) => void;
  onToggle: (profileId: string) => void;
  onStartSession: (profileId: string) => void;
  onViewSession: (sessionId: string) => void;
}

export default function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onToggle,
  onStartSession,
  onViewSession,
}: ProfileCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);

  const hasActiveSession = profile.hasActiveSession;
  const activeSession = profile.activeSession;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        opacity: profile.isActive ? 1 : 0.6,
        transition: "opacity 0.2s",
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Avatar src={profile.profilePicUrl} sx={{ width: 48, height: 48 }}>
            {profile.contactName[0]}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium" noWrap>
                {profile.contactName}
              </Typography>
              {profile.contactNickname && (
                <Typography variant="caption" color="text.secondary">
                  ({profile.contactNickname})
                </Typography>
              )}
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {profile.remoteJid.replace("@s.whatsapp.net", "")}
            </Typography>

            {profile.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.description}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title={profile.isActive ? "Ativo" : "Inativo"}>
              <Switch
                checked={profile.isActive}
                onChange={() => onToggle(profile.id)}
                size="small"
              />
            </Tooltip>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreIcon />
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem
              onClick={() => {
                onEdit(profile);
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                onDelete(profile.id);
                handleMenuClose();
              }}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Excluir</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        {/* Tags */}
        <Box sx={{ display: "flex", gap: 0.5, mt: 2, flexWrap: "wrap" }}>
          <Chip
            label={
              profile.botType === "menu"
                ? "Menu"
                : profile.botType === "free_text"
                  ? "Texto livre"
                  : "Misto"
            }
            size="small"
            variant="outlined"
          />
          <Chip
            label={`${profile.fields.length} campos`}
            size="small"
            variant="outlined"
          />
          {hasActiveSession && activeSession && (
            <Chip
              label={SESSION_STATUS[activeSession.status]?.label || "Ativo"}
              color={SESSION_STATUS[activeSession.status]?.color || "info"}
              size="small"
              onClick={() => onViewSession(activeSession.id)}
            />
          )}
        </Box>

        {/* Fields Preview */}
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <CollapseIcon /> : <ExpandIcon />}
            sx={{ textTransform: "none" }}
          >
            {expanded ? "Ocultar campos" : "Ver campos"}
          </Button>

          <Collapse in={expanded}>
            <List dense sx={{ mt: 1 }}>
              {profile.fields.map((field, index) => (
                <React.Fragment key={field.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={field.fieldLabel}
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {field.fieldType === "cpf" ||
                          field.fieldType === "phone"
                            ? "••••" + field.fieldValue.slice(-4)
                            : field.fieldValue}
                        </Typography>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Collapse>
        </Box>

        {/* Actions */}
        {profile.isActive && !hasActiveSession && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PlayIcon />}
              onClick={() => onStartSession(profile.id)}
              fullWidth
            >
              Iniciar Automação Manualmente
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
