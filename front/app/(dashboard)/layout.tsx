"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Box, CircularProgress, useMediaQuery, useTheme } from "@mui/material";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        sx={{
          // Margem para o drawer permanente em desktop
          ml: { xs: 0, md: "280px" },
          width: { xs: "100%", md: "calc(100% - 280px)" },
        }}
      >
        <Header
          toggleTheme={toggleTheme}
          isDarkMode={mode === "dark"}
          onNavigate={(url) => router.push(url)}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <Box
          component="main"
          flex={1}
          overflow="auto"
          p={{ xs: 2, sm: 3, md: 4 }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
