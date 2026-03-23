import { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Copy, Check, Zap, AlertCircle, Loader2, Gift, TrendingUp, Wallet,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import AsaasSetupModal from '@/components/affiliate/AsaasSetupModal';
import WalletActivationPaymentModal from '@/components/affiliate/WalletActivationPaymentModal';
import ConfirmWalletActivationModal from '@/components/affiliate/ConfirmWalletActivationModal';

export default function AffiliateProgram() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [walletBlocked, setWalletBlocked] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setWalletBlocked(!u?.wallet_activation_paid);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
    await new Promise(r => setTimeout(r, 500));
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
    setWalletBlocked(!updatedUser?.wallet_activation_paid);
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

  return (
    <>
      <div className="px-4 py-6 space-y-6 pb-24 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground">💰 Indique e Ganhe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ganhe comissão por cada indicação convertida com pagamentos automáticos
          </p>
        </div>

        {/* Botão de Ativação - ACIMA da Carteira Ativa */}
        {walletBlocked && (
          <Button
            onClick={() => setShowConfirmModal(true)}
            className="w-full h-12 font-bold text-base bg-red-500 hover:bg-red-600 text-white gap-2"
          >
            <Zap className="w-5 h-5" />
            Ativar Carteira Agora (R$ 14,99)
          </Button>
        )}

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

        {/* Carteira Ativa - Status Card */}
        {walletBlocked ? (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-red-900">Carteira Bloqueada</h3>
                  </div>
                  <p className="text-sm text-red-700 mb-4">
                    ⚠️ Pague R$ 14,99 para ativar sua carteira e começar a ganhar com indicações!
                  </p>
                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Pagar R$ 14,99
                  </Button>
                </div>
                <div className="text-4xl text-red-100">🔒</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-green-900">✓ Carteira Ativada</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    ✓ Seus dados estão cadastrados no Asaas. Você já pode gerar links e receber comissões!
                  </p>
                </div>
                <div className="text-4xl text-green-100">🎉</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Link Section */}
        {user && !walletBlocked && (
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
        {!walletBlocked && (
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
        )}

        {/* Earnings History */}
        {!walletBlocked && (
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
        )}

        {/* How It Works */}
        {!walletBlocked && (
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
        )}
      </div>

      {/* Modals */}
      {showConfirmModal && (
        <ConfirmWalletActivationModal
          onConfirm={() => {
            setShowConfirmModal(false);
            setShowPaymentModal(true);
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      {showPaymentModal && (
        <WalletActivationPaymentModal
          user={user}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
      {showSetupModal && (
        <AsaasSetupModal
          onClose={() => setShowSetupModal(false)}
          onSuccess={handleSetupSuccess}
        />
      )}
    </>
  );
}