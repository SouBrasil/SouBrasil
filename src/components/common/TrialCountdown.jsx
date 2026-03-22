import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

export default function TrialCountdown({ daysLeft, hideIfExpired = true }) {
  const [isExpired, setIsExpired] = useState(daysLeft <= 0);

  useEffect(() => {
    setIsExpired(daysLeft <= 0);
  }, [daysLeft]);

  if (isExpired && hideIfExpired) {
    return null;
  }

  const urgencyLevel = daysLeft <= 2 ? 'critical' : daysLeft <= 4 ? 'high' : 'medium';

  const urgencyConfig = {
    critical: {
      bg: 'from-red-600 to-red-500',
      border: 'border-red-400',
      text: 'text-red-600',
      pulse: 'animate-pulse',
      message: '🔥 ÚLTIMAS HORAS!',
    },
    high: {
      bg: 'from-orange-600 to-orange-500',
      border: 'border-orange-400',
      text: 'text-orange-600',
      pulse: 'animate-pulse',
      message: '⏰ TEMPO CURTO!',
    },
    medium: {
      bg: 'from-amber-600 to-amber-500',
      border: 'border-amber-400',
      text: 'text-amber-600',
      pulse: '',
      message: '⏳ CONTAGEM REGRESSIVA',
    },
  };

  const config = urgencyConfig[urgencyLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${config.bg} rounded-xl p-4 mb-6 border-2 ${config.border} shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={`w-6 h-6 text-white ${config.pulse}`} />
          <div>
            <p className="text-white font-black text-sm">{config.message}</p>
            <p className="text-white/90 text-xs">
              {daysLeft === 0
                ? 'Oferta expira hoje!'
                : `Oferta expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-2xl">{daysLeft}</p>
          <p className="text-white/80 text-xs">dia{daysLeft !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </motion.div>
  );
}