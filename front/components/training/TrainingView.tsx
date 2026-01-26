"use client";

import { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  School as TrainingIcon,
  QuestionAnswer as FAQIcon,
  Search as SearchIcon,
  Analytics as StatsIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { trainingApi } from "@/lib/api";
import TrainingDocumentsTab from "./TrainingDocumentsTab";
import TrainingFAQsTab from "./TrainingFAQsTab";
import TrainingTestTab from "./TrainingTestTab";
import TrainingStatsTab from "./TrainingStatsTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TrainingView() {
  const [tabValue, setTabValue] = useState(0);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["training", "stats"],
    queryFn: trainingApi.getStats,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        🎓 Treinamento da IA
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Ensine sua secretária virtual a responder melhor adicionando documentos,
        FAQs e conhecimento específico do seu negócio.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Como funciona:</strong> Adicione documentos, perguntas
        frequentes e informações sobre sua empresa. A IA usará esse conhecimento
        para dar respostas mais precisas e personalizadas aos seus clientes.
      </Alert>

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="training tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<TrainingIcon />}
              iconPosition="start"
              label={`Documentos (${stats?.totalDocuments || 0})`}
            />
            <Tab
              icon={<FAQIcon />}
              iconPosition="start"
              label={`FAQs (${stats?.byCategory?.faq || 0})`}
            />
            <Tab icon={<SearchIcon />} iconPosition="start" label="Testar" />
            <Tab
              icon={<StatsIcon />}
              iconPosition="start"
              label="Estatísticas"
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <TrainingDocumentsTab />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <TrainingFAQsTab />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <TrainingTestTab />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <TrainingStatsTab />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
