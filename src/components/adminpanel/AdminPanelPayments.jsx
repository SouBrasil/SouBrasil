import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CreditCard, RefreshCw, CheckCircle2, Clock, XCircle, AlertTriangle, Search, Download, Loader2, Wifi } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const STATUS_MAP = {
  PENDING:    { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  RECEIVED:   { label: 'Recebido',  color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  CONFIRMED:  { label: 'Confirmado', color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  OVERDUE:    { label: 'Vencido',    color: 'bg-red-100 text-red-700',       icon: AlertTriangle },
  REFUNDED:   { label: 'Estornado',  color: 'bg-orange-100 text-orange-700', icon: XCircle },
  CANCELLED:  { label: 'Cancelado',  color: 'bg-slate-100 text-slate-600',   icon: XCircle },
};

const BILLING_LABELS = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão' };

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-600', icon: Clock };
  const Icon = s.icon;
  return (
    <Badge className={`text-[10px] flex items-center gap-1 ${s.color}`}>
      <Icon className="w-3 h-3" />{s.label}
    </Badge>
  );
}

function SummaryCard({ label, value, colorClass }) {
  return (
    <Card className={`border ${colorClass} shadow-md`}>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-xl font-black text-slate-800">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminPanelPayments() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const qc = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['ap-payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 500),
    staleTime: 0,
  });

  // ── Atualização em tempo real via subscription ──
  useEffect(() => {
    const unsubscribe = base44.entities.Payment.subscribe((event) => {
      qc.invalidateQueries({ queryKey: ['ap-payments'] });
      setLastUpdate(new Date());
      if (event.type === 'create') {
        toast.success('💳 Novo pagamento registrado!');
      } else if (event.type === 'update') {
        const status = event.data?.status;
        if (status === 'RECEIVED' || status === 'CONFIRMED') {
          toast.success(`✅ Pagamento confirmado — ${event.data?.user_email || ''}`);
        } else if (status === 'OVERDUE') {
          toast.warning(`⚠️ Pagamento vencido — ${event.data?.user_email || ''}`);
        }
      }
    });
    return () => unsubscribe();
  }, [qc]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('asaasPayment', { action: 'admin_sync_payments' });
      if (res.data?.success) {
        toast.success(`Sincronizado! ${res.data.synced} de ${res.data.total} pagamentos atualizados.`);
        qc.invalidateQueries({ queryKey: ['ap-payments'] });
        setLastUpdate(new Date());
      } else {
        toast.error(res.data?.error || 'Erro ao sincronizar');
      }
    } catch (e) {
      toast.error('Erro ao sincronizar pagamentos');
    }
    setSyncing(false);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Email', 'Nome', 'Plano', 'Valor', 'Método', 'Status', 'Ativado', 'Referral', 'Data'],
      ...payments.map(p => [
        p.user_email, p.user_name, p.plan, `R$ ${p.amount?.toFixed(2)}`,
        BILLING_LABELS[p.billing_type] || p.billing_type,
        p.status, p.subscription_activated ? 'Sim' : 'Não',
        p.referral_code || '', new Date(p.created_date).toLocaleDateString('pt-BR'),
      ]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pagamentos PENDING só aparecem se: o usuário visualizou a tela de pagamento (payment_viewed=true)
  // OU se já passaram mais de 5 minutos desde a criação (pode ser renovação via webhook)
  const filtered = payments.filter(p => {
    const matchSearch = !search ||
      p.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      p.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.asaas_payment_id?.includes(search);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;

    // Oculta PENDING que ainda não foi visualizado E foi criado há menos de 5 min
    if (p.status === 'PENDING' && !p.payment_viewed) {
      const createdAt = new Date(p.created_date).getTime();
      if (Date.now() - createdAt < FIVE_MINUTES_MS) return false;
    }

    return matchSearch && matchStatus;
  });

  const totalRecebido = payments
    .filter(p => ['RECEIVED', 'CONFIRMED'].includes(p.status))
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalPendente = payments
    .filter(p => p.status === 'PENDING' && (p.payment_viewed || (Date.now() - new Date(p.created_date).getTime() >= FIVE_MINUTES_MS)))
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalEstornado = payments
    .filter(p => ['REFUNDED', 'CANCELLED'].includes(p.status))
    .reduce((s, p) => s + (p.amount || 0), 0);
  const countActivated = payments.filter(p => p.subscription_activated).length;
  const isSandbox = payments.some(p => p.asaas_invoice_url?.includes('sandbox'));

  return (
    <div className="space-y-5">
      {isSandbox && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-700 space-y-1">
            <p><strong>⚠️ Modo Sandbox (Teste) detectado.</strong> Pagamentos não são reais.</p>
            <p>Para ir a produção, acesse <strong>Base44 → Settings → Environment Variables</strong> e configure:</p>
            <ul className="list-disc list-inside ml-1 space-y-0.5">
              <li><code className="bg-yellow-100 px-1 rounded">ASAAS_API_KEY</code> → sua chave de produção Asaas</li>
              <li><code className="bg-yellow-100 px-1 rounded">ASAAS_WEBHOOK_TOKEN</code> → token secreto para o webhook</li>
              <li><code className="bg-yellow-100 px-1 rounded">ASAAS_ENV</code> → <code className="bg-yellow-100 px-1 rounded">production</code></li>
            </ul>
            <p className="text-yellow-600">Após configurar, registre o webhook no Asaas: <strong>Integrações → Webhooks</strong> apontando para a URL da função <code className="bg-yellow-100 px-1 rounded">asaasWebhook</code>.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Recebido" value={`R$ ${totalRecebido.toFixed(2)}`} colorClass="border-green-200 bg-green-50" />
        <SummaryCard label="Pendente" value={`R$ ${totalPendente.toFixed(2)}`} colorClass="border-yellow-200 bg-yellow-50" />
        <SummaryCard label="Estornado" value={`R$ ${totalEstornado.toFixed(2)}`} colorClass="border-red-200 bg-red-50" />
        <SummaryCard label="Assinaturas Ativas" value={countActivated} colorClass="border-blue-200 bg-blue-50" />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por e-mail, nome ou ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === s ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s === 'all' ? 'Todos' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2 h-9 text-xs">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2 h-9 text-xs">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Status tempo real */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{filtered.length} pagamento(s)</p>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1">
          <Wifi className="w-3 h-3 text-green-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs text-green-700 font-medium">
            Tempo real {lastUpdate ? `· ${lastUpdate.toLocaleTimeString('pt-BR')}` : '· aguardando eventos'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum pagamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map(p => (
            <Card key={p.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-800 truncate">{p.user_name || p.user_email}</p>
                      <StatusBadge status={p.status} />
                      {p.subscription_activated && (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700">✅ Assinatura ativa</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{p.user_email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        Plano: <strong className="text-slate-700">{p.plan === 'annual' ? 'Anual' : 'Mensal'}</strong>
                      </span>
                      <span className="text-xs text-slate-500">
                        Via: <strong className="text-slate-700">{BILLING_LABELS[p.billing_type] || p.billing_type}</strong>
                      </span>
                      {p.referral_code && (
                        <span className="text-xs text-purple-600">Ref: {p.referral_code}</span>
                      )}
                      {p.asaas_payment_id && (
                        <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">{p.asaas_payment_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-green-700 text-base">R$ {(p.amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{new Date(p.created_date).toLocaleDateString('pt-BR')}</p>
                    {p.asaas_invoice_url && (
                      <a href={p.asaas_invoice_url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-blue-500 underline">Ver fatura</a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}