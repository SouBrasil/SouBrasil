import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClientVerification({ partner, partnerName, onClose }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const name = partner?.name || partnerName || 'Parceiro';
  const discountValue = partner?.discount_value || '';
  const discountDescription = partner?.discount_description || '';

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const formatTime = (date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0d1f0d 50%, #050f05 100%)',
      }}
    >
      {/* Gold sparkle particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: Math.random() * 6 + 2,
            height: Math.random() * 6 + 2,
            background: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.8 + 0.2,
          }}
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Sou Brasil Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4 z-10"
      >
        <img
          src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png"
          alt="Sou Brasil"
          className="h-16 w-auto drop-shadow-2xl"
        />
      </motion.div>

      {/* Cupom Dourado Card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, delay: 0.2 }}
        className="w-full max-w-sm z-10 relative"
      >
        {/* Card outer glow */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            boxShadow: '0 0 40px rgba(255, 200, 0, 0.6), 0 0 80px rgba(255, 180, 0, 0.3)',
          }}
        />

        {/* Gold gradient card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #f5c842 0%, #e8a800 25%, #ffd700 50%, #c8860a 75%, #e8a800 100%)',
            padding: '3px',
          }}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #f0b800 0%, #d4930a 40%, #f5c518 70%, #c8860a 100%)',
            }}
          >
            {/* Zigzag top */}
            <svg width="100%" height="16" viewBox="0 0 320 16" preserveAspectRatio="none">
              <path
                d="M0,16 L10,0 L20,16 L30,0 L40,16 L50,0 L60,16 L70,0 L80,16 L90,0 L100,16 L110,0 L120,16 L130,0 L140,16 L150,0 L160,16 L170,0 L180,16 L190,0 L200,16 L210,0 L220,16 L230,0 L240,16 L250,0 L260,16 L270,0 L280,16 L290,0 L300,16 L310,0 L320,16 Z"
                fill="#0d1f0d"
              />
            </svg>

            <div className="px-5 pb-2 pt-0">
              {/* CUPOM DOURADO title */}
              <div className="text-center py-3">
                <h1
                  className="text-3xl font-black tracking-wider"
                  style={{
                    color: '#3d1a00',
                    textShadow: '0 1px 2px rgba(255,255,255,0.3)',
                  }}
                >
                  CUPOM DOURADO
                </h1>
              </div>

              {/* Dark green strip - Sou cliente text */}
              <div
                className="rounded-xl px-4 py-3 mb-3 text-center"
                style={{ background: 'rgba(5, 40, 5, 0.85)' }}
              >
                <p className="text-sm text-yellow-200/90 font-medium mb-1">
                  Sou cliente Sou Brasil e tenho direito a
                </p>

                {/* Discount Value */}
                {discountValue ? (
                  <p
                    className="text-4xl font-black tracking-tight text-white"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                  >
                    {discountValue}
                  </p>
                ) : null}

                {discountDescription ? (
                  <p className="text-xs text-yellow-200/70 mt-1">{discountDescription}</p>
                ) : null}
              </div>

              {/* Partner name strip */}
              <div
                className="rounded-xl px-4 py-2.5 mb-3 text-center"
                style={{ background: 'rgba(5, 40, 5, 0.75)' }}
              >
                <p
                  className="text-xl font-bold italic text-white"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  {name}
                </p>
              </div>

              {/* Time and date */}
              <div className="text-center mb-3">
                <p
                  className="text-4xl font-mono font-black tabular-nums"
                  style={{ color: '#3d1a00', textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}
                >
                  {formatTime(currentTime)}
                </p>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#5a2d00' }}>
                  {capitalize(formatDate(currentTime))}
                </p>
              </div>

              {/* Success strip */}
              <div
                className="rounded-xl px-4 py-2.5 mb-1 flex items-center justify-center gap-2"
                style={{ background: 'rgba(5, 40, 5, 0.75)' }}
              >
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <p className="text-sm font-semibold text-white">
                  Benefício Utilizado com Sucesso!
                </p>
              </div>
            </div>

            {/* Zigzag bottom */}
            <svg width="100%" height="16" viewBox="0 0 320 16" preserveAspectRatio="none">
              <path
                d="M0,0 L10,16 L20,0 L30,16 L40,0 L50,16 L60,0 L70,16 L80,0 L90,16 L100,0 L110,16 L120,0 L130,16 L140,0 L150,16 L160,0 L170,16 L180,0 L190,16 L200,0 L210,16 L220,0 L230,16 L240,0 L250,16 L260,0 L270,16 L280,0 L290,16 L300,0 L310,16 L320,0 L320,16 L0,16 Z"
                fill="#0d1f0d"
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 z-10"
      >
        <Button
          onClick={onClose}
          className="font-bold rounded-full px-10 h-12 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.5)] active:translate-y-1 transition-all flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #f5c518, #e8a800)',
            color: '#3d1a00',
            boxShadow: '0 4px 20px rgba(255,200,0,0.5)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Parceiro
        </Button>
      </motion.div>
    </motion.div>
  );
}