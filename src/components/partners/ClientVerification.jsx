import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClientVerification({ partnerName, onClose }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center p-6 text-primary-foreground"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.2 }}
        className="mb-8"
      >
        <div className="w-28 h-28 rounded-full bg-accent/20 flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-accent" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-3"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium uppercase tracking-wider text-accent">Verificado</span>
        </div>

        <h1 className="text-3xl font-black">EU SOU CLIENTE</h1>
        <div className="w-20 h-1 bg-accent mx-auto rounded-full" />
        <h2 className="text-2xl font-bold">SOU BRASIL</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10 bg-white/10 backdrop-blur-sm rounded-2xl p-6 w-full max-w-sm text-center"
      >
        <p className="text-sm text-white/70 mb-1">Parceiro</p>
        <p className="font-bold text-lg mb-4">{partnerName}</p>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-3xl font-mono font-bold tabular-nums">
            {formatTime(currentTime)}
          </span>
        </div>
        <p className="text-sm text-white/80 capitalize">{formatDate(currentTime)}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-10"
      >
        <Button
          onClick={onClose}
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-full px-8"
        >
          Fechar
        </Button>
      </motion.div>
    </motion.div>
  );
}