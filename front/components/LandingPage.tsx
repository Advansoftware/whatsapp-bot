import React from "react";

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-background text-text-main font-display antialiased selection:bg-primary/30 selection:text-primary min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-sm border-b border-surface-hover">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/20">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontSize: "22px" }}
                >
                  auto_awesome
                </span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-white">Respond</span>
                <span className="text-primary">IA</span>
              </span>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                Funcionalidades
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                Preços
              </button>
              <a
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
                href="#"
              >
                Documentação
              </a>
            </div>
            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onLoginClick}
                className="hidden sm:flex items-center justify-center px-4 h-9 rounded-md text-sm font-medium text-text-main hover:bg-surface-hover transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={onLoginClick}
                className="flex items-center justify-center px-5 h-9 rounded-md bg-primary hover:bg-primary-hover text-[#111b21] text-sm font-bold transition-all shadow-[0_0_15px_rgba(19,236,193,0.15)]"
              >
                Começar Agora
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Hero Content */}
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-surface-hover w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Secretária IA Integrada
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] tracking-tight">
                Sua <span className="text-primary">Secretária IA</span> no
                WhatsApp
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg">
                Automatize atendimento, gerencie agenda, controle despesas e
                organize tarefas. Uma secretária inteligente que aprende e
                memoriza conversas, integrada ao Calendário do Google e muito
                mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={onLoginClick}
                  className="flex items-center justify-center px-8 h-12 rounded-lg bg-primary hover:bg-primary-hover text-[#111b21] text-base font-bold transition-all transform hover:scale-[1.02] shadow-[0_4px_20px_rgba(19,236,193,0.2)]"
                >
                  Testar Grátis
                </button>
                <button className="flex items-center justify-center gap-2 px-8 h-12 rounded-lg bg-surface hover:bg-surface-hover border border-surface-hover text-text-main text-base font-medium transition-all">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "20px" }}
                  >
                    play_circle
                  </span>
                  Ver Demonstração
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-secondary pt-4">
                <div className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "16px" }}
                  >
                    check_circle
                  </span>
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "16px" }}
                  >
                    check_circle
                  </span>
                  <span>7 dias grátis</span>
                </div>
              </div>
            </div>

            {/* Hero Visual - Hidden on mobile, shown on lg+ */}
            <div className="hidden lg:flex relative lg:h-[550px] w-full items-center justify-center lg:justify-end">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]"></div>

              <div className="relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-surface-hover overflow-hidden flex flex-col h-[480px]">
                {/* Chat Header */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: "22px" }}
                    >
                      auto_awesome
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">
                      RespondIA
                    </h3>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      Respondendo agora...
                    </p>
                  </div>
                </div>

                {/* Chat Area */}
                <div
                  className="landing-chat-scroll flex-1 bg-[#0b141a] p-3 flex flex-col gap-3 overflow-y-auto relative"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255,255,255,0.2) transparent",
                  }}
                >
                  <style>{`
                    .landing-chat-scroll::-webkit-scrollbar { width: 6px; }
                    .landing-chat-scroll::-webkit-scrollbar-track { background: transparent; }
                    .landing-chat-scroll::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); border-radius: 3px; }
                    .landing-chat-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.3); }
                  `}</style>
                  <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                      backgroundImage:
                        "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5. truncated')",
                    }}
                  ></div>

                  {/* Mensagem do cliente */}
                  <div className="self-end max-w-[80%] relative z-10">
                    <div className="bg-[#005c4b] p-3 rounded-xl rounded-tr-sm shadow-sm text-sm text-white">
                      <p>Oi, queria agendar um horário pra amanhã às 15h</p>
                      <span className="text-[10px] text-white/60 block text-right mt-1 flex items-center justify-end gap-1">
                        10:42
                        <span className="material-symbols-outlined text-[12px] text-[#53bdeb]">
                          done_all
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Resposta da IA */}
                  <div className="self-start max-w-[80%] relative z-10">
                    <div className="bg-[#202c33] p-3 rounded-xl rounded-tl-sm shadow-sm text-sm text-white">
                      <p>Olá! 👋 Deixa eu verificar a agenda...</p>
                      <span className="text-[10px] text-white/40 block text-right mt-1">
                        10:42
                      </span>
                    </div>
                  </div>

                  {/* Resposta da IA com confirmação */}
                  <div className="self-start max-w-[80%] relative z-10">
                    <div className="bg-[#202c33] p-3 rounded-xl rounded-tl-sm shadow-sm text-sm text-white">
                      <p>
                        ✅ <strong>Horário disponível!</strong>
                      </p>
                      <p className="mt-2 text-white/80">Agendei para você:</p>
                      <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-primary font-medium">
                          📅 Amanhã, 15:00
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          Já adicionei na sua agenda
                        </p>
                      </div>
                      <p className="mt-2 text-white/80">
                        Posso ajudar em mais alguma coisa?
                      </p>
                      <span className="text-[10px] text-white/40 block text-right mt-1">
                        10:43
                      </span>
                    </div>
                  </div>

                  {/* Indicador de digitando */}
                  <div className="self-start max-w-[80%] relative z-10">
                    <div className="bg-[#202c33] px-4 py-3 rounded-xl rounded-tl-sm shadow-sm inline-flex gap-1">
                      <span
                        className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-white/40 text-xl">
                    sentiment_satisfied
                  </span>
                  <span className="material-symbols-outlined text-white/40 text-xl">
                    attach_file
                  </span>
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-sm text-white/40">
                    Mensagem
                  </div>
                  <span className="material-symbols-outlined text-white/40 text-xl">
                    mic
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 bg-surface border-y border-surface-hover">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Você se identifica com alguma dessas situações?
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-background p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="material-symbols-outlined text-red-400"
                  style={{ fontSize: "28px" }}
                >
                  schedule
                </span>
                <h3 className="text-lg font-bold text-white">Sem tempo</h3>
              </div>
              <p className="text-text-secondary text-sm">
                "Passo o dia inteiro respondendo WhatsApp e não consigo
                trabalhar no que realmente importa."
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="material-symbols-outlined text-red-400"
                  style={{ fontSize: "28px" }}
                >
                  person_off
                </span>
                <h3 className="text-lg font-bold text-white">
                  Perdendo clientes
                </h3>
              </div>
              <p className="text-text-secondary text-sm">
                "Cliente mandou mensagem às 22h, vi só no dia seguinte. Ele já
                tinha comprado do concorrente."
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="material-symbols-outlined text-red-400"
                  style={{ fontSize: "28px" }}
                >
                  event_busy
                </span>
                <h3 className="text-lg font-bold text-white">
                  Esquecendo compromissos
                </h3>
              </div>
              <p className="text-text-secondary text-sm">
                "Marquei uma reunião por WhatsApp e esqueci de anotar. Perdi o
                cliente."
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="material-symbols-outlined text-red-400"
                  style={{ fontSize: "28px" }}
                >
                  hearing_disabled
                </span>
                <h3 className="text-lg font-bold text-white">
                  Áudios intermináveis
                </h3>
              </div>
              <p className="text-text-secondary text-sm">
                "Cliente manda áudio de 5 minutos e não tenho tempo de ouvir.
                Acabo ignorando."
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="material-symbols-outlined text-red-400"
                  style={{ fontSize: "28px" }}
                >
                  money_off
                </span>
                <h3 className="text-lg font-bold text-white">
                  Gastando demais
                </h3>
              </div>
              <p className="text-text-secondary text-sm">
                "Queria uma secretária mas não posso pagar R$ 2.000/mês de
                salário + encargos."
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="material-symbols-outlined text-red-400"
                  style={{ fontSize: "28px" }}
                >
                  repeat
                </span>
                <h3 className="text-lg font-bold text-white">
                  Repetição infinita
                </h3>
              </div>
              <p className="text-text-secondary text-sm">
                "Respondo as mesmas perguntas 50 vezes por dia: preço, horário,
                endereço..."
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <p className="text-xl text-primary font-bold mb-2">
              ✨ E se existisse uma solução para tudo isso?
            </p>
            <p className="text-text-secondary">
              Uma secretária que trabalha 24h, nunca esquece nada, e custa menos
              que uma pizza por dia.
            </p>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="border-y border-surface-hover bg-background py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs md:text-sm font-medium text-text-secondary mb-6 md:mb-8">
            INTEGRAÇÕES DISPONÍVEIS
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8">
            <div className="flex flex-col items-center gap-2 text-white">
              <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">
                auto_awesome
              </span>
              <span className="font-medium text-sm md:text-base">
                IA Avançada
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 text-white">
              <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">
                calendar_month
              </span>
              <span className="font-medium text-sm md:text-base">
                Agenda Google
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 text-white">
              <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">
                chat
              </span>
              <span className="font-medium text-sm md:text-base">WhatsApp</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-white">
              <span className="material-symbols-outlined text-2xl md:text-3xl text-violet-500">
                bar_chart
              </span>
              <span className="font-medium text-sm md:text-base">
                Gastometria
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 text-white col-span-2 md:col-span-1">
              <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">
                graphic_eq
              </span>
              <span className="font-medium text-sm md:text-base">
                Transcrição
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-surface relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Como Funciona
            </h2>
            <p className="text-text-secondary text-lg">
              Configure sua Secretária IA em poucos minutos e veja a mágica
              acontecer.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-primary/20"></div>
              <h3 className="text-lg font-bold text-white mb-2">
                Conecte seu WhatsApp
              </h3>
              <p className="text-text-secondary text-sm">
                Escaneie o QR Code e conecte sua conta em segundos. Sem
                complicação.
              </p>
            </div>
            <div className="text-center relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-primary/20"></div>
              <h3 className="text-lg font-bold text-white mb-2">
                Configure a IA
              </h3>
              <p className="text-text-secondary text-sm">
                Defina o nome, tom de voz e informações do seu negócio ou vida
                pessoal.
              </p>
            </div>
            <div className="text-center relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 relative z-10">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-primary/20"></div>
              <h3 className="text-lg font-bold text-white mb-2">
                Integre Serviços
              </h3>
              <p className="text-text-secondary text-sm">
                Conecte sua Agenda do Google, configure automações de grupo e
                integrações.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
                <span
                  className="material-symbols-outlined text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  check
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pronto!</h3>
              <p className="text-text-secondary text-sm">
                Sua secretária começa a trabalhar 24/7, respondendo e
                organizando tudo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Recursos Completos para seu Negócio
            </h2>
            <p className="text-text-secondary text-lg">
              Uma plataforma completa com IA avançada, automações inteligentes e
              integrações poderosas.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  psychology
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Secretária IA
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Uma assistente inteligente com memória de conversas. Gerencia
                agenda, despesas, tarefas e responde como uma secretária
                profissional.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  calendar_month
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Integração com Agenda do Google
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Agende compromissos pelo WhatsApp. A IA verifica horários
                disponíveis e cria eventos automaticamente no seu calendário.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  auto_awesome
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Automações de Grupo
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Crie regras automáticas para grupos: colete dados de apostas,
                valores em dinheiro, e-mails. Perfeito para bolões e enquetes.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  record_voice_over
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Transcrição de Áudio
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Mensagens de voz são transcritas automaticamente. A IA entende e
                responde como se fosse texto normal.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  account_balance_wallet
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Controle de Despesas
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Registre gastos pelo WhatsApp: "Gastei 50 reais no mercado". A
                IA categoriza e controla suas finanças automaticamente.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  checklist
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Gestão de Tarefas
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Crie e gerencie tarefas por voz ou texto. A IA organiza
                prioridades, define prazos e envia lembretes automáticos.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  forum
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Chat ao Vivo
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Acompanhe todas as conversas em tempo real, incluindo grupos.
                Intervenha quando necessário e monitore o atendimento.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  campaign
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Campanhas em Massa
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Envie mensagens personalizadas para milhares de contatos.
                Programe campanhas e acompanhe métricas de entrega.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span
                  className="material-symbols-outlined text-primary group-hover:text-[#111b21]"
                  style={{ fontSize: "28px" }}
                >
                  inventory_2
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Gestão de Estoque
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Controle seu inventário integrado ao WhatsApp. A IA consulta
                disponibilidade e informa clientes automaticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-surface relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Casos de Uso
            </h2>
            <p className="text-text-secondary text-lg">
              Veja como nossos usuários estão aproveitando a plataforma.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-background p-6 rounded-xl border border-surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "24px" }}
                >
                  casino
                </span>
                <h3 className="text-lg font-bold text-white">
                  Bolão da Mega-Sena
                </h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                "Crio uma automação temporária no grupo que coleta os números
                apostados por cada participante. No final, tenho um relatório
                completo!"
              </p>
              <span className="text-xs text-primary">Automações de Grupo</span>
            </div>
            <div className="bg-background p-6 rounded-xl border border-surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "24px" }}
                >
                  restaurant
                </span>
                <h3 className="text-lg font-bold text-white">
                  Restaurante Delivery
                </h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                "A IA atende pedidos, verifica cardápio e disponibilidade no
                estoque. Reduzi 80% das ligações telefônicas."
              </p>
              <span className="text-xs text-primary">
                Secretária IA + Estoque
              </span>
            </div>
            <div className="bg-background p-6 rounded-xl border border-surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "24px" }}
                >
                  spa
                </span>
                <h3 className="text-lg font-bold text-white">
                  Clínica de Estética
                </h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                "Pacientes agendam consultas pelo WhatsApp e já aparece direto
                na minha Agenda do Google. Nunca mais perdi um horário!"
              </p>
              <span className="text-xs text-primary">Agenda do Google</span>
            </div>
            <div className="bg-background p-6 rounded-xl border border-surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "24px" }}
                >
                  attach_money
                </span>
                <h3 className="text-lg font-bold text-white">
                  Controle Financeiro
                </h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                "Envio áudio: 'Gastei 150 no mercado'. A IA transcreve,
                categoriza e no final do mês tenho meu relatório de despesas."
              </p>
              <span className="text-xs text-primary">
                Despesas + Transcrição
              </span>
            </div>
            <div className="bg-background p-6 rounded-xl border border-surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "24px" }}
                >
                  groups
                </span>
                <h3 className="text-lg font-bold text-white">
                  Rifa Beneficente
                </h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                "A automação coleta os números escolhidos e valores pagos. Posso
                ver quem confirmou e o total arrecadado em tempo real."
              </p>
              <span className="text-xs text-primary">Automações de Grupo</span>
            </div>
            <div className="bg-background p-6 rounded-xl border border-surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "24px" }}
                >
                  work
                </span>
                <h3 className="text-lg font-bold text-white">Freelancer</h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                "Minha secretária IA responde clientes, agenda reuniões e me
                lembra das tarefas do dia. Funciona mesmo quando durmo!"
              </p>
              <span className="text-xs text-primary">
                Secretária IA + Tarefas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-20 bg-background border-y border-surface-hover">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
            <div className="p-3 md:p-4">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                9+
              </div>
              <div className="text-xs md:text-sm text-text-secondary uppercase tracking-wide">
                Recursos
              </div>
            </div>
            <div className="p-3 md:p-4">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                IA
              </div>
              <div className="text-xs md:text-sm text-text-secondary uppercase tracking-wide">
                Inteligente
              </div>
            </div>
            <div className="p-3 md:p-4">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                24/7
              </div>
              <div className="text-xs md:text-sm text-text-secondary uppercase tracking-wide">
                Automático
              </div>
            </div>
            <div className="p-3 md:p-4">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                ∞
              </div>
              <div className="text-xs md:text-sm text-text-secondary uppercase tracking-wide">
                Memória
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gastometria Partnership Section */}
      <section className="py-12 md:py-20 bg-gradient-to-r from-violet-600/10 via-[#0d0d1a] to-purple-600/10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-violet-500/30 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 mb-4">
                <span
                  className="material-symbols-outlined text-violet-400"
                  style={{ fontSize: "16px" }}
                >
                  bar_chart
                </span>
                <span className="text-xs font-medium text-violet-300 uppercase tracking-wider">
                  Parceria Exclusiva
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                Sua vida financeira,{" "}
                <span className="text-violet-400">sob controle total.</span>
              </h2>
              <p className="text-gray-400 text-base md:text-lg mb-6 max-w-xl">
                O <strong className="text-violet-400">Gastometria</strong> é o
                app de gestão financeira pessoal com IA que categoriza seus
                gastos automaticamente, cria metas, gera relatórios e conecta
                com seu banco via Open Finance.
                <span className="text-white font-medium">
                  {" "}
                  Clientes Gastometria integram o controle financeiro ao
                  WhatsApp{" "}
                  <span className="text-emerald-400">sem custo adicional!</span>
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  📊 Relatórios Inteligentes
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  🎯 Metas Financeiras
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  🤖 IA Categoriza Tudo
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  🏦 Open Finance
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="https://gastometria.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all shadow-lg shadow-violet-500/20"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px" }}
                  >
                    open_in_new
                  </span>
                  Conhecer Gastometria
                </a>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-violet-500/50 text-violet-400 font-medium hover:bg-violet-500/10 transition-all"
                >
                  Ver plano especial
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px" }}
                  >
                    arrow_downward
                  </span>
                </button>
              </div>
            </div>
            {/* Visual */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-56 h-56 md:w-72 md:h-72 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/30 p-4">
                  <div className="text-center mb-3">
                    <span
                      className="material-symbols-outlined text-violet-400"
                      style={{ fontSize: "40px" }}
                    >
                      account_balance_wallet
                    </span>
                    <p className="text-violet-300 font-bold text-lg">
                      Gastometria
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-left">
                    <div className="flex items-center gap-2 bg-violet-500/10 px-2 py-1 rounded">
                      <span
                        className="material-symbols-outlined text-emerald-400"
                        style={{ fontSize: "14px" }}
                      >
                        check_circle
                      </span>
                      <span className="text-gray-300">Múltiplas carteiras</span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-500/10 px-2 py-1 rounded">
                      <span
                        className="material-symbols-outlined text-emerald-400"
                        style={{ fontSize: "14px" }}
                      >
                        check_circle
                      </span>
                      <span className="text-gray-300">
                        IA categoriza gastos
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-500/10 px-2 py-1 rounded">
                      <span
                        className="material-symbols-outlined text-emerald-400"
                        style={{ fontSize: "14px" }}
                      >
                        check_circle
                      </span>
                      <span className="text-gray-300">Metas financeiras</span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-500/10 px-2 py-1 rounded">
                      <span
                        className="material-symbols-outlined text-emerald-400"
                        style={{ fontSize: "14px" }}
                      >
                        check_circle
                      </span>
                      <span className="text-gray-300">Open Finance</span>
                    </div>
                  </div>
                </div>
                {/* Badge */}
                <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  GRÁTIS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4">
              Planos simples e transparentes
            </h2>
            <p className="text-text-secondary text-base md:text-lg">
              Escolha o plano ideal. Cancele a qualquer momento.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Starter Plan */}
            <div className="bg-surface rounded-2xl border border-surface-hover p-6 md:p-8 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Essencial
              </h3>
              <p className="text-text-secondary text-xs md:text-sm mb-4 md:mb-6">
                Pare de perder clientes por não responder a tempo.
              </p>
              <div className="mb-4 md:mb-6">
                <span className="text-3xl md:text-4xl font-bold text-white">
                  R$ 197
                </span>
                <span className="text-text-secondary text-sm">/mês</span>
              </div>
              <button
                onClick={onLoginClick}
                className="w-full py-3 rounded-lg border border-primary text-primary font-bold hover:bg-primary/10 transition-colors mb-6 md:mb-8 text-sm md:text-base"
              >
                Testar 7 Dias Grátis
              </button>
              <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[18px] md:text-[20px]">
                    check
                  </span>
                  Respostas automáticas 24h
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Entende áudios longos pra você
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Lembra das conversas anteriores
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Até 1.000 mensagens/mês
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Suporte por WhatsApp
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-surface rounded-2xl border-2 border-primary p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-primary/10">
              <div className="absolute top-0 right-0 bg-primary text-[#111b21] text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                MAIS VENDIDO
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Profissional
              </h3>
              <p className="text-text-secondary text-sm mb-6">
                Nunca mais perca um cliente ou compromisso.
              </p>
              <div className="mb-2">
                <span className="text-lg text-text-secondary line-through">
                  R$ 497
                </span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 297</span>
                <span className="text-text-secondary">/mês</span>
              </div>
              <button
                onClick={onLoginClick}
                className="w-full py-3 rounded-lg bg-primary text-[#111b21] font-bold hover:bg-primary-hover transition-colors mb-8 shadow-lg shadow-primary/20"
              >
                Quero Minha Secretária IA
              </button>
              <ul className="space-y-4 text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  <span className="font-bold text-white">
                    Atendimento 24h sem você fazer nada
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Agenda compromissos na sua agenda
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Controla suas despesas automaticamente
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Cria e lembra suas tarefas
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Transcreve áudios longos em segundos
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Mensagens ilimitadas
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Suporte prioritário
                </li>
              </ul>
            </div>

            {/* Gastometria Plan */}
            <div className="bg-surface rounded-2xl border border-violet-500/30 p-8 flex flex-col relative">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                🎁 GRÁTIS
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Já usa Gastometria?
              </h3>
              <p className="text-text-secondary text-sm mb-6">
                Integre o controle financeiro ao WhatsApp usando seus próprios
                créditos de IA.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-emerald-400">
                  Grátis
                </span>
                <span className="text-text-secondary text-sm ml-2">
                  usa créditos do seu plano
                </span>
              </div>
              <a
                href="https://gastometria.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold transition-colors mb-8 text-center block"
              >
                Conhecer Gastometria
              </a>
              <ul className="space-y-4 text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">
                    check
                  </span>
                  Registre gastos pelo WhatsApp
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">
                    check
                  </span>
                  Envie fotos de notas fiscais
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">
                    check
                  </span>
                  IA categoriza automaticamente
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">
                    check
                  </span>
                  Usa créditos do seu Gastometria
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-violet-400 text-[20px]">
                    add_circle
                  </span>
                  <span className="text-text-secondary">
                    Quer agenda, tarefas e mais?{" "}
                    <span className="text-violet-400">+R$ 47/mês</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-surface rounded-2xl border border-slate-500/30 p-6 md:p-8 flex flex-col relative">
              <div className="absolute top-0 right-0 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                🏢 EMPRESAS
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Empresarial
              </h3>
              <p className="text-text-secondary text-xs md:text-sm mb-4 md:mb-6">
                Soluções personalizadas para sua empresa.
              </p>
              <div className="mb-4 md:mb-6">
                <span className="text-2xl md:text-3xl font-bold text-white">
                  Sob consulta
                </span>
              </div>
              <a
                href="https://wa.me/5535984216196?text=Olá!%20Tenho%20interesse%20no%20plano%20Empresarial%20do%20RespondIA."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-colors mb-6 md:mb-8 text-sm md:text-base flex items-center justify-center gap-2"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
                >
                  chat
                </span>
                Falar no WhatsApp
              </a>
              <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Múltiplos números de WhatsApp
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Equipe com vários atendentes
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Integrações personalizadas
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  Treinamento da IA para seu negócio
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    check
                  </span>
                  <span className="font-bold text-white">Suporte dedicado</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-background">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#202c33 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          ></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Tenha sua Secretária IA hoje
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Agenda, tarefas, despesas e atendimento automatizado. Tudo integrado
            ao seu WhatsApp. Comece a testar gratuitamente em minutos.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={onLoginClick}
              className="flex items-center justify-center px-8 h-14 rounded-lg bg-primary hover:bg-primary-hover text-[#111b21] text-lg font-bold transition-all shadow-[0_4px_20px_rgba(19,236,193,0.3)]"
            >
              Criar Conta Grátis
            </button>
            <a
              href="https://wa.me/5535984216196?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20o%20RespondIA."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 h-14 rounded-lg bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-white text-lg font-medium transition-all"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "22px" }}
              >
                chat
              </span>
              Falar com Vendas
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-surface-hover pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/20">
                  <span
                    className="material-symbols-outlined text-white"
                    style={{ fontSize: "20px" }}
                  >
                    auto_awesome
                  </span>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-white">Respond</span>
                  <span className="text-primary">IA</span>
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Sua secretária IA no WhatsApp. Automatize atendimento, agenda e
                muito mais.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Produto</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                    href="#"
                  >
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                    href="#"
                  >
                    Preços
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Empresa</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                    href="#"
                  >
                    Sobre
                  </a>
                </li>
                <li>
                  <a
                    className="text-text-secondary hover:text-primary text-sm transition-colors"
                    href="#"
                  >
                    Contato
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-surface-hover pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-secondary text-sm">
              © 2026 RespondIA. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
