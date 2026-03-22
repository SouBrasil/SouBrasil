import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import CheckoutModal from '@/components/pricing/CheckoutModal';

export default function ExclusiveOfferPartner() {
  const [partner, setPartner] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [daysLeftTrial, setDaysLeftTrial] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setPartner(u);
        // Calcula dias restantes do trial (7 dias)
        if (u?.created_date) {
          const createdDate = new Date(u.created_date);
          const today = new Date();
          const diffTime = Math.ceil((createdDate.getTime() + 7 * 24 * 60 * 60 * 1000 - today.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeftTrial(Math.max(0, diffTime));
        }
      })
      .catch(() => navigate('/PartnerPortal'));
  }, [navigate]);

  const isInTrial = daysLeftTrial !== null && daysLeftTrial > 0;

  const promotionalPlan = {
    id: 'partner_trial_promo',
    name: '🚀 OFERTA RELÂMPAGO — VÁLIDA POR 7 DIAS APENAS!',
    price: 2500,
    originalPrice: 3600,
    period: '/ano',
    description: 'Aproveite agora e economize R$ 1.100!',
    savings: 1100,
    installments: '12x de R$ 208,33',
  };

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isInTrial) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black mb-3">Oferta Expirada</h2>
          <p className="text-muted-foreground mb-6">
            A oferta exclusiva está disponível apenas durante os primeiros 7 dias após o cadastro.
          </p>
          <Button onClick={() => navigate('/PartnerPortal')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <button 
        onClick={() => navigate('/PartnerPortal')} 
        className="flex items-center gap-1 text-muted-foreground mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        {/* Oferta Exclusiva */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-6 shadow-2xl mb-8">
          {/* Animação de fundo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Timer de urgência */}
            <div className="flex items-center gap-2 justify-center">
              <Clock className="w-5 h-5 text-white animate-pulse" />
              <span className="text-white font-bold text-sm">
                ⏳ Oferta válida por {daysLeftTrial} dia{daysLeftTrial !== 1 ? 's' : ''}!
              </span>
            </div>

            {/* Título */}
            <h1 className="text-white font-black text-3xl text-center">
              🚀 OFERTA EXCLUSIVA!<br />EXPIRA EM 07 DIAS
            </h1>

            {/* Descrição */}
            <p className="text-white/90 text-center text-sm font-semibold">
              NÃO PERCA — Disponível apenas no seu período de boas-vindas!
            </p>

            {/* Timer visual */}
            <div className="bg-red-900/50 rounded-2xl p-4 text-center">
              <p className="text-white/70 text-xs font-bold uppercase mb-2">EXPIRA EM</p>
              <div className="flex justify-center gap-2">
                <div className="text-center">
                  <p className="text-yellow-300 font-black text-3xl">07</p>
                  <p className="text-white/70 text-xs">dias</p>
                </div>
                <p className="text-white/50 text-2xl">:</p>
                <div className="text-center">
                  <p className="text-yellow-300 font-black text-3xl">18</p>
                  <p className="text-white/70 text-xs">h</p>
                </div>
                <p className="text-white/50 text-2xl">:</p>
                <div className="text-center">
                  <p className="text-yellow-300 font-black text-3xl">30</p>
                  <p className="text-white/70 text-xs">min</p>
                </div>
              </div>
            </div>

            {/* Preço e economia */}
            <div className="bg-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-3">
                <span className="text-white/70 line-through text-lg">
                  De R$ {promotionalPlan.originalPrice.toFixed(2)}/ano
                </span>
                <Badge className="bg-white text-red-600 font-bold text-sm">
                  -R$ {promotionalPlan.savings.toFixed(2)}
                </Badge>
              </div>
              <p className="text-white font-black text-5xl text-center">
                R$ {promotionalPlan.price.toFixed(2)}
              </p>
              <p className="text-white/80 text-sm text-center font-semibold">
                em até 12x de R$ {(promotionalPlan.price / 12).toFixed(2)}
              </p>
              <p className="text-yellow-300 font-bold text-center text-sm">
                💰 Economize R$ {promotionalPlan.savings.toFixed(2)} nesta oferta única!
              </p>
            </div>

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCheckout(true)}
              className="w-full bg-white text-red-600 font-black py-4 rounded-2xl text-base shadow-lg hover:shadow-xl transition-all"
            >
              <Flame className="w-5 h-5 inline mr-2" />
              Aproveitar Oferta Exclusiva!
            </motion.button>

            {/* Aviso */}
            <p className="text-white/80 text-xs text-center font-semibold">
              ⚡ Esta oferta é exclusiva e não será renovada após o período trial!
            </p>
          </div>
        </div>

        {/* Benefícios inclusos */}
        <div className="bg-slate-50 rounded-2xl p-6 space-y-4 mb-8">
          <h3 className="font-bold text-lg">✅ O que você ganha:</h3>
          <ul className="space-y-3">
            {[
              '📊 Acesso completo ao Portal do Parceiro',
              '👥 Visão de clientes que usam seus benefícios',
              '📈 Relatórios e análises de desempenho',
              '🎁 Sorteios e ofertas exclusivas',
              '💬 Suporte prioritário via WhatsApp',
              '🔔 Notificações de novas interações',
            ].map((benefit) => (
              <li key={benefit} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-base">{benefit.split(' ')[0]}</span>
                <span>{benefit.slice(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Formas de pagamento */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm text-green-800">💳 Formas de Pagamento</p>
          <div className="flex flex-wrap gap-2">
            {['⚡ Pix', '💳 Cartão', '📄 Boleto'].map((method) => (
              <span key={method} className="bg-white border border-green-200 rounded-full px-2 py-1 text-xs text-green-700 font-semibold">
                {method}
              </span>
            ))}
          </div>
          <p className="text-xs text-green-600 mt-2">Pagamento 100% seguro via ASAAS.</p>
        </div>
      </motion.div>

      {showCheckout && (
        <CheckoutModal
          plan="partner_trial_promo"
          planType="partner"
          user={partner}
          onClose={(activated) => {
            setShowCheckout(false);
            if (activated) navigate('/PartnerPortal');
          }}
        />
      )}
    </div>
  );
}