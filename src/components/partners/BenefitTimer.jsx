import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function BenefitTimer({ usedAt, unlimited = false }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const cooldown = unlimited ? 5 * 60 * 1000 : 12 * 3600 * 1000;
    const calc = () => {
      const used = new Date(usedAt).getTime();
      const diff = used + cooldown - Date.now();
      if (diff <= 0) return null;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { h, m, s };
    };

    setTimeLeft(calc());
    const interval = setInterval(() => {
      const t = calc();
      setTimeLeft(t);
      if (!t) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [usedAt]);

  if (!timeLeft) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center justify-center gap-2 text-destructive/80">
      <Clock className="w-4 h-4 shrink-0" />
      <span className="text-sm font-mono font-semibold tabular-nums">
        Disponível em {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
      </span>
    </div>
  );
}