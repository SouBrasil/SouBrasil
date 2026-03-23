import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowDownToLine, RefreshCw, Loader2, TrendingUp, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletBalanceCard({ user, commissions = [] }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const queryClient = useQueryClient();

  const totalHistorico = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const confirmado = commissions.filter(c => c.status === 'confirmada').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendente = commissions.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const transferido = commissions.filter(c => c.status === 'transferida').reduce((sum, c) => sum + (c.commission_value || 0), 0);

  const { data: balanceData, isLoading: loadingBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['wallet-balance', user?.email],
    queryFn: () => base44.functions.invoke('asaasWallet', { action: 'get_balance' }).then(r => r.data),
    enabled: !!user?.asaas_wallet_id && !user?.asaas_wallet_id?.startsWith('ASAAS_'),
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const hasRealWallet = user?.asaas_wallet_id && !user?.asaas_wallet_id?.startsWith('ASAAS_');
  const asaasBalance = balanceData?.balance ?? confirmado;

  const handleWithdraw = async () => {
    if (confirmado <= 0) {
      toast.error('Sem saldo confirmado disponível para saque.');
      return;
    }
    if (!window.confirm(`Confirmar saque de R$ ${confirmado.toFixed(2)} para sua chave PIX cadastrada?`)) return;

    setWithdrawing(true);
    try {
      const res = await base44.functions.invoke('asaasWallet', { action: 'request_withdrawal' });
      if (res.data?.success) {
        toast.success(res.data.message || 'Saque solicitado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['myCommissions'] });
        queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
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

  return (
    <div className="space-y-3">
      {/* Card principal — Total histórico */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Ganho com Indicações</p>
                <p className="text-xs text-green-600">Desde o início</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white text-xs">Histórico</Badge>
          </div>
          <p className="text-3xl font-black text-green-700">R$ {totalHistorico.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-1">{commissions.length} indicação(ões) convertida(s)</p>
        </CardContent>
      </Card>

      {/* Grid de status */}
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

      {/* Saldo Asaas + Botão Saque */}
      {hasRealWallet && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <p className="font-bold text-sm text-primary">Carteira Asaas</p>
              </div>
              <button onClick={() => refetchBalance()} className="text-primary/60 hover:text-primary transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBalance ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Saldo disponível</p>
                {loadingBalance ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-slate-400">Atualizando...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-black text-primary">R$ {asaasBalance.toFixed(2)}</p>
                )}
              </div>
              <p className="text-[10px] text-slate-400">PIX: {user?.pix_key || 'não configurado'}</p>
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
                Aguarde a confirmação das comissões pendentes para sacar
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!hasRealWallet && user?.asaas_wallet_id && (
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Carteira em configuração. Em breve você poderá solicitar saques.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}