import React, { useState } from 'react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'demo@demo.com' && password === '123456') {
      onLoginSuccess();
    } else {
      setError('E-mail ou senha inválidos');
    }
  };

  return (
    <div className="bg-[#111b21] text-[#e9edef] font-display flex flex-col min-h-screen antialiased overflow-x-hidden relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] bg-[#00a884]/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] -right-[5%] w-[400px] h-[400px] bg-[#00a884]/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="layout-container flex h-full grow flex-col relative z-10 justify-center items-center py-10 px-4">
        <div className="w-full max-w-[480px] bg-[#202c33] rounded-xl shadow-2xl border border-[#2a3942] overflow-hidden flex flex-col">
          <div className="pt-10 pb-4 px-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#00a884]/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-[#00a884]/20">
              <span className="material-symbols-outlined text-[32px] text-[#00a884]">chat</span>
            </div>
            <h2 className="text-[#e9edef] tracking-tight text-[28px] font-bold leading-tight text-center">Bem-vindo de volta</h2>
            <p className="text-[#8696a0] text-sm font-normal leading-normal text-center mt-2">
              Faça login no seu painel de automação
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-4 flex flex-col gap-5">
            <label className="flex flex-col flex-1">
              <p className="text-[#e9edef] text-sm font-medium leading-normal pb-2">Endereço de E-mail</p>
              <div className="relative">
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-1 focus:ring-[#00a884] border border-[#2a3942] bg-[#2a3942] focus:border-[#00a884] h-12 placeholder:text-[#8696a0] px-[15px] text-base font-normal leading-normal transition-all duration-200" 
                  placeholder="usuario@exemplo.com" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#8696a0]">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
              </div>
            </label>
            
            <label className="flex flex-col flex-1">
              <div className="flex justify-between items-end pb-2">
                <p className="text-[#e9edef] text-sm font-medium leading-normal">Senha</p>
              </div>
              <div className="flex w-full flex-1 items-stretch rounded-lg relative">
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-1 focus:ring-[#00a884] border border-[#2a3942] bg-[#2a3942] focus:border-[#00a884] h-12 placeholder:text-[#8696a0] px-[15px] pr-12 text-base font-normal leading-normal transition-all duration-200" 
                  placeholder="••••••••" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="absolute right-0 top-0 h-full px-3 text-[#8696a0] hover:text-[#00a884] transition-colors flex items-center justify-center" type="button">
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
            </label>

            {error && <p className="text-red-400 text-sm text-center font-medium bg-red-500/10 py-2 rounded">{error}</p>}

            <div className="flex justify-end -mt-2">
              <a className="text-[#00a884] hover:text-[#008f6f] text-sm font-medium leading-normal transition-colors" href="#">
                Esqueceu a senha?
              </a>
            </div>

            <button type="submit" className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white h-12 rounded-lg font-semibold text-base transition-all duration-200 shadow-lg shadow-[#00a884]/20 flex items-center justify-center gap-2 mt-2">
              <span>Entrar</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#2a3942]"></div>
              <span className="flex-shrink-0 mx-4 text-[#8696a0] text-xs font-medium uppercase tracking-wider">Ou continue com</span>
              <div className="flex-grow border-t border-[#2a3942]"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2.5 border border-[#2a3942] rounded-lg hover:bg-[#2a3942] transition-colors bg-[#111b21] group">
                <div className="w-5 h-5 mr-2 relative flex items-center justify-center">
                  <img alt="" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKQaDjMfuFH_LAYNUlrIZ6Vj5Xuy3YPawYQDf71qSwlMPeAKpxr5KIYwCBuL1pYjYHlvoBkPLrwo9wn4WLRWXyv3a8EJBdh0P4Alv4E1VXtEPw6A97rudxT96sa4YQJO2LGneTlMnpuZewZh24vMub017ChrUBoZ96fI8fmR0DDG858lRDQ45jSlz2Jy6totkg8I8QWIHKG9vimoGhF-4zmo-YaLCWsN6568sRd3GXsQL2npSwDPCfrAQSSFl2amE-cUvyuZMpx1c"/>
                </div>
                <span className="text-sm font-medium text-[#e9edef] group-hover:text-white">Google</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2.5 border border-[#2a3942] rounded-lg hover:bg-[#2a3942] transition-colors bg-[#111b21] group">
                <div className="w-5 h-5 mr-2 flex items-center justify-center">
                   <img alt="" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNhZVuCG9Vuo4ePrAeMbu2Jz70Z1w_Ik1znAYzCtr6uSs5dB1JxJ7l8WC-YymiUBcgotpmxm83LgxilVF7mlMTpEKCN1R2wNjluCc2VMct07kJteP1I9cS_KlDM_txIir8NDCcrBH62Rm2Rh6jsn_A0mu1sodTsz-aPvIUEWaFN1ECe0K7XcSFzqBW3eMfLgDdf0QwGC7tMf6_Qs6GCddqcSBS5G3iPLeAMmbCfTWONugHm0F9DcE8nnAsgmVKjOgvHDRjI2cVjyE"/>
                </div>
                <span className="text-sm font-medium text-[#e9edef] group-hover:text-white">Microsoft</span>
              </button>
            </div>
          </form>

          <div className="bg-[#182329] py-4 px-8 text-center border-t border-[#2a3942]">
            <p className="text-sm text-[#8696a0]">
              Não tem uma conta? 
              <a className="text-[#00a884] font-semibold hover:underline decoration-2 underline-offset-2 ml-1" href="#">Cadastre-se</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;