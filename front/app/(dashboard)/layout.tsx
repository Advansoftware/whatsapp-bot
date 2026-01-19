"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Box, CircularProgress } from "@mui/material";

import { useState } from "react";
import { useThemeMode } from "@/components/ThemeRegistry";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        minHeight="100vh"
        bgcolor="background.default"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return (
      <Box
        display="flex"
        minHeight="100vh"
        bgcolor="background.default"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        <Header
          toggleTheme={toggleTheme}
          isDarkMode={mode === "dark"}
          onNavigate={(url) => router.push(url)}
        />

        <Box flex={1} overflow="auto" p={{ xs: 2, md: 4 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
