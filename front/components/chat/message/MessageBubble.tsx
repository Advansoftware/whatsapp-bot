import React, { memo, useMemo, useState, useCallback } from "react";
import { Box, Paper } from "@mui/material";

// Import subcomponents
import MessageStatus from "./MessageStatus";
import MessageTimestamp from "./MessageTimestamp";
import MessageContent from "./MessageContent";
import ReplyQuote from "./ReplyQuote";
import ParticipantName from "./ParticipantName";
import { AudioPlayer, VideoPlayer, ImageViewer, StickerView, DocumentPreview } from "../media";

interface MessageData {
  id: string;
  content: string;
  direction: string;
  status: string;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
  // Group fields
  isGroup?: boolean;
  participant?: string;
  participantName?: string;
  // Reply-to fields
  quotedMessage?: {
    id: string;
    content: string;
    senderName: string;
  };
}

interface MessageBubbleProps {
  message: MessageData;
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
  isGroupChat?: boolean;
  onReply?: (message: MessageData) => void;
  onScrollToMessage?: (messageId: string) => void;
}

/**
 * Main message bubble component
 * Refactored to use smaller subcomponents
 */
const MessageBubble = memo<MessageBubbleProps>(
  ({
    message: msg,
    colors,
    getMediaSrc,
    onTranscribe,
    isTranscribing,
    isGroupChat,
    onReply,
    onScrollToMessage,
  }) => {
    const [showActions, setShowActions] = useState(false);

    const isSender = useMemo(
      () =>
        msg.direction === "outgoing" ||
        msg.direction === "SEND" ||
        msg.status === "sended",
      [msg.direction, msg.status]
    );

    const mediaSrc = useMemo(
      () => (msg.mediaUrl ? getMediaSrc(msg) : null),
      [msg.mediaUrl, msg.id, getMediaSrc]
    );

    // Determine media type
    const isSticker = msg.mediaType === "sticker";
    const isImage = msg.mediaUrl && (msg.mediaType === "image" || msg.content?.match(/\.(jpeg|jpg|gif|png|webp)/i));
    const isVideo = msg.mediaUrl && msg.mediaType === "video";
    const isAudio = msg.mediaUrl && msg.mediaType === "audio";
    const isDocument = msg.mediaUrl && msg.mediaType === "document";

    const handleQuoteClick = useCallback(() => {
      if (msg.quotedMessage?.id && onScrollToMessage) {
        onScrollToMessage(msg.quotedMessage.id);
      }
    }, [msg.quotedMessage?.id, onScrollToMessage]);

    // Stickers don't have bubble background
    if (isSticker && mediaSrc) {
      return (
        <Box
          alignSelf={isSender ? "flex-end" : "flex-start"}
          sx={{ mb: 1 }}
        >
          <StickerView src={mediaSrc} />
          <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5} mt={0.5}>
            <MessageTimestamp timestamp={msg.createdAt} color={colors.timeText} />
            {isSender && <MessageStatus status={msg.status} color={colors.timeText} />}
          </Box>
        </Box>
      );
    }

    return (
      <Box
        alignSelf={isSender ? "flex-end" : "flex-start"}
        maxWidth="65%"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
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
          {/* Participant name in groups */}
          {isGroupChat && !isSender && (
            <ParticipantName
              name={msg.participantName || ""}
              phone={msg.participant?.replace("@s.whatsapp.net", "")}
            />
          )}

          {/* Quoted message (reply-to) */}
          {msg.quotedMessage && (
            <ReplyQuote
              senderName={msg.quotedMessage.senderName}
              content={msg.quotedMessage.content}
              onClick={handleQuoteClick}
            />
          )}

          {/* Media content */}
          {isImage && mediaSrc ? (
            <>
              <ImageViewer src={mediaSrc} />
              {msg.content && msg.content !== "[Imagem]" && (
                <Box mt={1}>
                  <MessageContent content={msg.content} />
                </Box>
              )}
            </>
          ) : isVideo && mediaSrc ? (
            <>
              <VideoPlayer
                src={mediaSrc}
                caption={msg.content !== "[Vídeo]" ? msg.content : undefined}
              />
            </>
          ) : isAudio && mediaSrc ? (
            <AudioPlayer
              src={mediaSrc}
              onTranscribe={onTranscribe ? () => onTranscribe(msg.id) : undefined}
              isTranscribing={isTranscribing}
              transcription={
                msg.content && !msg.content.startsWith("[Áudio]")
                  ? msg.content.replace("[Áudio transcrito]: ", "")
                  : undefined
              }
            />
          ) : isDocument && mediaSrc ? (
            <DocumentPreview
              src={mediaSrc}
              fileName={msg.content || "Documento"}
            />
          ) : (
            <MessageContent content={msg.content} />
          )}

          {/* Time and Status */}
          <Box
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={0.5}
            mt="2px"
          >
            <MessageTimestamp timestamp={msg.createdAt} color={colors.timeText} />
            {isSender && (
              <MessageStatus status={msg.status} color={colors.timeText} />
            )}
          </Box>
        </Paper>
      </Box>
    );
  },
  // Custom comparison for memo
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.colors.timeText === nextProps.colors.timeText &&
      prevProps.colors.incomingBubble === nextProps.colors.incomingBubble &&
      prevProps.colors.outgoingBubble === nextProps.colors.outgoingBubble &&
      prevProps.isTranscribing === nextProps.isTranscribing
    );
  }
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
