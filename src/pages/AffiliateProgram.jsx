import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Copy, Check, Zap, AlertCircle, Loader2, Gift, TrendingUp, Wallet,
  Share2, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import AsaasSetupModal from '@/components/affiliate/AsaasSetupModal';
import WalletActivationPaymentModal from '@/components/affiliate/WalletActivationPaymentModal';

export default function AffiliateProgram() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [walletBlocked, setWalletBlocked] = useState(true);
  const queryClient = useQueryClient();

  // Carrega usuário e força pagamento se não tiver wallet
  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        // Se não tem wallet, mostra modal de pagamento automaticamente
        if (!u?.asaas_wallet_id) {
          setShowPaymentModal(true);
          setWalletBlocked(true);
        } else {
          setWalletBlocked(false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Carrega comissões
  const { data: commissions = [] } = useQuery({
    queryKey: ['myCommissions'],
    queryFn: () => base44.entities.AffiliateCommission.filter(
      { referrer_email: user?.email },
      '-created_date',
      50
    ),
    enabled: !!user?.email && !walletBlocked,
  });

  const referralLink = user?.referral_code
    ? `${window.location.origin}/OnboardingRegister?ref=${user.referral_code}`
    : null;

  const totalEarned = user?.total_earned || 0;
  const confirmedEarnings = commissions
    .filter(c => c.status === 'confirmada')
    .reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendingEarnings = commissions
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + (c.commission_value || 0), 0);

  const handleGenerateLink = async () => {
    if (!user?.asaas_wallet_id) {
      toast.error('Configure sua carteira primeiro!');
      setShowPaymentModal(true);
      return;
    }

    if (referralLink) {
      toast.info('Link já foi gerado');
      return;
    }

    setGeneratingLink(true);
    try {
      await base44.functions.invoke('affiliateSystem', {
        action: 'generate_referral_code'
      });

      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      toast.success('Link gerado com sucesso!');
    } catch (err) {
      console.error('Generate link error:', err);
      toast.error('Erro ao gerar link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!referralLink) return;
    const text = encodeURIComponent(
      `🎉 Conheça o Clube Sou Brasil!\n\nUse meu link para se cadastrar e ganhamos benefícios exclusivos juntos:\n\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSetupSuccess = async () => {
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
    setWalletBlocked(false);
    setShowSetupModal(false);
    queryClient.invalidateQueries({ queryKey: ['myCommissions'] });
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setShowSetupModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // OVERLAY BLOQUEADOR - Impede acesso até pagar
  if (walletBlocked) {
    return (
      <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Ativar Carteira</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Para acessar o programa de indicações e começar a ganhar comissões, você precisa ativar sua carteira Asaas.
          </p>
          
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-3xl font-black text-red-600">R$ 14,99</p>
            <p className="text-xs text-red-600 mt-1">Taxa única de ativação</p>
          </div>

          <div className="space-y-2 text-sm text-slate-600 mb-6 text-left bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Carteira Asaas segura e criptografada</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Receba comissões automaticamente via PIX</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Saque disponível em até 48h</span>
            </div>
          </div>

          <Button
            onClick={() => setShowPaymentModal(true)}
            className="w-full h-12 font-bold text-base bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
          >
            <Zap className="w-5 h-5 mr-2" />
            Pagar R$ 14,99 Agora
          </Button>

          <p className="text-[10px] text-slate-400 mt-4">
            Clicando em "Pagar", você será redirecionado para confirmar o pagamento
          </p>
        </div>

        {showPaymentModal && (
          <WalletActivationPaymentModal
            user={user}
            onClose={() => {
              setShowPaymentModal(false);
            }}
            onSuccess={handlePaymentSuccess}
          />
        )}
        
        {showSetupModal && (
          <AsaasSetupModal
            onClose={() => {
              setShowSetupModal(false);
              setShowPaymentModal(false);
            }}
            onSuccess={handleSetupSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">💰 Indique e Ganhe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ganhe comissão por cada indicação convertida com pagamentos automáticos
        </p>
      </div>

      {/* Earnings */}
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-100 text-sm font-medium">Total Recebido</p>
            <p className="text-4xl font-black mt-2">R$ {totalEarned.toFixed(2)}</p>
          </div>
          <Wallet className="w-12 h-12 text-green-100 opacity-50" />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-green-400">
          <div>
            <p className="text-green-100 text-xs">Confirmado</p>
            <p className="text-lg font-bold">R$ {confirmedEarnings.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-green-100 text-xs">Pendente</p>
            <p className="text-lg font-bold">R$ {pendingEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Asaas Setup Card - DESTAQUE PRINCIPAL */}
      <Card className={'border-green-200 bg-green-50'}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900">✓ Carteira Ativada</h3>
              </div>

              <p className="text-sm text-slate-700 mb-4">
                ✓ Seus dados estão cadastrados no Asaas. Você já pode gerar links e receber comissões!
              </p>
            </div>

            <div className={'text-4xl text-green-100'}>
              🎉
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link Section */}
      {user && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Seu Link de Indicação
            </CardTitle>
            <CardDescription>Compartilhe para ganhar comissões</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {!referralLink ? (
              <Button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className={`w-full h-11 font-bold bg-primary hover:bg-primary/90`}
              >
                {generatingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Gerar Meu Link de Indicação
                  </>
                )}
              </Button>
            ) : (
              <>
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">Seu link exclusivo:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono break-all text-slate-800">
                      {referralLink}
                    </code>
                    <button
                      onClick={copyLink}
                      className="flex-shrink-0 p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {copiedLink ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={copyLink}
                    variant="outline"
                    className="gap-2 text-sm h-10"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={shareWhatsApp}
                    className="gap-2 text-sm h-10 bg-green-600 hover:bg-green-700"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Commission Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="font-bold text-sm text-primary mb-3">💡 Como Funcionam as Comissões</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm p-2 bg-white rounded-lg">
              <span className="text-slate-600">Cliente → Qualquer Plano</span>
              <Badge className="bg-green-100 text-green-700 font-bold">R$ 10,00</Badge>
            </div>
            <div className="flex justify-between items-center text-sm p-2 bg-white rounded-lg">
              <span className="text-slate-600">Parceiro → Plano Mensal</span>
              <Badge className="bg-amber-100 text-amber-700 font-bold">R$ 100,00</Badge>
            </div>
            <div className="flex justify-between items-center text-sm p-2 bg-white rounded-lg">
              <span className="text-slate-600">Parceiro → Plano Anual</span>
              <Badge className="bg-yellow-100 text-yellow-700 font-bold">R$ 200,00</Badge>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 p-2 bg-white rounded-lg border-l-4 border-primary">
            ⚡ O comissionamento é processado automaticamente após pagamento confirmado. Disponível para resgate em até 48h.
          </p>
        </CardContent>
      </Card>

      {/* Earnings History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Histórico de Ganhos
          </CardTitle>
          <CardDescription>Suas últimas indicações</CardDescription>
        </CardHeader>

        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma indicação convertida ainda</p>
              <p className="text-xs mt-1">Comece a compartilhar seu link!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{c.referred_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.user_type === 'cliente' ? 'Cliente' : 'Parceiro'} •{' '}
                      {c.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+ R$ {c.commission_value.toFixed(2)}</p>
                    <Badge
                      variant={c.status === 'confirmada' ? 'default' : 'outline'}
                      className="text-xs mt-1"
                    >
                      {c.status === 'confirmada' ? '✓ Confirmado' : '⏳ Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como Funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ['1', 'Pague R$ 14,99 para ativar sua carteira Asaas'],
            ['2', 'Cadastre seus dados bancários (CPF e Chave PIX)'],
            ['3', 'Clique em "Gerar Meu Link" para criar seu código exclusivo'],
            ['4', 'Copie e compartilhe no WhatsApp, redes sociais ou com amigos'],
            ['5', 'Quando alguém se cadastra via seu link e contrata um plano, você ganha comissão!'],
            ['6', 'O dinheiro fica na sua carteira Asaas em até 48h após pagamento confirmado'],
          ].map(([num, text]) => (
            <div key={num} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                {num}
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}