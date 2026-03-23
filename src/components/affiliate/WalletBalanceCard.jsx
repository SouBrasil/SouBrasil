import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowDownToLine, RefreshCw, Loader2, TrendingUp, CheckCircle2, Clock, ArrowUpRight, Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletBalanceCard({ user, commissions = [], onUserUpdate }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [editingPix, setEditingPix] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const [savingPix, setSavingPix] = useState(false);
  const queryClient = useQueryClient();

  const totalHistorico = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const confirmado = commissions.filter(c => c.status === 'confirmada').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendente = commissions.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const transferido = commissions.filter(c => c.status === 'transferida').reduce((sum, c) => sum + (c.commission_value || 0), 0);

  const hasRealWallet = user?.asaas_wallet_id && !user?.asaas_wallet_id?.startsWith('ASAAS_');
  const pixKey = user?.asaas_pix_key || '';

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

      {/* Carteira + Saque — sempre visível */}
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
            <p className="text-xs text-slate-500 mb-0.5">Saldo disponível</p>
            {loadingBalance ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-slate-400">Atualizando...</span>
              </div>
            ) : (
              <p className="text-2xl font-black text-primary">R$ {(hasRealWallet ? asaasBalance : confirmado).toFixed(2)}</p>
            )}
          </div>

          {/* Chave PIX — editável */}
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

          {/* Botão de saque */}
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
    </div>
  );
}