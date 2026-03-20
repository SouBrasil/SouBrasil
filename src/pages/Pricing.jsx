import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSubscriptionStatus } from '@/lib/subscription';
import { toast } from 'sonner';
import CheckoutModal from '@/components/pricing/CheckoutModal';

const features = [
  'Descontos em todos os parceiros',
  'Acesso ao mapa de parceiros',
  'Benefícios exclusivos',
  'Sem limite de parceiros',
  'Suporte prioritário',
  'Possibilidade de participar de sorteios exclusivos',
  'Ganho financeiro através do programa Indique e Ganhe',
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
        {/* Monthly - Plano Mensal Pró */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedPlan('monthly')}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            selectedPlan === 'monthly'
              ? 'border-slate-400 bg-slate-50'
              : 'border-border bg-card hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-700">Plano Mensal Pró</p>
              <p className="text-xs text-slate-500">Pague mês a mês · 1 sorteio/mês</p>
              <p className="text-xs text-slate-400 mt-0.5"><span className="line-through text-slate-400">R$ 29,90</span> → com desconto</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-700">R$ 19,90</p>
              <p className="text-xs text-slate-500">/mês</p>
            </div>
          </div>
        </motion.button>

        {/* Annual - Plano Anual Premium */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedPlan('annual')}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all relative ${
            selectedPlan === 'annual'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-border bg-card hover:border-yellow-300'
          }`}
        >
          <Badge className="absolute -top-2 right-4 text-xs font-bold" style={{ background: 'linear-gradient(135deg,#d4af37,#f0c040)', color: '#1a1a00' }}>
            <Sparkles className="w-3 h-3 mr-1" />
            Melhor custo-benefício
          </Badge>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold" style={{ color: '#b8960c' }}>Plano Anual Premium</p>
              <p className="text-xs text-slate-500">Todos os sorteios inclusos</p>
              <p className="text-xs text-slate-400 mt-0.5"><span className="line-through">R$ 238,80</span> → 12x de R$ 12,99</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: '#b8960c' }}>R$ 179,88</p>
              <p className="text-xs text-slate-500">/ano</p>
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

      {/* Pix info */}
      <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">
        <p className="font-semibold text-sm text-green-800 mb-1">💳 Formas de Pagamento</p>
        <div className="flex flex-wrap gap-2 text-xs text-green-700">
          <span className="bg-white border border-green-200 rounded-full px-2 py-1">🔑 Pix</span>
          <span className="bg-white border border-green-200 rounded-full px-2 py-1">💳 Cartão de Crédito</span>
          <span className="bg-white border border-green-200 rounded-full px-2 py-1">📄 Boleto</span>
        </div>
        <p className="text-xs text-green-600 mt-2">
          Pagamento processado com segurança. Entre em contato via WhatsApp para finalizar seu pedido.
        </p>
        <a href="https://wa.me/5541996179617?text=Ol%C3%A1!%20Quero%20assinar%20o%20Clube%20Sou%20Brasil." target="_blank" rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-2.5 text-sm transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Assinar via WhatsApp
        </a>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Cancele a qualquer momento. Sem taxas ocultas.
      </p>
    </div>
  );
}