import React, { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Divider,
  Link,
  IconButton,
  InputAdornment,
  Snackbar,
} from "@mui/material";
import {
  Chat,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  WifiOff,
} from "@mui/icons-material";

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

type ToastType = "success" | "error" | "warning";

interface ToastState {
  open: boolean;
  message: string;
  type: ToastType;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { loginWithGoogle, login, register, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Toast State
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ open: true, message, type });
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
        showToast("Login realizado com sucesso! Redirecionando...", "success");
      } else {
        await register(formData);
        showToast(
          "Cadastro realizado com sucesso! Redirecionando...",
          "success"
        );
      }

      // Delay redirection to show success message
      setTimeout(() => {
        onLoginSuccess?.();
      }, 1500);
    } catch (err: any) {
      console.error("Auth error:", err);
      // Format error message and show appropriate toast
      let msg = err.message;
      let toastType: ToastType = "error";

      if (
        msg === "Failed to fetch" ||
        msg.includes("NetworkError") ||
        msg.includes("ECONNREFUSED")
      ) {
        msg = "API fora do ar. O servidor não está respondendo.";
        toastType = "warning";
        showToast(msg, toastType);
      } else if (msg === "Unauthorized" || msg === "Request failed") {
        msg = "Credenciais inválidas. Verifique seu e-mail e senha.";
        showToast(msg, "error");
      } else {
        showToast(msg || "Erro ao autenticar. Tente novamente.", "error");
      }
      setError(msg || "Erro ao autenticar. Tente novamente.");
    }
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    if (!credentialResponse.credential) {
      showToast("Falha na autenticação com Google", "error");
      setError("Falha na autenticação com Google");
      return;
    }

    try {
      setError("");
      await loginWithGoogle(credentialResponse.credential);
      showToast("Login com Google realizado com sucesso!", "success");
      setTimeout(() => {
        onLoginSuccess?.();
      }, 1500);
    } catch (err: any) {
      let msg = err.message;
      if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
        msg = "API fora do ar. O servidor não está respondendo.";
        showToast(msg, "warning");
      } else {
        showToast("Erro ao fazer login com Google. Tente novamente.", "error");
      }
      setError("Erro ao fazer login com Google. Tente novamente.");
      console.error("Google login error:", err);
    }
  };

  const handleGoogleError = () => {
    showToast("Falha na autenticação com Google. Tente novamente.", "error");
    setError("Falha na autenticação com Google. Tente novamente.");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background effects */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(0, 254, 155, 0.1) 0%, rgba(0,0,0,0) 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          right: "-5%",
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(0,0,0,0) 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />

      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: "100%",
          mx: 2,
          bgcolor: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(20px)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        }}
      >
        {/* Header */}
        <Box sx={{ pt: 6, pb: 2, px: 4, textAlign: "center" }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              background: "linear-gradient(135deg, rgba(0, 254, 155, 0.1) 0%, rgba(0, 204, 122, 0.1) 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
              border: "1px solid rgba(0, 254, 155, 0.2)",
              boxShadow: "0 0 15px rgba(0, 254, 155, 0.1)",
            }}
          >
            <Chat sx={{ fontSize: 32, color: "primary.main" }} />
          </Box>
          <Typography
            variant="h4"
            sx={{ color: "text.primary", fontWeight: "bold", mb: 1, letterSpacing: "-0.5px" }}
          >
            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            {isLogin
              ? "Faça login para acessar seu painel"
              : "Comece a automatizar seu WhatsApp hoje mesmo"}
          </Typography>
        </Box>

        {/* Login Form */}
        <Box sx={{ p: 4, pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {!isLogin && (
                <TextField
                  fullWidth
                  label="Nome Completo"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  variant="outlined"
                  required={!isLogin}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "#e9edef",
                      bgcolor: "rgba(0, 0, 0, 0.2)",
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                      "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                    },
                    "& .MuiInputLabel-root": { color: "#8696a0" },
                  }}
                />
              )}

              <TextField
                fullWidth
                label="E-mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#e9edef",
                    bgcolor: "rgba(0, 0, 0, 0.2)",
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                  },
                  "& .MuiInputLabel-root": { color: "#8696a0" },
                }}
              />

              <TextField
                fullWidth
                label="Senha"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: "text.secondary" }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#e9edef",
                    bgcolor: "rgba(0, 0, 0, 0.2)",
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                  },
                  "& .MuiInputLabel-root": { color: "#8696a0" },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  mt: 1,
                  height: 48,
                  fontWeight: "bold",
                  fontSize: "1rem",
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isLogin ? (
                  "Entrar"
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </Box>
          </form>
         
          <Box sx={{ my: 3, display: "flex", alignItems: "center" }}>
             <Divider sx={{ flex: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
             <Typography sx={{ px: 2, color: "text.secondary", fontSize: 12 }}>
               OU
             </Typography>
             <Divider sx={{ flex: 1, borderColor: "rgba(255, 255, 255, 0.1)" }} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="filled_black"
              size="large"
              width="300"
              text={isLogin ? "signin_with" : "signup_with"}
              shape="rectangular"
            />
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            bgcolor: "rgba(0, 0, 0, 0.2)",
            py: 3,
            px: 4,
            textAlign: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <Link
              component="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setFormData({ name: "", email: "", password: "" });
              }}
              sx={{
                color: "primary.main",
                fontWeight: 600,
                textDecoration: "none",
                verticalAlign: "baseline",
                "&:hover": { color: "primary.light" },
              }}
            >
              {isLogin ? "Cadastre-se" : "Faça Login"}
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* Toast centralizado para feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: "24px !important" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.type}
          variant="filled"
          icon={
            toast.type === "success" ? (
              <CheckCircle />
            ) : toast.type === "warning" ? (
              <WifiOff />
            ) : (
              <ErrorIcon />
            )
          }
          sx={{
            width: "100%",
            minWidth: 320,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            fontSize: "0.95rem",
            alignItems: "center",
            ...(toast.type === "success" && {
              bgcolor: "success.main",
              color: "black",
            }),
            ...(toast.type === "warning" && {
              bgcolor: "warning.main",
              color: "black",
            }),
            ...(toast.type === "error" && {
              bgcolor: "error.main",
              color: "white",
            }),
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginView;
