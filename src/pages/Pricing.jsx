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
    // Simulate subscription (in a real app, integrate Stripe here)
    await base44.auth.updateMe({
      subscription_type: selectedPlan,
      subscription_date: new Date().toISOString(),
    });
    toast.success('Assinatura ativada com sucesso!');
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
            Economia de 16%
          </Badge>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Anual</p>
              <p className="text-sm text-muted-foreground">Melhor custo-benefício</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">R$ 199,90</p>
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
      <Button
        onClick={handleSubscribe}
        disabled={loading || sub.active}
        className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : sub.active ? (
          'Você já é Premium!'
        ) : (
          `Assinar ${selectedPlan === 'monthly' ? 'por R$ 19,90/mês' : 'por R$ 199,90/ano'}`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Cancele a qualquer momento. Sem taxas ocultas.
      </p>
    </div>
  );
}