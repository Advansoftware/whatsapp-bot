"use client";

import React from "react";
import { Fab, Zoom } from "@mui/material";
import { KeyboardArrowDown } from "@mui/icons-material";

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  visible,
  onClick,
}) => {
  return (
    <Zoom in={visible}>
      <Fab
        size="small"
        onClick={onClick}
        sx={{
          position: "absolute",
          bottom: 80,
          right: 24,
          bgcolor: "#202c33",
          color: "#aebac1",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          "&:hover": {
            bgcolor: "#2a3942",
          },
          zIndex: 100,
        }}
      >
        <KeyboardArrowDown />
      </Fab>
    </Zoom>
  );
};

export default ScrollToBottomButton;
