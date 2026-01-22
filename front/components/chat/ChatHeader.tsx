"use client";

import React, { useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Badge,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  MoreVert,
  SmartToy,
  Person,
  Group,
  PersonAdd,
  AutoMode,
  AutoFixHigh as AutomationIcon,
} from "@mui/icons-material";

interface TeamMember {
  id: string;
  name: string;
  picture?: string;
  activeConversations: number;
}

interface ChatHeaderProps {
  contactName: string;
  profilePicUrl?: string | null;
  presenceText: string | null;
  isSyncing: boolean;
  aiEnabled?: boolean;
  onToggleAI?: () => void;
  isTogglingAI?: boolean;
  isGroup?: boolean;
  participantCount?: number;
  assignedAgent?: { id: string; name: string; picture?: string } | null;
  teamMembers?: TeamMember[];
  onAssignAgent?: (agentId: string | null) => void;
  onClick?: () => void;
  onCreateAutomation?: () => void;
  remoteJid?: string;
  colors: {
    headerBg: string;
    incomingText: string;
    timeText: string;
    iconColor: string;
    divider: string;
  };
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  contactName,
  profilePicUrl,
  presenceText,
  isSyncing,
  aiEnabled,
  onToggleAI,
  isTogglingAI,
  isGroup,
  participantCount,
  assignedAgent,
  teamMembers,
  onAssignAgent,
  onClick,
  onCreateAutomation,
  remoteJid,
  colors,
}) => {
  const avatarBgColor = isGroup ? "#5865F2" : "#00a884";
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const moreMenuOpen = Boolean(moreAnchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAssign = (agentId: string | null) => {
    if (onAssignAgent) {
      onAssignAgent(agentId);
    }
    handleMenuClose();
  };

  return (
    <Box
      p={1.5}
      bgcolor={colors.headerBg}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      borderLeft={`1px solid ${colors.divider}`}
    >
      <Box 
        display="flex" 
        alignItems="center" 
        gap={2} 
        onClick={onClick}
        sx={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            isGroup ? (
              <Box
                sx={{
                  bgcolor: "#5865F2",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid",
                  borderColor: colors.headerBg,
                }}
              >
                <Group sx={{ fontSize: 10, color: "#fff" }} />
              </Box>
            ) : null
          }
        >
          <Avatar
            src={
              profilePicUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                contactName
              )}&background=${avatarBgColor.replace("#", "")}&color=fff`
            }
            sx={{ width: 40, height: 40, bgcolor: avatarBgColor }}
            imgProps={{
              onError: (e: any) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  contactName
                )}&background=${avatarBgColor.replace("#", "")}&color=fff`;
              },
            }}
          >
            {isGroup && <Group />}
          </Avatar>
        </Badge>
        <Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              variant="subtitle1"
              sx={{ color: colors.incomingText, lineHeight: 1.2 }}
            >
              {contactName}
            </Typography>
            {isGroup && (
              <Chip
                label="Grupo"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(88, 101, 242, 0.2)",
                  color: "#5865F2",
                }}
              />
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color:
                presenceText === "online"
                  ? "#25D366"
                  : presenceText
                  ? "#25D366"
                  : colors.timeText,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              fontStyle:
                presenceText === "digitando..." ||
                presenceText === "gravando áudio..."
                  ? "italic"
                  : "normal",
            }}
          >
            {isGroup && !presenceText && !isSyncing ? (
              participantCount ? (
                `${participantCount} participantes`
              ) : (
                "Grupo"
              )
            ) : presenceText ? (
              <>
                {presenceText === "online" && (
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#25D366",
                      display: "inline-block",
                    }}
                  />
                )}
                {presenceText}
              </>
            ) : isSyncing ? (
              <>
                <CircularProgress
                  size={10}
                  thickness={5}
                  sx={{ color: colors.timeText }}
                />
                Sincronizando...
              </>
            ) : null}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        {/* Assigned Agent indicator */}
        {assignedAgent && (
          <Tooltip title={`Atribuído a ${assignedAgent.name}`}>
            <Chip
              avatar={
                assignedAgent.picture ? (
                  <Avatar
                    src={assignedAgent.picture}
                    sx={{ width: 20, height: 20 }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      fontSize: 10,
                      bgcolor: "#00a884",
                    }}
                  >
                    {assignedAgent.name.charAt(0)}
                  </Avatar>
                )
              }
              label={assignedAgent.name.split(" ")[0]}
              size="small"
              sx={{ bgcolor: "rgba(0, 168, 132, 0.2)", color: "#00a884" }}
            />
          </Tooltip>
        )}
        {/* AI Toggle */}
        {onToggleAI && (
          <Tooltip
            title={
              aiEnabled
                ? "IA ativa - Clique para desativar"
                : "IA desativada - Clique para ativar"
            }
          >
            <Chip
              icon={
                isTogglingAI ? (
                  <CircularProgress size={16} color="inherit" />
                ) : aiEnabled ? (
                  <SmartToy />
                ) : (
                  <Person />
                )
              }
              label={aiEnabled ? "IA" : "Manual"}
              color={aiEnabled ? "success" : "warning"}
              size="small"
              onClick={onToggleAI}
              disabled={isTogglingAI}
              sx={{ cursor: "pointer" }}
            />
          </Tooltip>
        )}
        {/* Assignment Menu */}
        {onAssignAgent && teamMembers && teamMembers.length > 0 && (
          <>
            <Tooltip title="Atribuir conversa">
              <IconButton
                onClick={handleMenuClick}
                sx={{ color: colors.iconColor }}
              >
                <PersonAdd />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  bgcolor: colors.headerBg,
                  color: colors.incomingText,
                  minWidth: 200,
                },
              }}
            >
              <MenuItem onClick={() => handleAssign(null)}>
                <AutoMode sx={{ mr: 1, color: "#00a884" }} />
                Devolver para IA
              </MenuItem>
              <Divider />
              <Typography
                variant="caption"
                sx={{ px: 2, py: 1, color: colors.timeText, display: "block" }}
              >
                Atribuir a:
              </Typography>
              {teamMembers.map((member) => (
                <MenuItem
                  key={member.id}
                  onClick={() => handleAssign(member.id)}
                  selected={assignedAgent?.id === member.id}
                >
                  <Avatar
                    src={member.picture}
                    sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}
                  >
                    {member.name.charAt(0)}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="body2">{member.name}</Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: colors.timeText }}
                    >
                      {member.activeConversations} conversas
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
        <IconButton
          sx={{ color: colors.iconColor }}
          onClick={(e) => setMoreAnchorEl(e.currentTarget)}
        >
          <MoreVert />
        </IconButton>
        <Menu
          anchorEl={moreAnchorEl}
          open={moreMenuOpen}
          onClose={() => setMoreAnchorEl(null)}
          PaperProps={{
            sx: {
              bgcolor: colors.headerBg,
              color: colors.incomingText,
              minWidth: 200,
            },
          }}
        >
          {onCreateAutomation && !isGroup && (
            <MenuItem
              onClick={() => {
                setMoreAnchorEl(null);
                onCreateAutomation();
              }}
            >
              <AutomationIcon sx={{ mr: 1, color: "#00a884" }} />
              Criar Automação
            </MenuItem>
          )}
          {(!onCreateAutomation || isGroup) && (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                Nenhuma ação disponível
              </Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

export default ChatHeader;
