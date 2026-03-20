import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, AlertTriangle, Clock, Eye, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const statusConfig = {
  aguardando_analise: { label: 'Aguardando Análise', color: 'bg-orange-100 text-orange-700' },
  em_analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
};

const userTypeLabel = {
  premium_anual: 'Premium Anual', premium_mensal: 'Premium Mensal', trial: 'Trial',
  free: 'Free', parceiro_comercial: 'Parceiro Comercial', funcionario: 'Funcionário',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h atrás`;
  return `${hours}h atrás`;
}

export default function AdminPanelTechIssues({ session }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const qc = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['tech-issues'],
    queryFn: () => base44.entities.TechIssue.list('reported_at', 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TechIssue.update(id, data),
    onSuccess: async (_, { id, data }) => {
      qc.invalidateQueries({ queryKey: ['tech-issues'] });
      toast.success('Chamado atualizado!');
      // Notificar usuário
      if (data.status && selected?.user_email) {
        const statusLabel = statusConfig[data.status]?.label || data.status;
        await base44.entities.Notification.create({
          title: `📋 Seu chamado foi atualizado`,
          message: `Status: ${statusLabel}. ${data.admin_notes ? 'Obs: ' + data.admin_notes : ''}`,
          type: 'system',
          target: 'specific',
          target_email: selected.user_email,
          sent_at: new Date().toISOString(),
        });
      }
    },
  });

  const filtered = issues.filter(i => {
    const matchSearch = !search || i.user_name?.toLowerCase().includes(search.toLowerCase()) || i.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    const matchType = filterType === 'all' || i.user_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const tabs = [
    ['all', 'Todos'],
    ['aguardando_analise', 'Aguardando Análise'],
    ['em_analise', 'Em Análise'],
    ['concluido', 'Concluído'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
          <option value="all">Todos os Tipos</option>
          {Object.entries(userTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === val ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{filtered.length} chamados</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(issue => {
            const st = statusConfig[issue.status] || statusConfig.aguardando_analise;
            const ut = userTypeLabel[issue.user_type] || issue.user_type;
            return (
              <Card key={issue.id} className="border-slate-200 cursor-pointer hover:border-orange-200 transition-colors" onClick={() => { setSelected(issue); setAdminNote(issue.admin_notes || ''); }}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-800">{issue.user_name}</p>
                        <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                        <Badge className="text-[10px] bg-slate-100 text-slate-600">{ut}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{issue.description?.substring(0, 80)}...</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5" />
                        Aberto há {timeAgo(issue.reported_at || issue.created_date)}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-sm">Chamado #{selected.id?.slice(-6)}</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Usuário</p><p className="font-medium">{selected.user_name}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Tipo</p><p className="font-medium text-xs">{userTypeLabel[selected.user_type] || selected.user_type}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">E-mail</p><p className="font-medium text-xs">{selected.user_email}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">WhatsApp</p><p className="font-medium">{selected.whatsapp || '—'}</p></div>
                <div className="col-span-2 bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Região</p><p className="font-medium">{selected.region || '—'}</p></div>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-xs font-bold text-orange-700 mb-2">Descrição do Problema:</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{selected.description}</p>
              </div>
              {selected.image_url && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">Print enviado:</p>
                  <a href={selected.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={selected.image_url} alt="Print" className="w-full rounded-xl border border-slate-200 hover:opacity-90 transition-opacity" />
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">Observação do Admin:</p>
                <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} placeholder="Adicionar nota interna ou retorno ao usuário..." className="resize-none" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">Atualizar Status:</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(statusConfig).map(([key, { label, color }]) => (
                    <button key={key}
                      onClick={() => { updateMutation.mutate({ id: selected.id, data: { status: key, admin_notes: adminNote } }); setSelected(s => ({ ...s, status: key })); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected.status === key ? color + ' border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => updateMutation.mutate({ id: selected.id, data: { admin_notes: adminNote } })}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl">
                Salvar Observações
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}