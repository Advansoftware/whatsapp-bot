"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/components/LandingPage";
import { Box, CircularProgress } from "@mui/material";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        minHeight="100vh"
        bgcolor="#111b21"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress sx={{ color: "#00a884" }} />
      </Box>
    );
  }

  // If authenticated, we'll redirect in useEffect, show loading
  if (isAuthenticated) {
    return (
      <Box
        display="flex"
        minHeight="100vh"
        bgcolor="#111b21"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress sx={{ color: "#00a884" }} />
      </Box>
    );
  }

  // Show landing page for unauthenticated users
  return <LandingPage onLoginClick={() => router.push("/login")} />;
}
