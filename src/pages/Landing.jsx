import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
    style={{ background: 'linear-gradient(160deg, #0d3320 0%, #145a32 50%, #1a7a42 100%)' }}>

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
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
          
          <h1 className="text-2xl font-black text-white mb-2">Bem-vindo ao Clube</h1>
          <p className="text-white/70 text-sm">Escolha como deseja acessar</p>
        </motion.div>

        <div className="w-full space-y-4">
          {/* Cliente */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}>
            
            <button
              onClick={() => navigate('/Home')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
              
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-lg leading-tight">Sou Cliente Sou Brasil</p>
                
                <p className="text-white/50 text-xs mt-0.5">Acesse seus benefícios exclusivos</p>
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
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #b8960c)',
                boxShadow: '0 8px 24px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}>
              
              <div className="w-14 h-14 rounded-xl bg-black/15 flex items-center justify-center shrink-0">
                <Store className="w-7 h-7 text-yellow-900" />
              </div>
              <div>
                <p className="text-yellow-900 font-black text-lg leading-tight">Sou Parceiro</p>
                <p className="text-yellow-900/80 text-sm font-extrabold">Comercial da Sou Brasil</p>
                <p className="text-yellow-900/60 text-xs mt-0.5">Gerencie seu perfil e dados</p>
              </div>
            </button>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-white/30 text-xs mt-10 text-center">
          
          Clube de Benefícios Sou Brasil © 2025
        </motion.p>
      </motion.div>
    </div>);

}