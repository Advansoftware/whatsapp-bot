# RespondIA

Sua secretária IA no WhatsApp. Sistema completo de automação para WhatsApp com processamento de mensagens via IA, arquitetura escalável com filas e painel administrativo moderno.

## 🏗️ Arquitetura

```
whatsapp-bot/
├── front/               # Dashboard React + MUI + Google OAuth
│   ├── components/      # Componentes React (Dashboard, Connections, etc)
│   ├── contexts/        # AuthContext (gerenciamento de autenticação)
│   ├── hooks/           # Custom hooks (useApi, useDashboardStats, etc)
│   └── lib/             # API client
├── backend/             # API NestJS + BullMQ + JWT
│   ├── src/
│   │   ├── api/         # Controllers REST (dashboard, connections, messages)
│   │   ├── auth/        # Google OAuth + JWT
│   │   ├── queue/       # BullMQ workers
│   │   ├── webhook/     # Evolution API webhook
│   │   └── prisma/      # Database service
│   └── prisma/          # Schema do banco
├── docker-compose.yml   # Orquestração completa
└── .env.example         # Variáveis de ambiente
```

### Stack Técnica

| Camada         | Tecnologia                                         |
| -------------- | -------------------------------------------------- |
| Frontend       | React 19, Material UI 7, Vite, @react-oauth/google |
| Backend        | NestJS, Prisma, BullMQ, Passport JWT               |
| Banco de Dados | PostgreSQL 15                                      |
| Fila/Cache     | Redis 7                                            |
| WhatsApp       | Evolution API v2.1.1                               |
| Autenticação   | Google OAuth 2.0 + JWT                             |

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20+
- Docker & Docker Compose

### Configuração Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth client ID**
5. Selecione **Web application**
6. Adicione as origens autorizadas:
   - `http://localhost:5173` (desenvolvimento)
   - `http://localhost:4000` (backend)
7. Copie o **Client ID** e **Client Secret**

### Instalação com Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Advansoftware/whatsapp-bot.git
cd whatsapp-bot

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Google

# Inicie todos os serviços
docker-compose up -d

# Acesse:
# Frontend: http://localhost:5173
# Backend: http://localhost:4000
# (pgAdmin e Evolution são internos, sem acesso externo)
```

### Instalação Manual

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Configure .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev

# Frontend (em outro terminal)
cd front
npm install
cp .env.example .env.local
# Configure VITE_GOOGLE_CLIENT_ID
npm run dev
```

## 🔒 Autenticação

O sistema usa **Google OAuth** como único método de login:

1. Usuário clica em "Continuar com Google"
2. Frontend recebe ID Token do Google
3. Backend valida o token com Google API
4. Backend cria usuário (se novo) e retorna JWT
5. Frontend armazena JWT e usa em todas as requisições

## 📡 Endpoints da API

### Autenticação
| Método | Rota           | Descrição                 |
| ------ | -------------- | ------------------------- |
| POST   | `/auth/google` | Login com Google ID Token |
| GET    | `/auth/me`     | Perfil do usuário atual   |
| GET    | `/auth/verify` | Verificar validade do JWT |

### Dashboard
| Método | Rota                      | Descrição                    |
| ------ | ------------------------- | ---------------------------- |
| GET    | `/api/dashboard/stats`    | Estatísticas gerais          |
| GET    | `/api/dashboard/activity` | Atividade dos últimos 7 dias |

### Conexões WhatsApp
| Método | Rota                              | Descrição            |
| ------ | --------------------------------- | -------------------- |
| GET    | `/api/connections`                | Listar instâncias    |
| POST   | `/api/connections`                | Criar nova instância |
| DELETE | `/api/connections/:id`            | Excluir instância    |
| POST   | `/api/connections/:id/refresh-qr` | Recarregar QR Code   |

### Mensagens
| Método | Rota                   | Descrição                   |
| ------ | ---------------------- | --------------------------- |
| GET    | `/api/messages`        | Listar mensagens (paginado) |
| GET    | `/api/messages/recent` | Conversas recentes          |

### Webhook
| Método | Rota                 | Descrição                       |
| ------ | -------------------- | ------------------------------- |
| POST   | `/webhook/evolution` | Recebe eventos da Evolution API |

## 🔄 Fluxo de Processamento

1. **Evolution API** recebe mensagem do WhatsApp
2. **Webhook** valida e enfileira na fila `whatsapp-incoming`
3. **Worker** processa com rate limit (5 msgs/seg)
4. Verifica **saldo da empresa** no banco
5. Consulta **API de IA** (Gemini)
6. Envia **resposta** via Evolution API

## 📦 Scripts

### Backend
```bash
npm run dev        # Desenvolvimento
npm run build      # Build produção
npm run start:prod # Produção
npm run prisma:studio # Visualizar banco
```

### Frontend
```bash
npm run dev      # Desenvolvimento
npm run build    # Build produção
npm run preview  # Testar build
```

## 🐳 Docker

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar serviço específico
docker-compose restart backend

# Parar tudo
docker-compose down
```

## 📄 Licença

MIT © Advansoftware
