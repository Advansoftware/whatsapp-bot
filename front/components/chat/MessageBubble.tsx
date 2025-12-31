import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { Done, DoneAll, Schedule, ErrorOutline } from "@mui/icons-material";

interface MessageBubbleProps {
  message: any;
  colors: {
    incomingBubble: string;
    outgoingBubble: string;
    incomingText: string;
    outgoingText: string;
    timeText: string;
  };
  getMediaSrc: (msg: any) => string;
  renderMessageContent: (content: string) => React.ReactNode;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message: msg,
  colors,
  getMediaSrc,
  renderMessageContent,
}) => {
  const isSender =
    msg.direction === "outgoing" ||
    msg.direction === "SEND" ||
    msg.status === "sended";

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
        {(msg.mediaUrl &&
          (msg.mediaType === "image" || msg.mediaType === "sticker")) ||
        msg.content?.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
          <>
            <Box
              component="img"
              src={getMediaSrc(msg)}
              alt="Image"
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
              onClick={() => window.open(getMediaSrc(msg), "_blank")}
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
        ) : msg.mediaUrl && msg.mediaType === "video" ? (
          <>
            <Box
              component="video"
              src={getMediaSrc(msg)}
              controls
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
        ) : msg.mediaUrl && msg.mediaType === "audio" ? (
          <Box
            component="audio"
            src={getMediaSrc(msg)}
            controls
            sx={{ width: "100%", minWidth: 200 }}
          />
        ) : msg.mediaUrl && msg.mediaType === "document" ? (
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
            onClick={() => window.open(getMediaSrc(msg), "_blank")}
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
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
          {isSender && (
            <MessageStatusIcon status={msg.status} color={colors.timeText} />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

// Status icon component
const MessageStatusIcon: React.FC<{ status: string; color: string }> = ({
  status,
  color,
}) => {
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
};

export default MessageBubble;
