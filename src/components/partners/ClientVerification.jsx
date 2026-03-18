import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Shield, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClientVerification({ partner, partnerName, onClose }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const name = partner?.name || partnerName || 'Parceiro';
  const logo = partner?.image_url || null;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 text-white overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

      {/* Sou Brasil Logo */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-2 z-10">
        <img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png" alt="Sou Brasil" className="h-14 w-auto drop-shadow-2xl" />
      </motion.div>

      {/* Big check */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, delay: 0.2 }} className="mb-3 z-10">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center space-y-0.5 z-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-white/80" />
          <span className="text-xs font-medium uppercase tracking-widest text-white/80">Verificado</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">EU SOU</h1>
        <div className="w-16 h-1.5 bg-white/50 mx-auto rounded-full" />
        <h2 className="text-2xl font-black tracking-tight">CLIENTE</h2>
        <h3 className="text-lg font-bold text-white/90">SOU BRASIL</h3>
      </motion.div>

      {/* Partner card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-4 bg-white/15 backdrop-blur-md rounded-3xl p-4 w-full max-w-sm z-10 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/20">
          {logo ? (
            <img src={logo} alt={name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Estabelecimento</p>
            <p className="font-bold text-base text-white leading-tight">{name}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-white/70" />
            <span className="text-2xl font-mono font-bold tabular-nums">{formatTime(currentTime)}</span>
          </div>
          <p className="text-xs text-white/70 capitalize">{formatDate(currentTime)}</p>
        </div>
      </motion.div>

      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 z-10">
        <Button
          onClick={onClose}
          className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold rounded-full px-10 h-11 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:translate-y-1 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Parceiro
        </Button>
      </motion.div>
    </motion.div>
  );
}