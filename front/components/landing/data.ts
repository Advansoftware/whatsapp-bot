import {
  SmartToy,
  CalendarMonth,
  RecordVoiceOver,
  AttachMoney,
  Task,
  Groups,
  Send,
  Psychology,
  Inventory,
} from "@mui/icons-material";
import { ReactNode } from "react";

export interface PainPoint {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface UseCase {
  icon: string;
  title: string;
  description: string;
  tag: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
}

export interface Integration {
  icon: ReactNode;
  label: string;
}

export interface HowItWorksStep {
  step: string;
  title: string;
  desc: string;
  done?: boolean;
}

// Pain points data - using createElement for icons to avoid JSX in .ts
import React from "react";

export const createPainPoints = (): PainPoint[] => [
  {
    icon: React.createElement("span", { style: { fontSize: 24 } }, "😰"),
    title: "Mensagens sem resposta",
    description: "Clientes mandam mensagem e ficam sem retorno por horas. Cada minuto sem resposta é uma venda perdida.",
  },
  {
    icon: React.createElement("span", { style: { fontSize: 24 } }, "📅"),
    title: "Agenda desorganizada",
    description: "Compromissos esquecidos, horários conflitantes e clientes frustrados por remarcações de última hora.",
  },
  {
    icon: React.createElement("span", { style: { fontSize: 24 } }, "💸"),
    title: "Gastos descontrolados",
    description: "No fim do mês, não sabe para onde foi o dinheiro. Planilhas que nunca são atualizadas.",
  },
  {
    icon: React.createElement("span", { style: { fontSize: 24 } }, "📝"),
    title: "Tarefas esquecidas",
    description: "Post-its, apps de notas, lembretes... mas sempre esquece algo importante.",
  },
  {
    icon: React.createElement("span", { style: { fontSize: 24 } }, "🎤"),
    title: "Áudios infinitos",
    description: "Recebe áudios de 3 minutos e não tem tempo de ouvir. Informações importantes se perdem.",
  },
  {
    icon: React.createElement("span", { style: { fontSize: 24 } }, "🔄"),
    title: "Trabalho repetitivo",
    description: "Responde as mesmas perguntas o dia todo. Tempo desperdiçado que poderia ser usado em vendas.",
  },
];

export const createFeatures = (): Feature[] => [
  {
    icon: React.createElement(SmartToy),
    title: "Secretária IA 24/7",
    description: "Responde automaticamente, entende contexto, memoriza conversas e encaminha casos complexos para você.",
  },
  {
    icon: React.createElement(CalendarMonth),
    title: "Agenda do Google",
    description: "Agende compromissos pelo WhatsApp que aparecem direto no seu calendário. Com lembretes automáticos.",
  },
  {
    icon: React.createElement(RecordVoiceOver),
    title: "Transcrição de Áudio",
    description: "Transforma áudios em texto automaticamente. Nunca mais perca informação importante.",
  },
  {
    icon: React.createElement(AttachMoney),
    title: "Controle de Despesas",
    description: "Registre gastos por texto ou áudio. IA categoriza automaticamente e gera relatórios.",
  },
  {
    icon: React.createElement(Task),
    title: "Gerenciador de Tarefas",
    description: "Crie, organize e receba lembretes de tarefas. Tudo pelo WhatsApp de forma natural.",
  },
  {
    icon: React.createElement(Groups),
    title: "Automações de Grupo",
    description: "Colete dados, faça enquetes e organize informações de grupos automaticamente.",
  },
  {
    icon: React.createElement(Send),
    title: "Campanhas em Massa",
    description: "Envie mensagens personalizadas para listas de contatos com agendamento inteligente.",
  },
  {
    icon: React.createElement(Psychology),
    title: "Memória Contextual",
    description: "A IA lembra de conversas anteriores e usa o contexto para respostas mais precisas.",
  },
  {
    icon: React.createElement(Inventory),
    title: "Gestão de Estoque",
    description: "Controle produtos e disponibilidade. A IA verifica antes de confirmar pedidos.",
  },
];

export const useCases: UseCase[] = [
  {
    icon: "🎰",
    title: "Bolão da Mega-Sena",
    description: '"Crio uma automação temporária no grupo que coleta os números apostados por cada participante. No final, tenho um relatório completo!"',
    tag: "Automações de Grupo",
  },
  {
    icon: "🍽️",
    title: "Restaurante Delivery",
    description: '"A IA atende pedidos, verifica cardápio e disponibilidade no estoque. Reduzi 80% das ligações telefônicas."',
    tag: "Secretária IA + Estoque",
  },
  {
    icon: "💆",
    title: "Clínica de Estética",
    description: '"Pacientes agendam consultas pelo WhatsApp e já aparece direto na minha Agenda do Google. Nunca mais perdi um horário!"',
    tag: "Agenda do Google",
  },
  {
    icon: "💰",
    title: "Controle Financeiro",
    description: '"Envio áudio: \'Gastei 150 no mercado\'. A IA transcreve, categoriza e no final do mês tenho meu relatório de despesas."',
    tag: "Despesas + Transcrição",
  },
  {
    icon: "👥",
    title: "Rifa Beneficente",
    description: '"A automação coleta os números escolhidos e valores pagos. Posso ver quem confirmou e o total arrecadado em tempo real."',
    tag: "Automações de Grupo",
  },
  {
    icon: "🏋️",
    title: "Personal Trainer",
    description: '"Meus alunos agendam treinos e a IA organiza minha semana. Ainda envia lembretes automáticos um dia antes."',
    tag: "Agenda + Tarefas",
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    description: "Perfeito para começar a automatizar",
    features: ["1 conexão WhatsApp", "Secretária IA básica", "Transcrição de áudio", "Suporte por e-mail"],
    popular: false,
  },
  {
    name: "Professional",
    price: "R$ 197",
    period: "/mês",
    description: "Para negócios em crescimento",
    features: ["3 conexões WhatsApp", "Secretária IA avançada", "Integração Google Calendar", "Automações de grupo", "CRM completo", "Suporte prioritário"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "R$ 497",
    period: "/mês",
    description: "Solução completa para grandes operações",
    features: ["10 conexões WhatsApp", "Todas as funcionalidades", "Campanhas em massa", "API personalizada", "Gerente de conta dedicado", "SLA garantido"],
    popular: false,
  },
];

export const howItWorksSteps: HowItWorksStep[] = [
  { step: "1", title: "Conecte seu WhatsApp", desc: "Escaneie o QR Code e conecte sua conta em segundos. Sem complicação." },
  { step: "2", title: "Configure a IA", desc: "Defina o nome, tom de voz e informações do seu negócio ou vida pessoal." },
  { step: "3", title: "Integre Serviços", desc: "Conecte sua Agenda do Google, configure automações de grupo e integrações." },
  { step: "✓", title: "Pronto!", desc: "Sua secretária começa a trabalhar 24/7, respondendo e organizando tudo.", done: true },
];

export const gastometriaFeatures = [
  { text: "Registre gastos pelo WhatsApp" },
  { text: "Envie fotos de notas fiscais" },
  { text: "IA categoriza automaticamente" },
  { text: "Sincroniza com seu Gastometria" },
  { text: "Relatórios financeiros completos" },
];

export const gastometriaPlanFeatures = {
  headers: ["Básico", "Pro", "Plus", "Infinity"],
  rows: [
    { label: "Carteiras", values: ["Até 3", "Ilimitadas", "Ilimitadas", "Ilimitadas"] },
    { label: "Créditos IA/mês", values: ["0", "100", "300", "500"] },
    { label: "Importação CSV/OFX", values: ["✓", "✓", "✓", "✓"] },
    { label: "OCR notas fiscais", values: ["✕", "✓", "✓", "✓"] },
    { label: "Suporte", values: ["Email", "Prioritário", "24/7", "24/7"] },
  ],
};
