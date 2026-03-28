import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Copy, Gift, Check, Share2, Loader2, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import WalletActivationPaymentModal from '@/components/affiliate/WalletActivationPaymentModal';
import WalletBalanceCard from '@/components/affiliate/WalletBalanceCard';

const COMMISSION_CLIENT = 10;
const COMMISSION_PARTNER_MONTHLY = 100;
const COMMISSION_PARTNER_ANNUAL = 200;

export default function PartnerPortalIndicacao({ user: initialUser }) {
  const [user, setUser] = useState(initialUser);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedPartner, setCopiedPartner] = useState(false);

  useEffect(() => {
    if (initialUser) setUser(initialUser);
  }, [initialUser]);

  const { data: commissions = [] } = useQuery({
    queryKey: ['partner-indicacao-commissions', user?.email],
    queryFn: () => base44.entities.AffiliateCommission.filter({ referrer_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const handleGenerateLink = async () => {
    if (!user?.wallet_activation_paid) {
      toast.error('Você precisa pagar a taxa de ativação primeiro!');
      setShowPaymentModal(true);
      return;
    }
    if (user?.referral_code) { toast.info('Link já foi gerado'); return; }
    try {
      const res = await base44.functions.invoke('affiliateSystem', { action: 'generate_referral_code' });
      if (res.data?.success) {
        const updated = await base44.auth.me();
        setUser(updated);
        toast.success('Link gerado com sucesso!');
      }
    } catch { toast.error('Erro ao gerar link'); }
  };

  const clientLink = user?.referral_code
    ? `${window.location.origin}/OnboardingRegister?ref=${user.referral_code}&type=client`
    : null;

  const partnerLink = user?.referral_code
    ? `${window.location.origin}/PartnerSignup?ref=${user.referral_code}&type=partner`
    : null;

  const copyLink = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'client') { setCopiedClient(true); setTimeout(() => setCopiedClient(false), 2000); }
    else { setCopiedPartner(true); setTimeout(() => setCopiedPartner(false), 2000); }
    toast.success('Link copiado!');
  };

  const shareWhatsApp = (link, msg) => {
    const text = encodeURIComponent(`${msg}\n\n${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePaymentSuccess = async () => {
    await new Promise(r => setTimeout(r, 1500));
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
  };

  if (!user) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-lg font-black">💰 Indique e Ganhe</h2>
        <p className="text-xs text-muted-foreground mt-1">Ganhe comissão por cada indicação convertida!</p>
      </div>

      {/* Card de ativação da carteira */}
      <Card className={user?.wallet_activation_paid ? 'border-green-200 bg-green-50' : 'border-red-300 bg-red-50'}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 mb-3">
                {user?.wallet_activation_paid ? (
                  <><Check className="w-5 h-5 text-green-600" /><h3 className="font-bold text-green-900">✓ Carteira Ativada</h3></>
                ) : (
                  <><AlertCircle className="w-5 h-5 text-red-600" /><h3 className="font-bold text-red-900">⚠️ Pagamento de Ativação</h3></>
                )}
              </div>
              <p className="text-sm text-slate-700 mb-4 text-center">
                {user?.wallet_activation_paid
                  ? '✓ Pagamento confirmado! Sua carteira Asaas está ativa. Você pode gerar links e receber comissões!'
                  : 'Pague R$14,99 (taxa única) para criar sua Carteira ASAAS e começar a indicar pessoas para o Clube Sou Brasil — sem limite de comissões!'}
              </p>
              {!user?.wallet_activation_paid && (
                <div className="flex justify-center">
                  <Button onClick={() => setShowPaymentModal(true)} className="h-10 font-bold bg-red-600 hover:bg-red-700 text-white gap-2">
                    <Zap className="w-4 h-4" /> Pagar R$ 14,99
                  </Button>
                </div>
              )}
            </div>
            <div className={`text-4xl ${user?.wallet_activation_paid ? 'text-green-100' : 'text-red-100'}`}>
              {user?.wallet_activation_paid ? '🎉' : '🔒'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saldo e saque */}
      <WalletBalanceCard user={user} commissions={commissions} onUserUpdate={() => base44.auth.me().then(setUser)} />

      {/* Tabela de comissões */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="font-bold text-sm text-primary mb-3">💡 Tabela de Comissões</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Indicar cliente — Mensal ou Anual</span>
              <Badge className="bg-green-100 text-green-700 font-bold">R$ {COMMISSION_CLIENT},00</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Store className="w-4 h-4 text-amber-600" /> Indicar parceiro — plano Mensal</span>
              <Badge className="bg-amber-100 text-amber-700 font-bold">R$ {COMMISSION_PARTNER_MONTHLY},00</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Store className="w-4 h-4 text-yellow-600" /> Indicar parceiro — plano Anual</span>
              <Badge className="bg-yellow-100 text-yellow-700 font-bold">R$ {COMMISSION_PARTNER_ANNUAL},00</Badge>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">* Comissão creditada após compensação do pagamento. Válida apenas na 1ª mensalidade/anuidade.</p>
        </CardContent>
      </Card>

      {/* Links de indicação */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Gift className="w-4 h-4 text-primary" /> Seu Link de Indicação — Clientes</CardTitle>
          <CardDescription className="text-xs">Para indicar usuários ao Clube Sou Brasil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {!clientLink ? (
            <Button onClick={handleGenerateLink} disabled={!user?.wallet_activation_paid}
              className={`w-full h-10 font-bold text-sm ${user?.wallet_activation_paid ? 'bg-primary hover:bg-primary/90' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
              <Gift className="w-4 h-4 mr-2" />
              {user?.wallet_activation_paid ? 'Gerar Meu Link' : 'Pague primeiro a ativação'}
            </Button>
          ) : (
            <>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <code className="text-xs font-mono break-all text-slate-700">{clientLink}</code>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => copyLink(clientLink, 'client')} variant="outline" className="gap-2 text-xs h-9">
                  {copiedClient ? <><Check className="w-3.5 h-3.5" />Copiado!</> : <><Copy className="w-3.5 h-3.5" />Copiar</>}
                </Button>
                <Button onClick={() => shareWhatsApp(clientLink, '🎉 Use meu link do Clube Sou Brasil!')} className="gap-2 text-xs h-9 bg-green-600 hover:bg-green-700">
                  <Share2 className="w-3.5 h-3.5" />WhatsApp
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {partnerLink && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Store className="w-4 h-4 text-amber-600" /> Seu Link — Parceiros Comerciais</CardTitle>
            <CardDescription className="text-xs">Para indicar outros comércios parceiros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <code className="text-xs font-mono break-all text-slate-700">{partnerLink}</code>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => copyLink(partnerLink, 'partner')} variant="outline" className="gap-2 text-xs h-9">
                {copiedPartner ? <><Check className="w-3.5 h-3.5" />Copiado!</> : <><Copy className="w-3.5 h-3.5" />Copiar</>}
              </Button>
              <Button onClick={() => shareWhatsApp(partnerLink, '🏪 Seja um parceiro do Clube Sou Brasil!')} className="gap-2 text-xs h-9 bg-amber-600 hover:bg-amber-700">
                <Share2 className="w-3.5 h-3.5" />WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de comissões */}
      {commissions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold">Histórico de Comissões</p>
          {commissions.slice(0, 10).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-border">
              <div>
                <p className="text-sm font-medium">{c.referred_name || c.referred_email}</p>
                <p className="text-xs text-muted-foreground">{c.user_type === 'parceiro' ? 'Parceiro' : 'Cliente'} · {c.plan_type === 'annual' ? 'Anual' : 'Mensal'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">R$ {c.commission_value?.toFixed(2)}</p>
                <Badge className={`text-[10px] ${c.status === 'transferida' ? 'bg-blue-100 text-blue-700' : c.status === 'confirmada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {c.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPaymentModal && (
        <WalletActivationPaymentModal
          user={user}
          onClose={(confirmed) => { setShowPaymentModal(false); if (confirmed) handlePaymentSuccess(); }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}