import React from 'react';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>smart_toy</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">AutoMsg</span>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Funcionalidades</button>
              <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Preços</button>
              <a className="text-sm font-medium text-text-secondary hover:text-primary transition-colors" href="#">API Docs</a>
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
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">v2.0 Disponível</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] tracking-tight">
                Automatize <span className="text-primary">90%</span> do seu Suporte ao Cliente
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg">
                A solução de automação white-label para WhatsApp projetada para agências de alto crescimento. Crie chatbots, dispare mensagens e gerencie tickets de suporte sem escrever código.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button 
                  onClick={onLoginClick}
                  className="flex items-center justify-center px-8 h-12 rounded-lg bg-primary hover:bg-primary-hover text-[#111b21] text-base font-bold transition-all transform hover:scale-[1.02] shadow-[0_4px_20px_rgba(19,236,193,0.2)]"
                >
                  Testar Grátis
                </button>
                <button className="flex items-center justify-center gap-2 px-8 h-12 rounded-lg bg-surface hover:bg-surface-hover border border-surface-hover text-text-main text-base font-medium transition-all">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>play_circle</span>
                  Ver Demo
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-secondary pt-4">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>check_circle</span>
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>check_circle</span>
                  <span>14 dias grátis</span>
                </div>
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className="relative lg:h-[600px] w-full flex items-center justify-center lg:justify-end">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
              
              <div className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl border border-surface-hover overflow-hidden flex flex-col h-[520px]">
                {/* Chat Header */}
                <div className="bg-surface-hover px-4 py-3 flex items-center justify-between border-b border-background/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <span className="material-symbols-outlined text-text-secondary">person</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-main">Bot de Suporte</h3>
                      <p className="text-xs text-primary">Online</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-text-secondary">
                    <span className="material-symbols-outlined cursor-pointer hover:text-text-main">search</span>
                    <span className="material-symbols-outlined cursor-pointer hover:text-text-main">more_vert</span>
                  </div>
                </div>
                
                {/* Chat Area */}
                <div className="flex-1 bg-wa-chatbg p-4 flex flex-col gap-4 overflow-y-auto bg-opacity-10 relative">
                  <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-10 pointer-events-none"></div>
                  
                  {/* Incoming */}
                  <div className="self-start max-w-[85%] relative z-10">
                    <div className="bg-wa-incoming p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-text-main">
                      <p>Olá! 👋 Bem-vindo ao AutoMsg. Como podemos ajudar a escalar seu negócio hoje?</p>
                      <span className="text-[10px] text-text-secondary block text-right mt-1">10:42</span>
                    </div>
                  </div>
                  
                  {/* Outgoing */}
                  <div className="self-end max-w-[85%] relative z-10">
                    <div className="bg-wa-outgoing p-3 rounded-lg rounded-tr-none shadow-sm text-sm text-text-main">
                      <p>Gostaria de saber mais sobre a integração da API.</p>
                      <span className="text-[10px] text-primary/70 block text-right mt-1 flex items-center justify-end gap-1">
                        10:43 <span className="material-symbols-outlined text-[14px]">done_all</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Incoming Automated */}
                  <div className="self-start max-w-[85%] relative z-10">
                    <div className="bg-wa-incoming p-3 rounded-lg rounded-tl-none shadow-sm text-sm text-text-main">
                      <p>Ótimo! Nossa API permite que você:</p>
                      <ul className="list-disc ml-4 mt-2 space-y-1 text-text-secondary">
                        <li>Envie mensagens programáticas</li>
                        <li>Gerencie webhooks</li>
                        <li>Sincronize contatos automaticamente</li>
                      </ul>
                      <div className="mt-3 pt-3 border-t border-surface-hover flex gap-2">
                        <button className="flex-1 bg-surface-hover hover:bg-background py-2 rounded text-xs font-medium text-primary transition-colors">Ler Docs</button>
                        <button className="flex-1 bg-surface-hover hover:bg-background py-2 rounded text-xs font-medium text-primary transition-colors">Ver Chave</button>
                      </div>
                      <span className="text-[10px] text-text-secondary block text-right mt-1">10:43</span>
                    </div>
                  </div>
                </div>
                
                {/* Input */}
                <div className="bg-surface px-4 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary cursor-pointer">sentiment_satisfied</span>
                  <span className="material-symbols-outlined text-text-secondary cursor-pointer">attach_file</span>
                  <div className="flex-1 bg-surface-hover rounded-lg px-4 py-2 text-sm text-text-secondary">
                    Digite uma mensagem
                  </div>
                  <span className="material-symbols-outlined text-text-secondary cursor-pointer">mic</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Logos */}
      <section className="border-y border-surface-hover bg-background py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-text-secondary mb-8">CONFIADO POR MAIS DE 500 AGÊNCIAS EM TODO O MUNDO</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="h-8 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-3xl">deployed_code</span>
              <span className="font-bold text-xl">TechFlow</span>
            </div>
            <div className="h-8 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-3xl">token</span>
              <span className="font-bold text-xl">Orbit</span>
            </div>
            <div className="h-8 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-3xl">all_inclusive</span>
              <span className="font-bold text-xl">Infinite</span>
            </div>
            <div className="h-8 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-3xl">spa</span>
              <span className="font-bold text-xl">GrowthLeaf</span>
            </div>
            <div className="h-8 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-3xl">bolt</span>
              <span className="font-bold text-xl">FastScale</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Tudo o que você precisa para escalar</h2>
            <p className="text-text-secondary text-lg">Recursos poderosos projetados para comunicação de alto volume e integração perfeita com seu stack existente.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span className="material-symbols-outlined text-primary group-hover:text-[#111b21]" style={{ fontSize: '28px' }}>inventory_2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Gestão de Estoque IA</h3>
              <p className="text-text-secondary leading-relaxed">
                A IA verifica seu estoque em tempo real. Se um cliente pedir "Cerveja Gelada", ela sabe exatamente quantas restam.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span className="material-symbols-outlined text-primary group-hover:text-[#111b21]" style={{ fontSize: '28px' }}>api</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Setup Instantâneo de API</h3>
              <p className="text-text-secondary leading-relaxed">
                Comece em minutos com nossa documentação robusta. Conecte seu CRM, ERP ou dashboard personalizado sem problemas.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span className="material-symbols-outlined text-primary group-hover:text-[#111b21]" style={{ fontSize: '28px' }}>groups</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Suporte Multi-Agente</h3>
              <p className="text-text-secondary leading-relaxed">
                Colabore com toda a sua equipe de suporte em uma única caixa de entrada compartilhada. Atribua chats e deixe notas internas.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span className="material-symbols-outlined text-primary group-hover:text-[#111b21]" style={{ fontSize: '28px' }}>smart_toy</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Construtor No-Code</h3>
              <p className="text-text-secondary leading-relaxed">
                Arraste e solte para criar fluxos de conversa complexos. Automatize FAQs, qualificação de leads e agendamentos.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span className="material-symbols-outlined text-primary group-hover:text-[#111b21]" style={{ fontSize: '28px' }}>broadcast_on_personal</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Disparo em Massa</h3>
              <p className="text-text-secondary leading-relaxed">
                Envie campanhas personalizadas para milhares de contatos instantaneamente com altas taxas de entrega e segurança.
              </p>
            </div>
            <div className="bg-surface p-8 rounded-xl border border-surface-hover hover:border-primary/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-all">
                <span className="material-symbols-outlined text-primary group-hover:text-[#111b21]" style={{ fontSize: '28px' }}>verified_user</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Verificação Green Tick</h3>
              <p className="text-text-secondary leading-relaxed">
                Auxiliamos você no processo de obtenção do Selo Verde oficial da Meta para construir confiança imediata.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-surface border-y border-surface-hover">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-surface-hover/50">
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-sm text-text-secondary uppercase tracking-wide">SLA de Uptime</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">100M+</div>
              <div className="text-sm text-text-secondary uppercase tracking-wide">Mensagens Enviadas</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-sm text-text-secondary uppercase tracking-wide">Agências Globais</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-sm text-text-secondary uppercase tracking-wide">Suporte Prioritário</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Planos simples e transparentes</h2>
            <p className="text-text-secondary text-lg">Escolha o plano ideal para o tamanho da sua operação. Cancele a qualquer momento.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-surface rounded-2xl border border-surface-hover p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-text-secondary text-sm mb-6">Perfeito para pequenas empresas iniciantes.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 197</span>
                <span className="text-text-secondary">/mês</span>
              </div>
              <button onClick={onLoginClick} className="w-full py-3 rounded-lg border border-primary text-primary font-bold hover:bg-primary/10 transition-colors mb-8">
                Começar Grátis
              </button>
              <ul className="space-y-4 text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  1 Número de WhatsApp
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  Chatbot Básico
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  1.000 Mensagens/mês
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  Suporte por E-mail
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-surface rounded-2xl border-2 border-primary p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-primary/10">
              <div className="absolute top-0 right-0 bg-primary text-[#111b21] text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                MAIS POPULAR
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-text-secondary text-sm mb-6">Para empresas em crescimento e automação total.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 497</span>
                <span className="text-text-secondary">/mês</span>
              </div>
              <button onClick={onLoginClick} className="w-full py-3 rounded-lg bg-primary text-[#111b21] font-bold hover:bg-primary-hover transition-colors mb-8 shadow-lg shadow-primary/20">
                Assinar Agora
              </button>
              <ul className="space-y-4 text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  3 Números de WhatsApp
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  <span className="font-bold text-white">Gestão de Estoque IA</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  Chatbot Avançado (GPT-4)
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  Mensagens Ilimitadas
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  Disparo em Massa
                </li>
              </ul>
            </div>

            {/* Agency Plan */}
            <div className="bg-surface rounded-2xl border border-surface-hover p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Agency</h3>
              <p className="text-text-secondary text-sm mb-6">Para revendedores e grandes operações.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ 997</span>
                <span className="text-text-secondary">/mês</span>
              </div>
              <button className="w-full py-3 rounded-lg border border-surface-hover bg-surface-hover text-white font-bold hover:bg-[#2a3942] transition-colors mb-8">
                Falar com Vendas
              </button>
              <ul className="space-y-4 text-sm text-text-secondary flex-1">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  10+ Números de WhatsApp
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  White-label Completo
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  API Dedicada
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                  Gerente de Contas
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
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#202c33 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Pronto para transformar seu suporte?</h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            Junte-se a centenas de empresas automatizando sua comunicação no WhatsApp. Configure seu primeiro bot em menos de 15 minutos.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onLoginClick}
              className="flex items-center justify-center px-8 h-14 rounded-lg bg-primary hover:bg-primary-hover text-[#111b21] text-lg font-bold transition-all shadow-[0_4px_20px_rgba(19,236,193,0.3)]"
            >
              Criar Conta Grátis
            </button>
            <button className="flex items-center justify-center px-8 h-14 rounded-lg bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-white text-lg font-medium transition-all">
              Falar com Vendas
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-surface-hover pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>smart_toy</span>
                <span className="text-xl font-bold text-white">AutoMsg</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                A plataforma líder em automação de WhatsApp para empresas inovadoras.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Produto</h3>
              <ul className="space-y-3">
                <li><a className="text-text-secondary hover:text-primary text-sm transition-colors" href="#">Funcionalidades</a></li>
                <li><a className="text-text-secondary hover:text-primary text-sm transition-colors" href="#">Preços</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Empresa</h3>
              <ul className="space-y-3">
                <li><a className="text-text-secondary hover:text-primary text-sm transition-colors" href="#">Sobre</a></li>
                <li><a className="text-text-secondary hover:text-primary text-sm transition-colors" href="#">Contato</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-surface-hover pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-secondary text-sm">© 2024 AutoMsg Inc. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;