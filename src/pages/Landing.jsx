import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
    style={{ background: 'linear-gradient(160deg, #e8f4fd 0%, #c8e6f7 40%, #a8d8f0 70%, #7bc4e8 100%)' }}>

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-300/30 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute top-1/4 left-0 w-48 h-48 rounded-full bg-blue-200/40 -translate-x-1/2" />
      <div className="absolute bottom-1/3 right-0 w-36 h-36 rounded-full bg-white/50 translate-x-1/3" />
      <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full bg-blue-100/60 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-blue-300/20" />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/3" />
      <div className="absolute top-1/3 left-0 w-32 h-32 rounded-full bg-yellow-400/10 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 flex flex-col items-center w-full max-w-sm">
        
        {/* Logo */}
        <img
          src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png"
          alt="Sou Brasil"
          className="h-28 w-auto mb-8 drop-shadow-2xl" />
        

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mb-10">
          
          <h1 className="text-2xl font-black text-blue-900 mb-1">Bem-Vindo</h1>
          <p className="text-blue-800 text-xl font-black">Ao Melhor Clube De Benefícios</p>
          
        </motion.div>

        <div className="w-full space-y-4">
          {/* Cliente */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}>
            
            <button
              onClick={() => navigate('/Home')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all active:scale-95 active:translate-y-1"
              style={{
                background: 'linear-gradient(160deg, #43e065 0%, #22c55e 40%, #16a34a 75%, #15803d 100%)',
                boxShadow: '0 10px 30px rgba(22,163,74,0.5), 0 4px 12px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.15)'
              }}>
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Users className="w-7 h-7 text-white drop-shadow-md" />
              </div>
              <div>
                <p className="text-white font-black text-lg leading-tight drop-shadow-sm">Sou Cliente Sou Brasil</p>
                <p className="text-white/70 text-xs mt-0.5">Acesse seus benefícios exclusivos</p>
              </div>
            </button>
          </motion.div>

          {/* Parceiro */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.65 }}>
            
            <button
              onClick={() => navigate('/PartnerPortal')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all active:scale-95 active:translate-y-1"
              style={{
                background: 'linear-gradient(160deg, #ffe066 0%, #f0c040 35%, #d4af37 65%, #b8960c 100%)',
                boxShadow: '0 10px 30px rgba(212,175,55,0.55), 0 4px 12px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.12)'
              }}>
              <div className="w-14 h-14 rounded-xl bg-black/15 flex items-center justify-center shrink-0 shadow-inner">
                <Store className="w-7 h-7 text-yellow-900 drop-shadow-sm" />
              </div>
              <div>
                <p className="text-yellow-950 font-black text-lg leading-tight drop-shadow-sm">Sou Parceiro Comercial Da Sou Brasil</p>
                <p className="text-yellow-800/70 text-xs mt-0.5">Gerencie seu perfil e dados</p>
              </div>
            </button>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-blue-800 text-xs mt-10 text-center">
          
          Clube de Benefícios Sou Brasil © 2025
          <br /><br />
          <span className="italic text-blue-700">Provérbios 11.25 — "O generoso prosperará.<br />Todo aquele que dá alívio ao outro, alívio receberá."</span>
        </motion.p>
      </motion.div>

      {/* Admin gear button - discrete, bottom left */}
      <button
        onClick={() => navigate('/AdminLogin')}
        className="fixed bottom-6 left-4 z-50 transition-opacity hover:opacity-100"
        style={{ opacity: 0.18 }}
        title="Acesso Administrativo"
        aria-label="Painel Administrador">
        
        <Settings className="w-5 h-5 text-slate-600" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
      </button>
    </div>);

}