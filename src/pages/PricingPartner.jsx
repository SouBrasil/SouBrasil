import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Flame, ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import CheckoutModal from '@/components/pricing/CheckoutModal';

export default function PricingPartner() {
  const [authUser, setAuthUser] = useState(null);
  const [partnerRecord, setPartnerRecord] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [daysLeftTrial, setDaysLeftTrial] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then(async (u) => {
        setAuthUser(u);
        // Calcula dias restantes do trial (7 dias)
        if (u?.created_date) {
          const createdDate = new Date(u.created_date);
          const today = new Date();
          const diffTime = Math.ceil((createdDate.getTime() + 7 * 24 * 60 * 60 * 1000 - today.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeftTrial(Math.max(0, diffTime));
        }
        // Buscar registro PartnerAccess para pegar partner_id
        try {
          const accesses = await base44.entities.PartnerAccess.filter({ email: u.email });
          if (accesses.length > 0) {
            const partnerId = accesses[0].partner_id;
            const partners = await base44.entities.Partner.filter({ id: partnerId });
            if (partners.length > 0) setPartnerRecord(partners[0]);
          }
        } catch {}
      })
      .catch(() => {});
  }, []);

  const isInTrial = daysLeftTrial !== null && daysLeftTrial > 0;

  // Planos para Parceiro Comercial
  const plans = [
    {
      id: 'partner_monthly',
      name: 'Plano Mensal PRO',
      price: 299.90,
      originalPrice: 299.90,
      period: '/mês',
      badge: null,
      description: 'Atendimento ao cliente da Sou Brasil',
      savings: 0,
      installments: '1x de R$ 299,90',
      color: 'slate',
      isPromotion: false,
    },
    {
      id: 'partner_annual',
      name: 'Plano Anual Premium',
      price: 2500.00,
      originalPrice: 3000.00,
      period: '/ano',
      badge: 'Melhor Custo-Benefício',
      description: 'Todos os recursos + prioridade',
      savings: 500,
      installments: '12x de R$ 208,33',
      color: 'yellow',
      isPromotion: false,
    },
  ];

  // Plano promocional (apenas nos 7 primeiros dias)
  const promotionalPlan = {
    id: 'partner_trial_promo',
    name: '🚀 OFERTA PROMOCIONAL — VÁLIDA POR 7 DIAS APENAS!',
    price: 2500,
    originalPrice: 3600,
    period: '/ano',
    badge: null,
    description: 'Aproveite agora e economize R$ 1.100!',
    savings: 1100,
    installments: '12x de R$ 208,33',
    color: 'red',
    isPromotion: true,
  };

  const handleSubscribe = () => {
    setShowCheckout(true);
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold">Planos para Parceiros</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Escolha o plano ideal para sua empresa
        </p>
      </div>

      {/* PLANO PROMOCIONAL — TRIAL (Se dentro dos 7 dias) */}
      {isInTrial && daysLeftTrial > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-6 shadow-2xl">
            {/* Animação de fundo */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              {/* Timer de urgência */}
              <div className="flex items-center gap-2 justify-center mb-4">
                <Clock className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white font-bold text-sm">
                  ⏳ Oferta válida por {daysLeftTrial} dia{daysLeftTrial !== 1 ? 's' : ''}!
                </span>
              </div>

              <h2 className="text-white font-black text-2xl text-center mb-2">
                🚀 OFERTA RELÂMPAGO TRIAL!
              </h2>
              <p className="text-white/90 text-center text-sm font-semibold mb-6">
                Aproveite o primeiro período de teste e obtenha um desconto EXCLUSIVO
              </p>

              {/* Preço destaque */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-white/70 line-through text-lg">R$ {promotionalPlan.originalPrice.toFixed(2)}</span>
                  <Badge className="bg-white text-red-600 font-bold text-sm">
                    -R$ {promotionalPlan.savings.toFixed(2)}
                  </Badge>
                </div>
                <p className="text-white font-black text-4xl">R$ {promotionalPlan.price.toFixed(2)}</p>
                <p className="text-white/80 text-xs mt-1">{promotionalPlan.installments}</p>
              </div>

              {/* Call to Action */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedPlan('partner_trial_promo');
                  handleSubscribe();
                }}
                className="w-full bg-white text-red-600 font-black py-4 rounded-2xl text-base shadow-lg hover:shadow-xl transition-all"
              >
                <Flame className="w-5 h-5 inline mr-2" />
                Contratar Agora — Economize R$ {promotionalPlan.savings.toFixed(2)}!
              </motion.button>

              {/* Aviso final */}
              <p className="text-white/80 text-xs text-center mt-3 font-semibold">
                ⚡ Esta oferta é exclusiva para o período trial e não será renovada!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Separador visual */}
      {isInTrial && daysLeftTrial > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-xs text-muted-foreground font-semibold">OU ESCOLHA OUTRO PLANO</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>
      )}

      {/* PLANOS REGULARES */}
      <div className="space-y-4 mb-8">
        {plans.map((plan) => (
          <motion.button
            key={plan.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPlan(plan.id)}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
              selectedPlan === plan.id
                ? plan.color === 'yellow'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-slate-400 bg-slate-50'
                : 'border-border bg-card hover:border-slate-300'
            }`}
          >
            {plan.badge && (
              <Badge
                className="absolute -top-2 right-4 text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#d4af37,#f0c040)', color: '#1a1a00' }}
              >
                <Zap className="w-3 h-3 mr-1" />
                {plan.badge}
              </Badge>
            )}

            <div className="flex items-start justify-between">
              <div>
                <p className={`font-bold ${plan.color === 'yellow' ? 'text-yellow-700' : 'text-slate-700'}`}>
                  {plan.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                {plan.savings > 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1.5">
                    💰 Economie R$ {plan.savings.toFixed(2)}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">{plan.installments}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${plan.color === 'yellow' ? 'text-yellow-700' : 'text-slate-700'}`}>
                  R$ {plan.price.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">{plan.period}</p>
                {plan.originalPrice > plan.price && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="line-through">R$ {plan.originalPrice.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Benefícios */}
      <div className="bg-primary/5 rounded-2xl p-5 mb-8">
        <p className="font-semibold text-sm mb-4">✅ O que está incluído:</p>
        <div className="space-y-3">
          {[
            'Perfil da empresa no Clube Sou Brasil',
            'Acesso ao dashboard de clientes',
            'Notificações de novos clientes',
            'Relatório mensal de atividades',
            'Suporte via WhatsApp',
            'Possibilidade de criar sorteios',
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Principal */}
      <Button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90"
      >
        <Zap className="w-5 h-5 mr-2" />
        {selectedPlan === 'partner_trial_promo'
          ? 'Contratar Oferta Trial'
          : selectedPlan === 'partner_monthly'
            ? 'Contratar Plano Mensal'
            : 'Contratar Plano Anual'}
      </Button>

      {/* Payment methods */}
      <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">
        <p className="font-semibold text-sm text-green-800 mb-2">💳 Formas de Pagamento</p>
        <div className="flex flex-wrap gap-2 text-xs text-green-700">
          <span className="bg-white border border-green-200 rounded-full px-2 py-1">⚡ Pix — aprovação imediata</span>
          <span className="bg-white border border-green-200 rounded-full px-2 py-1">💳 Cartão de Crédito</span>
          <span className="bg-white border border-green-200 rounded-full px-2 py-1">📄 Boleto</span>
        </div>
        <p className="text-xs text-green-600 mt-2">Pagamento 100% seguro via ASAAS.</p>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Cancele quando quiser. Sem taxas ocultas.
      </p>

      {showCheckout && (
        <CheckoutModal
          plan={selectedPlan}
          planType="partner"
          user={{
            ...authUser,
            cnpj: authUser?.cnpj || partnerRecord?.cnpj || '',
            referrer_email: partnerRecord?.referrer_user_email || authUser?.referrer_email || null,
          }}
          onClose={(activated) => {
            setShowCheckout(false);
            if (activated) navigate('/PartnerPortal');
          }}
        />
      )}
    </div>
  );
}