import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Trash2, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminPanelDuplicateReports() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('new');
  const qc = useQueryClient();

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['duplicate-reports'],
    queryFn: async () => {
      const result = await base44.entities.ContactMessage.list('-created_date', 500);
      return result.filter(m => m.type === 'cadastro_duplicado') || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContactMessage.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duplicate-reports'] });
      toast.success('Mensagem removida');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ContactMessage.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duplicate-reports'] });
      toast.success('Status atualizado');
    },
  });

  const filtered = messages.filter(m => {
    const matchSearch = !search || 
      m.sender_email?.toLowerCase().includes(search.toLowerCase()) ||
      m.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.extra_info?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const newCount = messages.filter(m => m.status === 'nova').length;
  const analyzingCount = messages.filter(m => m.status === 'em_analise').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por email, nome ou CPF/CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            ['new', `⏰ Nova (${newCount})`],
            ['em_analise', `🔍 Analisando (${analyzingCount})`],
            ['respondida', '✅ Respondida'],
            ['all', 'Todas']
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === val
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} relatório(s) {isLoading && '(carregando...)'}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum relatório de duplicidade encontrado</p>
          <p className="text-xs mt-1">
            {filterStatus === 'new' ? 'Não há novas mensagens.' : 'Tente mudar o filtro acima.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const statusConfig = {
              nova: { label: 'Nova', icon: Clock, color: 'bg-orange-100 text-orange-700' },
              em_analise: { label: 'Analisando', icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
              respondida: { label: 'Respondida', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
            };
            const st = statusConfig[m.status] || statusConfig.nova;
            const StatusIcon = st.icon;

            return (
              <Card key={m.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-slate-800">{m.sender_name || 'Sem nome'}</p>
                        <Badge className={`text-[10px] ${st.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{m.sender_email}</p>
                      <div className="bg-red-50 rounded-lg p-3 mb-3 border border-red-200">
                        <p className="text-xs font-semibold text-red-800 mb-1">
                          {m.extra_info ? `⚠️ Duplicidade: ${m.extra_info}` : '⚠️ Cadastro duplicado'}
                        </p>
                        <p className="text-xs text-red-700 mt-2">{m.message}</p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(m.created_date).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(m.created_date).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.status !== 'respondida' && (
                        <button
                          onClick={() =>
                            updateMutation.mutate({ id: m.id, status: 'respondida' })
                          }
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marcar como respondida"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(m.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}