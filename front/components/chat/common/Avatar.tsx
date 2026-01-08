import React, { memo, useMemo } from 'react';
import { Avatar as MuiAvatar, Badge, Box } from '@mui/material';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  online?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  small: 32,
  medium: 40,
  large: 56,
};

/**
 * Avatar component with fallback to initials
 * Styled like WhatsApp Web
 */
const Avatar: React.FC<AvatarProps> = memo(({
  src,
  name = '',
  size = 'medium',
  online,
  onClick,
}) => {
  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, [name]);

  const bgColor = useMemo(() => {
    // Generate consistent color from name
    if (!name) return '#6b7c85';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#00a884', '#25d366', '#128c7e', '#075e54',
      '#34b7f1', '#00bcd4', '#7c4dff', '#e91e63',
      '#ff5722', '#ff9800', '#ffc107', '#8bc34a',
    ];
    return colors[Math.abs(hash) % colors.length];
  }, [name]);

  const avatarSize = sizeMap[size];

  const avatar = (
    <MuiAvatar
      src={src || undefined}
      onClick={onClick}
      sx={{
        width: avatarSize,
        height: avatarSize,
        bgcolor: !src ? bgColor : undefined,
        fontSize: avatarSize * 0.4,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { opacity: 0.9 } : undefined,
      }}
    >
      {!src && initials}
    </MuiAvatar>
  );

  if (online !== undefined) {
    return (
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: online ? '#44b700' : '#bdbdbd',
            color: online ? '#44b700' : '#bdbdbd',
            boxShadow: '0 0 0 2px #111b21',
            width: size === 'small' ? 8 : 10,
            height: size === 'small' ? 8 : 10,
            borderRadius: '50%',
          },
        }}
      >
        {avatar}
      </Badge>
    );
  }

  return avatar;
});

Avatar.displayName = 'Avatar';

export default Avatar;
