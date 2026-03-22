import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, TrendingDown, Settings, Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import AdminPanelPayments from './AdminPanelPayments';
import TransactionDetailModal from './TransactionDetailModal';
import TransactionFilters from './TransactionFilters';
import AdminPanelTransactionTypes from './AdminPanelTransactionTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COMMISSION_LABELS = {
  indicacao_cliente: 'Indique e Ganhe (Clientes)',
  indicacao_parceiro: 'Indique e Ganhe (Parceiros)',
  representante: 'Representante',
  parceiro_comercial: 'Parceiro Comercial',
};

const COLORS = ['#16a34a', '#ca8a04', '#2563eb', '#9333ea'];

function CommissionConfig({ session }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const qc = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['commission-configs'],
    queryFn: () => base44.entities.CommissionConfig.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.CommissionConfig.update(editing.id, data)
      : base44.entities.CommissionConfig.create(data),
    onSuccess: () => { qc.invalidateQueries(['commission-configs']); setEditing(null); toast.success('Configuração salva!'); },
  });

  const openEdit = (config) => {
    setEditing(config || { id: null });
    setForm(config ? { ...config } : { type: 'indicacao_cliente', value: 10, value_type: 'fixo', description: '', active: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700">Configurações de Comissionamento</h3>
        <Button onClick={() => openEdit(null)} className="gap-2 bg-green-600 hover:bg-green-700 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Nova regra
        </Button>
      </div>

      <div className="space-y-3">
        {configs.map(c => (
          <Card key={c.id} className={`border-slate-200 ${!c.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{COMMISSION_LABELS[c.type] || c.type}</p>
                <p className="text-xs text-slate-500">{c.description || 'Sem descrição'}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-green-700 text-lg">
                  {c.value_type === 'percentual' ? `${c.value}%` : `R$ ${c.value}`}
                </p>
                <Badge className={`text-[10px] ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(c)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {configs.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Nenhuma regra de comissão configurada. Clique em "+ Nova regra" para começar.
          </div>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">{editing.id ? 'Editar Comissão' : 'Nova Comissão'}</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  {Object.entries(COMMISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Valor</label>
                  <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de Valor</label>
                  <select value={form.value_type} onChange={e => setForm(f => ({ ...f, value_type: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="fixo">Fixo (R$)</option>
                    <option value="percentual">Percentual (%)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva esta regra..." />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                Regra ativa
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancelar</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PERIOD_OPTIONS = [
  { value: null, label: 'Todos' },
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 21, label: '21 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 180, label: '180 dias' },
  { value: 365, label: '1 ano' },
];

function getDateRangeStart(days) {
  if (!days) return null; // 'Todos' não tem limite
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function FinancialControl() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [periodDays, setPeriodDays] = useState(7);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [form, setForm] = useState({ type: 'receita', amount: '', description: '', status: 'pendente', due_date: '', notes: '' });
  const qc = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['ap-transactions'],
    queryFn: () => base44.entities.FinancialTransaction.list('-created_date', 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialTransaction.create(data),
    onSuccess: () => { qc.invalidateQueries(['ap-transactions']); setShowForm(false); setForm({ type: 'receita', amount: '', description: '', status: 'pendente', due_date: '', notes: '' }); toast.success('Lançamento criado!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FinancialTransaction.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['ap-transactions']); setSelectedTransaction(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialTransaction.delete(id),
    onSuccess: () => { qc.invalidateQueries(['ap-transactions']); setSelectedTransaction(null); },
  });

  // Filtra transações pelo período e tipo
  const startDate = getDateRangeStart(periodDays);
  const filteredTransactions = transactions.filter(t => {
    const byDate = !startDate || new Date(t.paid_at || t.created_date) >= startDate;
    const byType = selectedTypes.length === 0 || selectedTypes.includes(t.type);
    return byDate && byType;
  });

  // Cálculos: receitas recebidas + pagas (status 'pago' ou 'RECEIVED'/'CONFIRMED'); despesas pagas; saldo
  const totalReceitasRecebidas = filteredTransactions
    .filter(t => ['receita', 'mensalidade'].includes(t.type) && ['pago', 'RECEIVED', 'CONFIRMED'].includes(t.status))
    .reduce((s, t) => s + t.amount, 0);
  const totalReceitasPagas = filteredTransactions
    .filter(t => ['receita', 'mensalidade'].includes(t.type) && t.status === 'pago')
    .reduce((s, t) => s + t.amount, 0);
  const totalDespesas = filteredTransactions
    .filter(t => t.type === 'despesa' && t.status === 'pago')
    .reduce((s, t) => s + t.amount, 0);
  const saldo = totalReceitasRecebidas - totalDespesas;

  const pendentes = filteredTransactions.filter(t => t.status === 'pendente');

  // Gráfico com número de dias do período (máx 30 dias para visualização)
  const chartDays = periodDays ? Math.min(periodDays, 30) : 30;
  const chartData = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (chartDays - 1 - i));
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const receitas = filteredTransactions
      .filter(t => ['receita', 'mensalidade'].includes(t.type) && ['pago', 'RECEIVED', 'CONFIRMED'].includes(t.status) && new Date(t.paid_at || t.created_date).toDateString() === d.toDateString())
      .reduce((s, t) => s + t.amount, 0);
    const despesas = filteredTransactions
      .filter(t => t.type === 'despesa' && t.status === 'pago' && new Date(t.paid_at || t.created_date).toDateString() === d.toDateString())
      .reduce((s, t) => s + t.amount, 0);
    return { label, receitas, despesas };
  });

  const typeColors = { receita: 'text-green-600', despesa: 'text-red-500', comissao: 'text-blue-600', estorno: 'text-orange-500', mensalidade: 'text-purple-600' };

  return (
    <div className="space-y-5">
      {/* Filtro de período em círculos 3D */}
      <div className="flex gap-4 justify-center overflow-x-auto pb-4">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setPeriodDays(opt.value)}
            className={`flex items-center justify-center w-16 h-16 rounded-full text-xs font-bold whitespace-nowrap transition-all transform hover:scale-110 ${
              periodDays === opt.value
                ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-[0_8px_16px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.2),inset_2px_2px_4px_rgba(255,255,255,0.3)]'
                : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 shadow-[0_8px_16px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(0,0,0,0.1),inset_2px_2px_4px_rgba(255,255,255,0.4)]'
            }`}
            title={opt.label}
          >
            <span className="text-center">{opt.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="bg-green-50 border-green-200 shadow-md">
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-xl font-black text-green-700">R$ {totalReceitasRecebidas.toFixed(2)}</p>
            <p className="text-xs text-green-600">Receitas recebidas</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 shadow-md">
          <CardContent className="p-4">
            <TrendingDown className="w-5 h-5 text-red-500 mb-1" />
            <p className="text-xl font-black text-red-600">R$ {totalDespesas.toFixed(2)}</p>
            <p className="text-xs text-red-500">Despesas pagas</p>
          </CardContent>
        </Card>
      </div>

      <Card className={`${saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} shadow-md`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <DollarSign className={`w-8 h-8 ${saldo >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />
            <div>
              <p className={`text-2xl font-black ${saldo >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>R$ {saldo.toFixed(2)}</p>
              <p className="text-xs text-slate-500">Saldo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fluxo Financeiro — {PERIOD_OPTIONS.find(o => o.value === periodDays)?.label}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `R$ ${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="receitas" stroke="#16a34a" strokeWidth={2} dot={false} name="Receitas" />
              <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={false} name="Despesas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <TransactionFilters selectedTypes={selectedTypes} onTypeChange={setSelectedTypes} />

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700 text-sm">Lançamentos ({filteredTransactions.length})</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-green-600 hover:bg-green-700 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo
        </Button>
      </div>

      {pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs font-bold text-yellow-700">⚠️ {pendentes.length} lançamento(s) pendente(s)</p>
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Nenhum lançamento neste período</div>
        ) : (
          filteredTransactions.slice(0, 50).map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedTransaction(t)}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all shadow-sm"
            >
              <div className={`w-2 h-8 rounded-full ${t.type === 'receita' ? 'bg-green-500' : t.type === 'despesa' ? 'bg-red-400' : 'bg-blue-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.description}</p>
                <p className="text-xs text-slate-400">{t.type} • {new Date(t.created_date).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold text-sm ${typeColors[t.type] || 'text-slate-700'}`}>
                  {t.type === 'despesa' ? '-' : '+'}R$ {t.amount.toFixed(2)}
                </p>
                <Badge className={`text-[10px] ${t.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
          onDelete={(id) => deleteMutation.mutateAsync(id)}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Novo Lançamento</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    {[['receita','Receita'],['despesa','Despesa'],['comissao','Comissão'],['mensalidade','Mensalidade'],['estorno','Estorno']].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Valor (R$)</label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0,00" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição *</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Mensalidade premium - João" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Vencimento</label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Observações</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionais..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.description} className="flex-1 bg-green-600 hover:bg-green-700">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanelFinancial({ session }) {
  const [subMenu, setSubMenu] = useState('dashboard');

  return (
    <div className="space-y-4">
      <div className="flex gap-4 justify-center border-b border-slate-200 pb-6 overflow-x-auto">
        {[['dashboard','Dashboard'],['pagamentos','Pagamentos ASAAS'],['comissionamento','Comissionamento'],['tipos','Tipos de Lançamento']].map(([id, label]) => (
          <button key={id} onClick={() => setSubMenu(id)}
            className={`flex items-center justify-center w-20 h-20 rounded-full text-xs font-bold whitespace-nowrap transition-all transform hover:scale-110 ${
              subMenu === id 
                ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-[0_8px_16px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.2),inset_2px_2px_4px_rgba(255,255,255,0.3)]' 
                : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 shadow-[0_8px_16px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(0,0,0,0.1),inset_2px_2px_4px_rgba(255,255,255,0.4)]'
            }`}
            title={label}>
            <span className="text-center px-2">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {subMenu === 'dashboard' && <FinancialControl />}
      {subMenu === 'pagamentos' && <AdminPanelPayments />}
      {subMenu === 'comissionamento' && <CommissionConfig session={session} />}
      {subMenu === 'tipos' && <AdminPanelTransactionTypes />}
    </div>
  );
}