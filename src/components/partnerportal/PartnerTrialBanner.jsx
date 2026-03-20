import { useState, useEffect } from 'react';
import { Clock, Zap, X, Crown, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

function getPartnerTrialInfo(partnerAccess) {
  if (!partnerAccess?.created_date) return null;
  const approvedAt = new Date(partnerAccess.created_date);
  const now = new Date();
  const daysSinceApproval = Math.floor((now - approvedAt) / 86400000);
  const trialDaysTotal = 90; // 3 months
  const promoWindowDays = 7;
  const daysUsed = daysSinceApproval;
  const trialDaysLeft = Math.max(0, trialDaysTotal - daysUsed);
  const promoActive = daysUsed < promoWindowDays;
  const promoDaysLeft = Math.max(0, promoWindowDays - daysUsed);

  // Calculate hours remaining for promo
  const promoEnd = new Date(approvedAt.getTime() + promoWindowDays * 86400000);
  const msLeft = promoEnd - now;
  const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
  const minutesLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000));

  return { daysSinceApproval, trialDaysLeft, promoActive, promoDaysLeft, hoursLeft, minutesLeft, isExpired: trialDaysLeft === 0 };
}

export default function PartnerTrialBanner({ partnerAccess, partner, onGoToPricing }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [, setTick] = useState(0);

  // Update timer every minute for live countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const isPremium = partnerAccess?.subscription_type === 'monthly' || partnerAccess?.subscription_type === 'annual';

  if (isPremium) {
    // Show premium badge
    const subEnd = partnerAccess?.subscription_end_date ? new Date(partnerAccess.subscription_end_date) : null;
    const daysLeft = subEnd ? Math.max(0, Math.floor((subEnd - new Date()) / 86400000)) : null;
    return (
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 flex items-center gap-3">
        <Crown className="w-8 h-8 text-white shrink-0" />
        <div className="flex-1">
          <p className="font-black text-white text-sm">Parceiro Premium ⭐</p>
          <p className="text-yellow-100 text-xs">
            {daysLeft !== null ? `${daysLeft} dias restantes no plano ${partnerAccess.subscription_type === 'annual' ? 'anual' : 'mensal'}` : 'Plano ativo'}
          </p>
        </div>
      </div>
    );
  }

  const trialInfo = getPartnerTrialInfo(partnerAccess);
  if (!trialInfo) return null;

  if (trialInfo.isExpired) {
    return (
      <div className="bg-red-600 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Clock className="w-7 h-7 text-white shrink-0" />
          <div className="flex-1">
            <p className="font-black text-white text-sm">⚠️ Período Gratuito Encerrado</p>
            <p className="text-red-100 text-xs">Sua empresa está invisível para os clientes Sou Brasil. Assine um plano para reativar.</p>
          </div>
        </div>
        <Button onClick={onGoToPricing} className="w-full bg-white text-red-600 hover:bg-red-50 font-bold">
          Ver Planos e Reativar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Trial period banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white text-sm">Modo Gratuito Ativo ✅</p>
            <p className="text-green-100 text-xs">{trialInfo.trialDaysLeft} dias restantes no período gratuito</p>
          </div>
        </div>
        <div className="mt-3 bg-white/10 rounded-xl p-2 text-center">
          <p className="text-white/80 text-xs">Assine um plano para continuar ativo após o período gratuito</p>
          <button onClick={onGoToPricing} className="text-yellow-300 text-xs font-bold underline mt-0.5">Ver Planos Parceiro →</button>
        </div>
      </div>

      {/* Promo banner (7 days) — BIG urgent timer */}
      {trialInfo.promoActive && !dismissed && (
        <div className="rounded-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3600, #b8460a, #e55a0c)', boxShadow: '0 8px 32px rgba(229,90,12,0.5)' }}>
          <button onClick={() => setDismissed(true)} className="absolute top-3 right-3 text-white/50 hover:text-white z-10">
            <X className="w-4 h-4" />
          </button>
          {/* Flames background */}
          <div className="absolute inset-0 opacity-10 text-9xl flex items-center justify-center select-none pointer-events-none">🔥</div>
          
          <div className="relative p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-300 shrink-0" />
              <p className="font-black text-white text-sm tracking-wide">🔥 OFERTA EXCLUSIVA! EXPIRA EM 07 DIAS</p>
            </div>
            <p className="text-orange-100 text-xs font-semibold">NÃO PERCA — Disponível apenas no seu período de boas-vindas!</p>
            
            {/* Big countdown */}
            <div className="bg-black/40 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Expira em</p>
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-yellow-300 tabular-nums leading-none" style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
                    {String(trialInfo.promoDaysLeft).padStart(2,'0')}
                  </span>
                  <span className="text-orange-200 text-xs">dias</span>
                </div>
                <span className="text-yellow-300 text-4xl font-black">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-yellow-300 tabular-nums leading-none" style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
                    {String(trialInfo.hoursLeft).padStart(2,'0')}
                  </span>
                  <span className="text-orange-200 text-xs">horas</span>
                </div>
                <span className="text-yellow-300 text-4xl font-black">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-yellow-300 tabular-nums leading-none" style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
                    {String(trialInfo.minutesLeft).padStart(2,'0')}
                  </span>
                  <span className="text-orange-200 text-xs">min</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-white/10 rounded-xl p-3 space-y-1">
              <p className="text-white/70 text-xs line-through">De R$ 3.600,00/ano</p>
              <p className="text-yellow-300 font-black text-xl">R$ 2.500,00/ano</p>
              <p className="text-orange-100 text-xs">em até 12x de <strong className="text-white">R$ 208,33</strong></p>
              <div className="flex items-center gap-1 mt-1">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full">💰 Economize R$ 1.100,00</span>
                <span className="text-orange-200 text-xs">nesta oferta única!</span>
              </div>
            </div>

            <Button onClick={onGoToPricing}
              className="w-full font-black text-base h-12 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #f0c040, #d4af37)', color: '#1a0000', boxShadow: '0 4px 16px rgba(240,192,64,0.5)' }}>
              ⚡ APROVEITAR OFERTA EXCLUSIVA!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}