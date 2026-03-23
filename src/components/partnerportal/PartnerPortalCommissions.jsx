import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet, ArrowDownToLine, RefreshCw, Loader2,
  TrendingUp, CheckCircle2, Clock, ArrowUpRight,
  Copy, Share2, AlertCircle, Gift, Pencil, X, Save, Zap, Check
} from 'lucide-react';
import { toast } from 'sonner';
import AsaasSetupModal from '@/components/affiliate/AsaasSetupModal';
import WalletActivationPaymentModal from '@/components/affiliate/WalletActivationPaymentModal';
import ConfirmWalletActivationModal from '@/components/affiliate/ConfirmWalletActivationModal';

export default function PartnerPortalCommissions({ partner, partnerAccess }) {
  const [user, setUser] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAsaasModal, setShowAsaasModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPix, setEditingPix] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const [savingPix, setSavingPix] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [walletBlocked, setWalletBlocked] = useState(true);
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['partner-commission-user'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setUser(u);
      setWalletBlocked(!u?.wallet_activation_paid);
      return u;
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['partner-commissions', user?.email],
    queryFn: () => base44.entities.AffiliateCommission.filter(
      { referrer_email: user.email },
      '-created_date',
      200
    ),
    enabled: !!user?.email && !walletBlocked,
  });

  const refetchBalance = async () => {
    if (!user?.asaas_wallet_id) return;
    setLoadingBalance(true);
    try {
      const res = await base44.functions.invoke('asaasWallet', { action: 'get_balance' });
      if (res.data?.success) {
        setBalanceData(res.data);
      }
    } catch (e) {
      console.warn('Erro ao buscar saldo:', e);
    } finally {
      setLoadingBalance(false);
    }
  };

  useState(() => {
    if (user?.asaas_wallet_id && !user.asaas_wallet_id.startsWith('ASAAS_')) {
      refetchBalance();
    }
  }, [user?.asaas_wallet_id]);

  const totalHistorico = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const confirmado = commissions.filter(c => c.status === 'confirmada').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendente = commissions.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const transferido = commissions.filter(c => c.status === 'transferida').reduce((sum, c) => sum + (c.commission_value || 0), 0);

  const hasRealWallet = user?.asaas_wallet_id && !user?.asaas_wallet_id?.startsWith('ASAAS_');
  const pixKey = user?.asaas_pix_key || '';
  const asaasBalance = (balanceData?.balance !== undefined) ? balanceData.balance : confirmado;

  const handleSavePix = async () => {
    if (!pixInput.trim()) { toast.error('Digite uma chave PIX válida'); return; }
    setSavingPix(true);
    try {
      const res = await base44.functions.invoke('asaasWallet', { action: 'update_pix_key', pix_key: pixInput.trim() });
      if (res.data?.success) {
        toast.success('Chave PIX atualizada!');
        setEditingPix(false);
        const u = await base44.auth.me();
        setUser(u);
      } else {
        toast.error(res.data?.error || 'Erro ao salvar chave PIX');
      }
    } catch (e) {
      toast.error('Erro ao salvar chave PIX');
    } finally {
      setSavingPix(false);
    }
  };

  const clientLink = user?.referral_code
    ? `${window.location.origin}/OnboardingRegister?ref=${user.referral_code}`
    : partnerAccess
    ? `${window.location.origin}/OnboardingRegister?ref=${partnerAccess.referral_link || partnerAccess.partner_id}`
    : '';

  const copyLink = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'client') { setCopiedClient(true); setTimeout(() => setCopiedClient(false), 2000); }
    toast.success('Link copiado!');
  };

  const shareWhatsApp = (link, msg) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${msg}\n\n${link}`)}`, '_blank');
  };

  const handleWithdraw = async () => {
    if (confirmado <= 0) {
      toast.error('Sem saldo confirmado disponível para saque.');
      return;
    }
    if (!pixKey) {
      toast.error('Configure sua chave PIX antes de sacar.');
      setEditingPix(true);
      setPixInput('');
      return;
    }
    if (!window.confirm(`Confirmar saque de R$ ${confirmado.toFixed(2)} para a chave PIX: ${pixKey}?`)) return;

    setWithdrawing(true);
    try {
      const res = await base44.functions.invoke('asaasWallet', { action: 'request_withdrawal' });
      if (res.data?.success) {
        toast.success(res.data.message || 'Saque solicitado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['partner-commissions'] });
        queryClient.invalidateQueries({ queryKey: ['partner-wallet-balance'] });
        refetchBalance();
      } else {
        toast.error(res.data?.error || 'Erro ao solicitar saque');
      }
    } catch (e) {
      toast.error('Erro ao processar saque');
    } finally {
      setWithdrawing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setShowAsaasModal(true);
  };

  const handleSetupSuccess = async () => {
    await new Promise(r => setTimeout(r, 500));
    const updatedUser = await base44.auth.me();
    setUser(updatedUser);
    setWalletBlocked(!updatedUser?.wallet_activation_paid);
    setShowAsaasModal(false);
    queryClient.invalidateQueries({ queryKey: ['partner-commissions'] });
  };

  return (
    <div className="space-y-4">

      {/* Botão de Ativação - ACIMA da Carteira Ativa */}
      {walletBlocked && (
        <Button
          onClick={() => setShowConfirmModal(true)}
          className="w-full h-11 font-bold text-base bg-red-500 hover:bg-red-600 text-white gap-2"
        >
          <Zap className="w-5 h-5" />
          Ativar Carteira Agora (R$ 14,99)
        </Button>
      )}

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

      {/* Total Histórico */}
      {!walletBlocked && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Ganho com Indicações</p>
                <p className="text-xs text-green-600">Desde o início</p>
              </div>
            </div>
            <p className="text-3xl font-black text-green-700">R$ {totalHistorico.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">{commissions.length} indicação(ões) convertida(s)</p>
          </CardContent>
        </Card>
      )}

      {/* Status Grid */}
      {!walletBlocked && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-3 text-center">
              <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-sm font-black text-amber-700">R$ {pendente.toFixed(2)}</p>
              <p className="text-[10px] text-amber-600">Pendente</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-sm font-black text-blue-700">R$ {confirmado.toFixed(2)}</p>
              <p className="text-[10px] text-blue-600">Disponível</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-3 text-center">
              <ArrowUpRight className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <p className="text-sm font-black text-slate-600">R$ {transferido.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500">Sacado</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallet Asaas + Saque */}
      {!walletBlocked && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <p className="font-bold text-sm text-primary">Carteira Asaas</p>
              </div>
              {hasRealWallet && (
                <button onClick={() => refetchBalance()} className="text-primary/60 hover:text-primary transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBalance ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Saldo */}
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-0.5">Saldo disponível para saque</p>
              {loadingBalance ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-slate-400">Atualizando...</span>
                </div>
              ) : (
                <p className="text-2xl font-black text-primary">R$ {asaasBalance.toFixed(2)}</p>
              )}
            </div>

            {/* Chave PIX editável */}
            <div className="mb-3">
              {editingPix ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Nova chave PIX (CPF, e-mail, telefone ou aleatória)</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 h-9 border border-input rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Ex: seu@email.com"
                      value={pixInput}
                      onChange={e => setPixInput(e.target.value)}
                      disabled={savingPix}
                    />
                    <button
                      onClick={handleSavePix}
                      disabled={savingPix}
                      className="h-9 px-3 rounded-md bg-primary text-white text-xs font-bold flex items-center gap-1 hover:bg-primary/90 disabled:opacity-50"
                    >
                      {savingPix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {savingPix ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditingPix(false)}
                      disabled={savingPix}
                      className="h-9 px-2 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">Chave PIX</p>
                    <p className={`text-xs font-medium ${pixKey ? 'text-slate-700' : 'text-red-500'}`}>
                      {pixKey || 'Não configurada — clique em ✏️ para configurar'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingPix(true); setPixInput(pixKey); }}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors"
                    title="Editar chave PIX"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || confirmado <= 0}
              className="w-full bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              {withdrawing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              ) : (
                <><ArrowDownToLine className="w-4 h-4" /> Solicitar Saque (R$ {confirmado.toFixed(2)})</>
              )}
            </Button>
            {confirmado <= 0 && (
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Aguarde a confirmação das comissões pendentes
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referral Link Section - ÚNICO LINK */}
      {!walletBlocked && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-700">🔗 Link de Indicação</h3>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-slate-600">Compartilhe este link com qualquer pessoa e ganhe comissões quando ela contratar um plano</p>
              <div className="bg-white rounded-lg px-3 py-2 text-xs font-mono break-all text-slate-600 border border-slate-200">
                {clientLink || 'Configure sua carteira para gerar o link'}
              </div>
              {clientLink && (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => copyLink(clientLink, 'client')} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                    {copiedClient ? <><CheckCircle2 className="w-3 h-3" />Copiado!</> : <><Copy className="w-3 h-3" />Copiar</>}
                  </Button>
                  <Button onClick={() => shareWhatsApp(clientLink, '🎉 Use meu link do Clube Sou Brasil para se cadastrar!')}
                    size="sm" className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700">
                    <Share2 className="w-3 h-3" />WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Histórico */}
      {!walletBlocked && commissions.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2">Histórico de Comissões</h3>
          <div className="space-y-2">
            {commissions.slice(0, 10).map(c => (
              <Card key={c.id} className="border-slate-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.referred_name || c.referred_email}</p>
                    <p className="text-[10px] text-slate-400">{c.user_type} · {c.plan_type} · {new Date(c.created_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-700">+R$ {(c.commission_value || 0).toFixed(2)}</p>
                    <Badge variant="outline" className={`text-[9px] ${
                      c.status === 'confirmada' ? 'border-blue-300 text-blue-600' :
                      c.status === 'transferida' ? 'border-slate-300 text-slate-500' :
                      'border-amber-300 text-amber-600'
                    }`}>{c.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
      {showAsaasModal && (
        <AsaasSetupModal
          onSuccess={handleSetupSuccess}
          onClose={() => setShowAsaasModal(false)}
        />
      )}
    </div>
  );
}