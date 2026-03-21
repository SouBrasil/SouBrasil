import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Copy, Check, Zap, AlertCircle, Loader2, QrCode,
  CreditCard, FileText, Gift, TrendingUp, Wallet, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import SetupAsaasModal from '@/components/affiliate/SetupAsaasModal';

export default function AffiliateProgram() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u));
  }, []);

  const { data: commissions = [] } = useQuery({
    queryKey: ['myCommissions'],
    queryFn: () => base44.entities.AffiliateCommission.filter({ referrer_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
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
    // Se não tem wallet Asaas, obriga a configurar
    if (!user?.asaas_wallet_id) {
      toast.error('Você precisa ativar o recebimento automático primeiro!');
      setShowSetupModal(true);
      return;
    }
    // Se não tem referral_code, gera
    if (!user?.referral_code) {
      try {
        await base44.functions.invoke('affiliateSystem', { 
          action: 'generate_referral_code' 
        });
        // Atualiza o user para refletir o novo código
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
        toast.success('Link gerado com sucesso!');
      } catch (err) {
        toast.error('Erro ao gerar link');
      }
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
    const text = encodeURIComponent(`🎉 Conheça o Clube Sou Brasil!\n\nUse meu link para se cadastrar e ganhamos benefícios exclusivos juntos:\n\n${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">💰 Indique e Ganhe</h1>
        <p className="text-sm text-muted-foreground mt-1">Ganhe comissão por cada indicação convertida com pagamentos automáticos</p>
      </div>

      {/* Saldo Principal */}
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-100 text-sm font-medium">Total já Recebido</p>
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

      {/* Setup Asaas */}
      {!user?.asaas_wallet_id && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-900">Ativar Recebimento Automático</p>
              <p className="text-xs text-amber-700 mt-1">Cadastre seus dados bancários para receber as comissões diretamente na sua conta via PIX.</p>
              <Button
                onClick={() => setShowSetupModal(true)}
                className="mt-3 h-8 text-xs bg-amber-600 hover:bg-amber-700"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Ativar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link de Indicação */}
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
                className="w-full h-11 font-bold bg-primary hover:bg-primary/90"
              >
                <Gift className="w-4 h-4 mr-2" />
                Gerar Meu Link de Indicação
              </Button>
            ) : (
              <>
                <div className="bg-muted rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Link personalizado:</p>
                  <p className="text-xs font-mono break-all text-slate-700">{referralLink}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={copyLink}
                    variant="outline"
                    className="gap-2 text-sm h-10"
                  >
                    {copiedLink ? (
                      <><Check className="w-4 h-4" /> Copiado</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copiar Link</>
                    )}
                  </Button>
                  <Button
                    onClick={shareWhatsApp}
                    className="gap-2 text-sm h-10 bg-green-600 hover:bg-green-700"
                  >
                    <Zap className="w-4 h-4" />
                    Compartilhar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabela de Comissões */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="font-bold text-sm text-primary mb-3">💡 Como Funcionam as Comissões</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm p-2 bg-white rounded-lg">
              <span className="text-slate-600">Cliente → Plano Mensal ou Anual</span>
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
            ⚡ O comissionamento é processado automaticamente após a confirmação do pagamento. O saldo fica disponível para resgate na sua conta digital em até 48 horas.
          </p>
        </CardContent>
      </Card>

      {/* Histórico de Comissões */}
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
                <div key={c.id} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{c.referred_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.user_type === 'cliente' ? 'Cliente' : 'Parceiro'} • {c.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
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

      {/* Como Funciona */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como Funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ['1', 'Copie seu link exclusivo acima'],
            ['2', 'Compartilhe no WhatsApp, redes sociais ou com amigos'],
            ['3', 'Quando alguém se cadastra via seu link e contrata um plano...'],
            ['4', 'Você ganha comissão automaticamente! 🎉'],
            ['5', 'O dinheiro fica disponível para transferência em até 48h'],
          ].map(([num, text]) => (
            <div key={num} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">{num}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal Setup */}
      {showSetupModal && <SetupAsaasModal user={user} onClose={() => setShowSetupModal(false)} onSuccess={() => {
        setShowSetupModal(false);
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }} />}
    </div>
  );
}