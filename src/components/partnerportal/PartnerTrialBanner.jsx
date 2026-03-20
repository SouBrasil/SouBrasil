import { useState, useEffect } from 'react';
import { Clock, Star, Zap, X, Crown } from 'lucide-react';
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

      {/* Promo banner (7 days) */}
      {trialInfo.promoActive && !dismissed && (
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 relative">
          <button onClick={() => setDismissed(true)} className="absolute top-3 right-3 text-yellow-800/60 hover:text-yellow-800">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-8 h-8 text-white shrink-0" />
            <div className="flex-1 pr-4">
              <p className="font-black text-yellow-900 text-sm">🔥 Oferta Exclusiva! Expira em Breve</p>
              <p className="text-yellow-800 text-xs font-bold">
                {trialInfo.promoDaysLeft}d {trialInfo.hoursLeft}h {trialInfo.minutesLeft}min restantes
              </p>
            </div>
          </div>
          <p className="text-yellow-900 text-xs mb-3">
            Plano especial disponível <strong>apenas nos primeiros 7 dias</strong>: 
            <strong> 12x R$166,67 = R$2.000/ano</strong> (economize R$1.000!)
          </p>
          <Button onClick={onGoToPricing} className="w-full bg-yellow-900 text-yellow-100 hover:bg-yellow-800 font-bold text-sm">
            ⚡ Aproveitar Oferta Exclusiva!
          </Button>
        </div>
      )}
    </div>
  );
}