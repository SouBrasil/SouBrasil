import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed left-0 right-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        top: '56px',
        bottom: '64px',
        background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0d1f0d 50%, #050f05 100%)'
      }}>
      
      {/* Gold sparkle particles */}
      {[...Array(24)].map((_, i) =>
      <motion.div
        key={i}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: Math.random() * 5 + 2,
          height: Math.random() * 5 + 2,
          background: `hsl(${42 + Math.random() * 18}, 100%, ${55 + Math.random() * 35}%)`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`
        }}
        animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.6, 1] }}
        transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }} />

      )}

      {/* Sou Brasil Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="z-10 mb-2">
        <img
          src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/fd13a61a0_LogoSouBrasilOficial.png"
          alt="Sou Brasil"
          className="h-12 w-auto drop-shadow-2xl"
        />
      </motion.div>

      {/* Gold Ticket Card */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, delay: 0.2 }}
        className="w-full max-w-xs z-10 relative px-3">
        
        {/* Outer glow */}
        <div
          className="absolute inset-3 rounded-2xl"
          style={{ boxShadow: '0 0 32px rgba(255,200,0,0.7), 0 0 64px rgba(255,180,0,0.3)' }} />
        

        {/* Gold border wrapper */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #f5c842 0%, #d4930a 30%, #ffd700 55%, #c8860a 80%, #e8a800 100%)',
            padding: '3px'
          }}>
          
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #f0b800 0%, #d4930a 35%, #f5c518 65%, #c8860a 100%)'
            }}>
            
            {/* Zigzag top */}
            <svg width="100%" height="14" viewBox="0 0 320 14" preserveAspectRatio="none">
              <path d="M0,14 L8,0 L16,14 L24,0 L32,14 L40,0 L48,14 L56,0 L64,14 L72,0 L80,14 L88,0 L96,14 L104,0 L112,14 L120,0 L128,14 L136,0 L144,14 L152,0 L160,14 L168,0 L176,14 L184,0 L192,14 L200,0 L208,14 L216,0 L224,14 L232,0 L240,14 L248,0 L256,14 L264,0 L272,14 L280,0 L288,14 L296,0 L304,14 L312,0 L320,14 Z" fill="#0d1f0d" />
            </svg>

            <div className="px-4 py-1">
              {/* CUPOM DOURADO */}
              <div className="text-center py-2">
                <h1
                  className="text-2xl font-black tracking-widest leading-tight"
                  style={{ color: '#3d1a00', textShadow: '0 1px 2px rgba(255,255,255,0.25)' }}>
                  
                  CUPOM DOURADO
                </h1>
              </div>

              {/* Discount strip */}
              <div
                className="rounded-xl px-3 py-2 mb-2 text-center"
                style={{ background: 'rgba(5,40,5,0.88)' }}>
                
                <p className="text-xs text-yellow-200/80 font-medium mb-1">
                  Sou cliente Sou Brasil e tenho direito a
                </p>
                {discountValue &&
                <p
                  className="text-3xl font-black text-white leading-tight"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  
                    {discountValue}
                  </p>
                }
                {discountDescription &&
                <p className="text-[11px] text-yellow-200/60 mt-0.5">{discountDescription}</p>
                }
              </div>

              {/* Partner name */}
              <div
                className="rounded-xl px-3 py-2 mb-2 text-center"
                style={{ background: 'rgba(5,40,5,0.78)' }}>
                
                <p
                  className="text-lg font-bold italic text-white"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  
                  {name}
                </p>
              </div>

              {/* Time */}
              <div className="text-center mb-2">
                <p
                  className="text-4xl font-mono font-black tabular-nums"
                  style={{ color: '#3d1a00', textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                  
                  {formatTime(currentTime)}
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color: '#5a2d00' }}>
                  {capitalize(formatDate(currentTime))}
                </p>
              </div>

              {/* Success strip */}
              <div
                className="rounded-xl px-3 py-2 flex items-center justify-center gap-2"
                style={{ background: 'rgba(5,40,5,0.78)' }}>
                
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-sm font-semibold text-white">Benefício Utilizado com Sucesso!</p>
              </div>
            </div>

            {/* Zigzag bottom */}
            <svg width="100%" height="14" viewBox="0 0 320 14" preserveAspectRatio="none">
              <path d="M0,0 L8,14 L16,0 L24,14 L32,0 L40,14 L48,0 L56,14 L64,0 L72,14 L80,0 L88,14 L96,0 L104,14 L112,0 L120,14 L128,0 L136,14 L144,0 L152,14 L160,0 L168,14 L176,0 L184,14 L192,0 L200,14 L208,0 L216,14 L224,0 L232,14 L240,0 L248,14 L256,0 L264,14 L272,0 L280,14 L288,0 L296,14 L304,0 L312,14 L320,0 L320,14 L0,14 Z" fill="#0d1f0d" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={onClose}
        className="mt-3 z-10 flex items-center gap-2 font-bold rounded-full px-8 h-10 text-sm active:translate-y-0.5 transition-all"
        style={{
          background: 'linear-gradient(135deg, #f5c518, #e8a800)',
          color: '#3d1a00',
          boxShadow: '0 4px 16px rgba(255,200,0,0.5)'
        }}>
        
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Parceiro
      </motion.button>
    </motion.div>);

}