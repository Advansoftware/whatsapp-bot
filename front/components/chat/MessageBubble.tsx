import React, { memo, useMemo } from "react";
import { Box, Paper, Typography, Button, CircularProgress } from "@mui/material";
import { Done, DoneAll, Schedule, ErrorOutline, Mic } from "@mui/icons-material";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    direction: string;
    status: string;
    createdAt: string;
    mediaUrl?: string;
    mediaType?: string;
  };
  colors: {
    incomingBubble: string;
    outgoingBubble: string;
    incomingText: string;
    outgoingText: string;
    timeText: string;
  };
  getMediaSrc: (msg: any) => string;
  onTranscribe?: (messageId: string) => void;
  isTranscribing?: boolean;
}

// Memoized status icon component
const MessageStatusIcon = memo<{ status: string; color: string }>(
  ({ status, color }) => {
    if (status === "read" || status === "READ") {
      return <DoneAll sx={{ fontSize: 16, color: "#53bdeb" }} />;
    }
    if (
      status === "delivered" ||
      status === "DELIVERY_ACK" ||
      status === "received"
    ) {
      return <DoneAll sx={{ fontSize: 16, color }} />;
    }
    if (status === "sent" || status === "SERVER_ACK" || status === "sended") {
      return <Done sx={{ fontSize: 16, color }} />;
    }
    if (status === "pending" || status === "PENDING") {
      return <Schedule sx={{ fontSize: 14, color }} />;
    }
    if (status === "error") {
      return <ErrorOutline sx={{ fontSize: 14, color: "#f44336" }} />;
    }
    return <Done sx={{ fontSize: 16, color }} />;
  }
);

MessageStatusIcon.displayName = "MessageStatusIcon";

// Helper to render message content with clickable links
const renderMessageContent = (content: string): React.ReactNode => {
  if (!content) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#53bdeb",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// Main component - memoized to prevent unnecessary re-renders
const MessageBubble = memo<MessageBubbleProps>(
  ({ message: msg, colors, getMediaSrc, onTranscribe, isTranscribing }) => {
    const isSender = useMemo(
      () =>
        msg.direction === "outgoing" ||
        msg.direction === "SEND" ||
        msg.status === "sended",
      [msg.direction, msg.status]
    );

    const formattedTime = useMemo(
      () =>
        new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      [msg.createdAt]
    );

    const mediaSrc = useMemo(
      () => (msg.mediaUrl ? getMediaSrc(msg) : null),
      [msg.mediaUrl, msg.id, getMediaSrc]
    );

    const isImage =
      (msg.mediaUrl &&
        (msg.mediaType === "image" || msg.mediaType === "sticker")) ||
      msg.content?.match(/\.(jpeg|jpg|gif|png|webp)/i);

    const isVideo = msg.mediaUrl && msg.mediaType === "video";
    const isAudio = msg.mediaUrl && msg.mediaType === "audio";
    const isDocument = msg.mediaUrl && msg.mediaType === "document";

    return (
      <Box
        alignSelf={isSender ? "flex-end" : "flex-start"}
        maxWidth="65%"
        sx={{
          position: "relative",
          mb: 1,
          minWidth: 0,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: "6px 7px 8px 9px",
            bgcolor: isSender ? colors.outgoingBubble : colors.incomingBubble,
            color: isSender ? colors.outgoingText : colors.incomingText,
            borderRadius: "7.5px",
            borderTopLeftRadius: isSender ? "7.5px" : 0,
            borderTopRightRadius: isSender ? 0 : "7.5px",
            boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {/* Image/Sticker */}
          {isImage ? (
            <>
              <Box
                component="img"
                src={mediaSrc || msg.content}
                alt="Image"
                loading="lazy"
                sx={{
                  maxWidth: "100%",
                  maxHeight: 300,
                  borderRadius: 1,
                  display: "block",
                  cursor: "pointer",
                  mb:
                    msg.content &&
                    msg.content !== "[Imagem]" &&
                    msg.content !== "[Sticker]"
                      ? 1
                      : 0,
                }}
                onClick={() => window.open(mediaSrc || msg.content, "_blank")}
                onError={(e: any) => {
                  e.target.style.display = "none";
                }}
              />
              {msg.content &&
                msg.content !== "[Imagem]" &&
                msg.content !== "[Sticker]" && (
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "14.2px",
                      lineHeight: "19px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {renderMessageContent(msg.content)}
                  </Typography>
                )}
            </>
          ) : isVideo ? (
            <>
              <Box
                component="video"
                src={mediaSrc!}
                controls
                preload="metadata"
                sx={{
                  maxWidth: "100%",
                  maxHeight: 300,
                  borderRadius: 1,
                  display: "block",
                }}
              />
              {msg.content && msg.content !== "[Vídeo]" && (
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "14.2px",
                    lineHeight: "19px",
                    mt: 1,
                  }}
                >
                  {renderMessageContent(msg.content)}
                </Typography>
              )}
            </>
          ) : isAudio ? (
            <>
              <Box
                component="audio"
                src={mediaSrc!}
                controls
                preload="metadata"
                sx={{ width: "100%", minWidth: 200 }}
              />
              {/* Transcrição ou botão de transcrever */}
              {msg.content?.includes("[Erro na transcrição do áudio]") ? (
                <Button
                  size="small"
                  variant="text"
                  startIcon={isTranscribing ? <CircularProgress size={14} /> : <Mic />}
                  disabled={isTranscribing}
                  onClick={() => onTranscribe?.(msg.id)}
                  sx={{
                    mt: 0.5,
                    fontSize: "12px",
                    textTransform: "none",
                    color: isSender ? colors.outgoingText : colors.incomingText,
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  {isTranscribing ? "Transcrevendo..." : "Transcrever"}
                </Button>
              ) : msg.content && !msg.content.startsWith("[Áudio]") ? (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    fontSize: "13px",
                    opacity: 0.9,
                    fontStyle: "italic",
                  }}
                >
                  {msg.content.replace("[Áudio transcrito]: ", "")}
                </Typography>
              ) : null}
            </>
          ) : isDocument ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1,
                bgcolor: isSender ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)",
                borderRadius: 1,
                cursor: "pointer",
              }}
              onClick={() => window.open(mediaSrc!, "_blank")}
            >
              <Typography sx={{ fontSize: 24 }}>📄</Typography>
              <Typography variant="body2" sx={{ color: "inherit" }}>
                {msg.content || "Documento"}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="body1"
              component="div"
              sx={{
                fontSize: "14.2px",
                lineHeight: "19px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {renderMessageContent(msg.content)}
            </Typography>
          )}

          {/* Time and Status */}
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={0.5}
            mt="2px"
          >
            <Typography
              variant="caption"
              sx={{
                color: colors.timeText,
                fontSize: "11px",
              }}
            >
              {formattedTime}
            </Typography>
            {isSender && (
              <MessageStatusIcon status={msg.status} color={colors.timeText} />
            )}
          </Box>
        </Paper>
      </Box>
    );
  },
  // Custom comparison function for memo
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.colors.timeText === nextProps.colors.timeText &&
      prevProps.colors.incomingBubble === nextProps.colors.incomingBubble &&
      prevProps.colors.outgoingBubble === nextProps.colors.outgoingBubble
    );
  }
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
