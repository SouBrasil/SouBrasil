import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSubscriptionStatus } from '@/lib/subscription';
import { toast } from 'sonner';

const features = [
  'Descontos em todos os parceiros',
  'Acesso ao mapa de parceiros',
  'Benefícios exclusivos',
  'Sem limite de parceiros',
  'Suporte prioritário',
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const sub = getSubscriptionStatus(user);

  const handleSubscribe = async () => {
    setLoading(true);
    await base44.auth.updateMe({
      subscription_type: selectedPlan,
      subscription_date: new Date().toISOString(),
    });
    toast.success('Assinatura ativada com sucesso! Bem-vindo ao Premium!');
    setLoading(false);
    navigate('/Home');
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold">Sou Brasil Premium</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Acesse descontos exclusivos nos melhores comércios da sua região
        </p>
      </div>

      {/* Plans */}
      <div className="space-y-3 mb-8">
        {/* Monthly */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedPlan('monthly')}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            selectedPlan === 'monthly'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Mensal</p>
              <p className="text-sm text-muted-foreground">Pague mês a mês</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">R$ 19,90</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
          </div>
        </motion.button>

        {/* Annual */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedPlan('annual')}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all relative ${
            selectedPlan === 'annual'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-muted-foreground/30'
          }`}
        >
          <Badge className="absolute -top-2 right-4 bg-accent text-accent-foreground text-xs font-bold">
            <Sparkles className="w-3 h-3 mr-1" />
            Melhor custo-benefício
          </Badge>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Anual</p>
              <p className="text-sm text-muted-foreground">12x de R$ 14,99</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">R$ 179,88</p>
              <p className="text-xs text-muted-foreground">/ano</p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-8">
        <p className="font-semibold text-sm">O que você recebe:</p>
        {features.map((f) => (
          <div key={f} className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm">{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {(() => {
        // Se já é anual premium ativo → botão desabilitado
        const isAnnualActive = sub.active && !sub.isTrial && sub.type === 'annual';
        // Se é mensal ativo e escolheu anual → habilitar upgrade
        const isMonthlyWantsAnnual = sub.active && !sub.isTrial && sub.type === 'monthly' && selectedPlan === 'annual';
        // Desabilitado se: anual ativo, ou mensal ativo sem querer trocar para anual
        const isDisabled = loading || isAnnualActive || (sub.active && !sub.isTrial && !isMonthlyWantsAnnual);

        let label;
        if (loading) {
          label = <div className="w-5 h-5 border-2 border-yellow-900/30 border-t-yellow-900 rounded-full animate-spin" />;
        } else if (isAnnualActive) {
          label = 'Você já tem o plano Anual!';
        } else if (isMonthlyWantsAnnual) {
          label = <><Crown className="w-5 h-5 mr-2" />Fazer upgrade para Anual (365 dias)</>;
        } else if (sub.active && !sub.isTrial) {
          label = `Plano Mensal Ativo (${sub.daysLeft} dias restantes)`;
        } else {
          label = <><Crown className="w-5 h-5 mr-2" />{`Assinar ${selectedPlan === 'monthly' ? 'por R$ 19,90/mês (30 dias)' : 'por R$ 179,88/ano (365 dias)'}`}</>;
        }

        return (
          <Button
            onClick={handleSubscribe}
            disabled={isDisabled}
            className="w-full h-14 text-base font-bold rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #d4af37, #f0c040, #b8960c)', color: '#1a1a00', boxShadow: '0 6px 20px rgba(212,175,55,0.4), 0 2px 6px rgba(0,0,0,0.2)' }}
          >
            {label}
          </Button>
        );
      })()}

      <p className="text-xs text-center text-muted-foreground mt-4">
        Cancele a qualquer momento. Sem taxas ocultas.
      </p>
    </div>
  );
}