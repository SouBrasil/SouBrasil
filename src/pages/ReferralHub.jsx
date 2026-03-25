import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Copy, Gift, Check, Share2, Loader2, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import AsaasSetupModal from '@/components/affiliate/AsaasSetupModal';
import WalletBalanceCard from '@/components/affiliate/WalletBalanceCard';

// Valores de comissão
const COMMISSION_CLIENT = 10;
const COMMISSION_PARTNER_MONTHLY = 100;
const COMMISSION_PARTNER_ANNUAL = 200;

export default function ReferralHub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedPartner, setCopiedPartner] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { data: commissions = [] } = useQuery({
    queryKey: ['myCommissions', user?.email],
    queryFn: () => base44.entities.AffiliateCommission.filter(
      { referrer_email: user?.email },
      '-created_date',
      100
    ),
    enabled: !!user?.email,
  });

  const totalEarnings = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendingEarnings = commissions.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.commission_value || 0), 0);

  const handleGenerateLink = async () => {
    if (!user?.wallet_activation_paid) {
      toast.error('Você precisa pagar a taxa de ativação primeiro!');
      setShowSetupModal(true);
      return;
    }
    if (user?.referral_code) {
      toast.info('Link já foi gerado');
      return;
    }
    try {
      const res = await base44.functions.invoke('affiliateSystem', { action: 'generate_referral_code' });
      if (res.data?.success) {
        const updated = await base44.auth.me();
        setUser(updated);
        toast.success('Link gerado com sucesso!');
      } else {
        toast.error('Erro ao gerar link');
      }
    } catch (e) {
      toast.error('Erro ao gerar link');
    }
  };

  const clientLink = user?.referral_code
    ? `${window.location.origin}/OnboardingRegister?ref=${user.referral_code}&type=client`
    : null;

  const partnerLink = user?.referral_code
    ? `${window.location.origin}/PartnerSignup?ref=${user.referral_code}`
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

  const handleSetupSuccess = async () => {
    await new Promise(r => setTimeout(r, 500));
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
    setShowSetupModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">💰 Indique e Ganhe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ganhe comissão por cada indicação convertida!
        </p>
      </div>

      {/* Asaas Setup Card - DESTAQUE PRINCIPAL */}
      {user && (
        <Card className={user?.wallet_activation_paid ? 'border-green-200 bg-green-50' : 'border-red-300 bg-red-50'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  {user?.wallet_activation_paid ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-green-900">✓ Carteira Ativada</h3>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-900">⚠️ Pagamento de Ativação</h3>
                    </>
                  )}
                </div>

                <p className="text-sm text-slate-700 mb-4">
                  {user?.wallet_activation_paid
                    ? '✓ Pagamento confirmado! Seus dados estão cadastrados no Asaas. Você já pode gerar links e receber comissões!'
                    : '⚠️ Pague R$14,99, referente as taxas de criação da Carteira ASAAS, uma única vez, para começar a ganhar com o Indique e Ganhe no Clube Sou Brasil!'}
                </p>

                {!user?.wallet_activation_paid && (
                  <Button
                    onClick={() => setShowSetupModal(true)}
                    className="h-10 font-bold bg-red-600 hover:bg-red-700 text-white gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Pagar R$ 14,99
                  </Button>
                )}
              </div>

              <div className={`text-4xl ${user?.wallet_activation_paid ? 'text-green-100' : 'text-red-100'}`}>
                {user?.wallet_activation_paid ? '🎉' : '🔒'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balance + Saque */}
      <WalletBalanceCard user={user} commissions={commissions} onUserUpdate={() => base44.auth.me().then(setUser)} />

      {/* Comissões */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="font-bold text-sm text-primary mb-3">💡 Tabela de Comissões</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Indicar cliente — plano Mensal Pró ou Anual Premium</span>
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
          <p className="text-xs text-slate-500 mt-3">* Comissão creditada somente após o pagamento ser compensado para a Sou Brasil. Válida apenas na 1ª mensalidade/anuidade.</p>
        </CardContent>
      </Card>

      {/* Referral Link Section - ÚNICO LINK */}
      {user && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Seu Link de Indicação
            </CardTitle>
            <CardDescription className="text-xs">
              Compartilhe este link com qualquer pessoa e ganhe comissões quando ela contratar um plano
            </CardDescription>
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
                  <Button onClick={() => shareWhatsApp(clientLink, '🎉 Use meu link do Clube Sou Brasil para se cadastrar e ganhamos benefícios exclusivos juntos!')}
                    className="gap-2 text-xs h-9 bg-green-600 hover:bg-green-700">
                    <Share2 className="w-3.5 h-3.5" />WhatsApp
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
          </div>
          );
          }