import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Link as LinkIcon,
  LinkOff,
  CheckCircle,
  Error as ErrorIcon,
  AccountBalance,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import api from "../../lib/api";
import ConfirmDialog from "../common/ConfirmDialog";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  config?: any;
}

interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon?: string;
  color?: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: "gastometria",
    name: "Gastometria",
    description:
      "Controle de gastos pessoais. Registre despesas e receitas via WhatsApp.",
    icon: "💰",
    url: "https://gastometria.com.br",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description:
      "Agende reuniões e compromissos via WhatsApp. A secretária pode verificar sua agenda e marcar horários.",
    icon: "📅",
    url: "https://calendar.google.com",
  },
];

const IntegrationsView: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Gastometria specific
  const [gastometriaDialogOpen, setGastometriaDialogOpen] = useState(false);
  const [gastometriaEmail, setGastometriaEmail] = useState("");
  const [gastometriaPassword, setGastometriaPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState({ title: "", content: "" });

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const updatedIntegrations = await Promise.all(
        AVAILABLE_INTEGRATIONS.map(async (integration) => {
          if (integration.id === "gastometria") {
            const status = await api.getGastometriaStatus();
            return {
              ...integration,
              connected: status.connected,
              config: status.config,
            };
          }
          if (integration.id === "google_calendar") {
            try {
              const status = await api.getGoogleCalendarStatus();
              return {
                ...integration,
                connected: status.connected,
              };
            } catch {
              return { ...integration, connected: false };
            }
          }
          return { ...integration, connected: false };
        })
      );
      setIntegrations(updatedIntegrations);
    } catch (err) {
      console.error("Error loading integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();

    // Verificar se veio de callback do Google Calendar
    const urlParams = new URLSearchParams(window.location.search);
    const googleCalendarResult = urlParams.get("google_calendar");
    if (googleCalendarResult === "success") {
      setSuccess("Google Calendar conectado com sucesso!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (googleCalendarResult === "error") {
      const message = urlParams.get("message") || "Erro ao conectar";
      setError(`Erro ao conectar Google Calendar: ${message}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadIntegrations]);

  const handleConnectGastometria = async () => {
    if (!gastometriaEmail || !gastometriaPassword) {
      setError("Preencha email e senha");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const result = await api.connectGastometria(
        gastometriaEmail,
        gastometriaPassword
      );

      if (result.success) {
        setSuccess("Conta conectada com sucesso!");
        setGastometriaDialogOpen(false);
        setGastometriaEmail("");
        setGastometriaPassword("");

        // Mostrar seleção de carteira
        if (result.wallets && result.wallets.length > 0) {
          setWallets(result.wallets);
          setWalletDialogOpen(true);
        }

        loadIntegrations();
      } else {
        setError(result.message || "Erro ao conectar");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectGastometria = () => {
    setConfirmMessage({
      title: "Desconectar Gastometria",
      content: "Tem certeza que deseja desconectar sua conta do Gastometria?"
    });
    setConfirmAction(() => async () => {
      try {
        await api.disconnectGastometria();
        setSuccess("Conta desconectada");
        loadIntegrations();
      } catch (err) {
        setError("Erro ao desconectar");
      }
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setConnecting(true);
      const result = await api.getGoogleCalendarAuthUrl();
      if (result.authUrl) {
        // Redirecionar para a página de autorização do Google
        window.location.href = result.authUrl;
      } else {
        setError("Erro ao obter URL de autorização");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar Google Calendar");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    setConfirmMessage({
      title: "Desconectar Google Calendar",
      content: "Tem certeza que deseja desconectar sua conta do Google Calendar?"
    });
    setConfirmAction(() => async () => {
      try {
        await api.disconnectGoogleCalendar();
        setSuccess("Google Calendar desconectado");
        loadIntegrations();
      } catch (err) {
        setError("Erro ao desconectar");
      }
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const handleSaveWallet = async () => {
    if (!selectedWallet) return;

    try {
      await api.setGastometriaConfig({ defaultWalletId: selectedWallet });
      setSuccess("Carteira padrão configurada!");
      setWalletDialogOpen(false);
      loadIntegrations();
    } catch (err) {
      setError("Erro ao salvar configuração");
    }
  };

  const handleOpenWalletConfig = async () => {
    try {
      const walletsData = await api.getGastometriaWallets();
      setWallets(walletsData);

      // Encontrar carteira atual selecionada
      const gastometria = integrations.find((i) => i.id === "gastometria");
      if (gastometria?.config?.defaultWalletId) {
        setSelectedWallet(gastometria.config.defaultWalletId);
      }

      setWalletDialogOpen(true);
    } catch (err) {
      setError("Erro ao carregar carteiras");
    }
  };

  const getIntegrationCard = (integration: Integration) => {
    const isGastometria = integration.id === "gastometria";
    const isGoogleCalendar = integration.id === "google_calendar";

    return (
      <Card
        key={integration.id}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: integration.connected
            ? `2px solid ${theme.palette.success.main}`
            : undefined,
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h3" component="span">
              {integration.icon}
            </Typography>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {integration.name}
              </Typography>
              {integration.connected ? (
                <Chip
                  icon={<CheckCircle fontSize="small" />}
                  label="Conectado"
                  color="success"
                  size="small"
                />
              ) : (
                <Chip
                  icon={<ErrorIcon fontSize="small" />}
                  label="Desconectado"
                  color="default"
                  size="small"
                />
              )}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {integration.description}
          </Typography>

          {isGastometria && integration.connected && (
            <Box mt={2}>
              {integration.config?.defaultWalletId ? (
                <Chip
                  icon={<AccountBalance fontSize="small" />}
                  label={`Carteira configurada`}
                  color="primary"
                  size="small"
                  onClick={handleOpenWalletConfig}
                  sx={{ cursor: "pointer" }}
                />
              ) : (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Configure uma carteira padrão
                </Alert>
              )}
            </Box>
          )}

          {isGoogleCalendar && integration.connected && (
            <Box mt={2}>
              <Chip
                icon={<CheckCircle fontSize="small" />}
                label="Pronto para usar"
                color="success"
                size="small"
              />
            </Box>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
          {integration.connected ? (
            <>
              {isGastometria && (
                <Button
                  size="small"
                  startIcon={<AccountBalance />}
                  onClick={handleOpenWalletConfig}
                >
                  Configurar
                </Button>
              )}
              <Button
                size="small"
                color="error"
                startIcon={<LinkOff />}
                onClick={
                  isGastometria
                    ? handleDisconnectGastometria
                    : isGoogleCalendar
                    ? handleDisconnectGoogleCalendar
                    : undefined
                }
              >
                Desconectar
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={
                connecting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <LinkIcon />
                )
              }
              onClick={
                isGastometria
                  ? () => setGastometriaDialogOpen(true)
                  : isGoogleCalendar
                  ? handleConnectGoogleCalendar
                  : undefined
              }
              disabled={connecting}
              sx={{ bgcolor: "#00a884", "&:hover": { bgcolor: "#008f72" } }}
            >
              {connecting ? "Conectando..." : "Conectar"}
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  return (
    <Box p={4}>
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          🔗 Integrações
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Conecte serviços externos para expandir as funcionalidades da sua
          secretária.
        </Typography>
      </Box>

      {/* Integrations Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {integrations.map((integration) => (
            <Grid item xs={12} sm={6} md={4} key={integration.id}>
              {getIntegrationCard(integration)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Gastometria Login Dialog */}
      <Dialog
        open={gastometriaDialogOpen}
        onClose={() => setGastometriaDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <span>💰</span>
            Conectar Gastometria
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Use suas credenciais do Gastometria para conectar. Você precisa ter
            um plano Infinity ativo.
          </Typography>

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={gastometriaEmail}
            onChange={(e) => setGastometriaEmail(e.target.value)}
            margin="normal"
            autoComplete="email"
          />

          <TextField
            fullWidth
            label="Senha"
            type={showPassword ? "text" : "password"}
            value={gastometriaPassword}
            onChange={(e) => setGastometriaPassword(e.target.value)}
            margin="normal"
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            Suas credenciais são armazenadas de forma segura e encriptada.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGastometriaDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConnectGastometria}
            disabled={connecting}
            startIcon={
              connecting ? <CircularProgress size={16} /> : <LinkIcon />
            }
          >
            {connecting ? "Conectando..." : "Conectar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wallet Selection Dialog */}
      <Dialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Selecionar Carteira Padrão</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Escolha a carteira onde os gastos serão registrados por padrão via
            WhatsApp.
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>Carteira</InputLabel>
            <Select
              value={selectedWallet}
              label="Carteira"
              onChange={(e) => setSelectedWallet(e.target.value)}
            >
              {wallets.map((wallet) => (
                <MenuItem key={wallet.id} value={wallet.id}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    width="100%"
                    alignItems="center"
                  >
                    <span>
                      {wallet.icon || "💳"} {wallet.name}
                    </span>
                    <Typography variant="body2" color="text.secondary">
                      R$ {wallet.balance.toFixed(2)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWalletDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveWallet}
            disabled={!selectedWallet}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        title={confirmMessage.title}
        content={confirmMessage.content}
        onConfirm={confirmAction || (() => {})}
        onCancel={() => setConfirmOpen(false)}
        confirmColor="error"
        confirmText="Desconectar"
      />
    </Box>
  );
};

export default IntegrationsView;
