import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Filter, Download, TrendingUp, Users, DollarSign, Clock, CheckCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const statusColors = {
  pendente: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  confirmada: { label: 'Confirmada', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
  transferida: { label: 'Transferida', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
};

export default function AdminPanelAffiliates({ session }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const qc = useQueryClient();

  // Busca todas as comissões
  const { data: commissions = [], isLoading: loadingCommissions, refetch: refetchCommissions } = useQuery({
    queryKey: ['admin-affiliates-list'],
    queryFn: async () => {
      const result = await base44.entities.AffiliateCommission.list('-created_date', 500);
      return result || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Busca usuários para obter dados adicionais
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-affiliates'],
    queryFn: async () => {
      const result = await base44.entities.User.list('-created_date', 500);
      return result || [];
    },
  });

  // Estatísticas
  const totalCommissions = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendingAmount = commissions
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const transferredAmount = commissions
    .filter(c => c.status === 'transferida')
    .reduce((sum, c) => sum + (c.commission_value || 0), 0);

  // Agrupa por referrer para dashboard
  const affiliateStats = commissions.reduce((acc, comm) => {
    if (!acc[comm.referrer_email]) {
      const user = users.find(u => u.email === comm.referrer_email);
      acc[comm.referrer_email] = {
        email: comm.referrer_email,
        name: comm.referrer_name || 'Desconhecido',
        total: 0,
        pending: 0,
        transferred: 0,
        conversions: 0,
        asaasWallet: user?.asaas_wallet_id ? true : false,
      };
    }
    acc[comm.referrer_email].total += comm.commission_value || 0;
    acc[comm.referrer_email].conversions += 1;
    if (comm.status === 'pendente') {
      acc[comm.referrer_email].pending += comm.commission_value || 0;
    } else if (comm.status === 'transferida') {
      acc[comm.referrer_email].transferred += comm.commission_value || 0;
    }
    return acc;
  }, {});

  const affiliateList = Object.values(affiliateStats);
  const topAffiliates = [...affiliateList].sort((a, b) => b.total - a.total).slice(0, 5);

  // Filtra comissões
  const filtered = commissions.filter(c => {
    const matchSearch = !search ||
      c.referrer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.referrer_email?.toLowerCase().includes(search.toLowerCase()) ||
      c.referred_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.referred_email?.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchType = filterType === 'all' || c.user_type === filterType;
    
    return matchSearch && matchStatus && matchType;
  });

  // Exporta CSV
  const exportCSV = () => {
    const headers = ['Data', 'Afiliado', 'Email Afiliado', 'Indicado', 'Tipo', 'Plano', 'Comissão', 'Status'];
    const rows = filtered.map(c => [
      new Date(c.created_date).toLocaleDateString('pt-BR'),
      c.referrer_name,
      c.referrer_email,
      c.referred_name,
      c.user_type,
      c.plan_type,
      `R$ ${c.commission_value.toFixed(2)}`,
      c.status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `affiliates-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado!');
  };

  const canManage = ['master', 'administrador'].includes(session?.role);

  return (
    <div className="space-y-4">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total em Comissões</p>
            <p className="text-2xl font-black text-primary">R$ {totalCommissions.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">{commissions.length} comissões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Pendente</p>
            <p className="text-2xl font-black text-amber-600">R$ {pendingAmount.toFixed(2)}</p>
            <p className="text-xs text-amber-600 mt-1">{commissions.filter(c => c.status === 'pendente').length} pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Transferida</p>
            <p className="text-2xl font-black text-green-600">R$ {transferredAmount.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">{commissions.filter(c => c.status === 'transferida').length} transferidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Afiliados Ativos</p>
            <p className="text-2xl font-black text-primary">{affiliateList.length}</p>
            <p className="text-xs text-primary mt-1">{topAffiliates.length} tops</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Afiliados */}
      {topAffiliates.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">🏆 Top Afiliados</h3>
            </div>
            <div className="space-y-2">
              {topAffiliates.map((aff, idx) => (
                <div key={aff.email} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{aff.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{aff.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">R$ {aff.total.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{aff.conversions} conversões</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar afiliado ou indicado..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all', 'Todas'], ['pendente', 'Pendentes'], ['confirmada', 'Confirmadas'], ['transferida', 'Transferidas']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === val ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => refetchCommissions()} 
          className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shrink-0 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
        <button onClick={exportCSV}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-all shrink-0 flex items-center gap-1">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      {/* Lista de Comissões */}
      <div>
        <p className="text-xs text-slate-500 mb-3">{filtered.length} registros {loadingCommissions && '(carregando...)'}</p>
        
        {loadingCommissions ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">Nenhuma comissão encontrada</p>
            <p className="text-xs mt-1">Ajuste os filtros acima</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(comm => {
              const st = statusColors[comm.status] || statusColors.pendente;
              const StatusIcon = st.icon;
              return (
                <Card key={comm.id} className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      {/* Afiliado */}
                      <div className="sm:col-span-3">
                        <p className="font-semibold text-sm text-foreground">{comm.referrer_name}</p>
                        <p className="text-xs text-muted-foreground">{comm.referrer_email}</p>
                      </div>

                      {/* Seta */}
                      <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* Indicado */}
                      <div className="sm:col-span-3">
                        <p className="font-semibold text-sm text-foreground">{comm.referred_name}</p>
                        <p className="text-xs text-muted-foreground">{comm.user_type} • {comm.plan_type === 'monthly' ? 'Mensal' : 'Anual'}</p>
                      </div>

                      {/* Comissão e Status */}
                      <div className="sm:col-span-2 text-right">
                        <p className="font-bold text-primary">R$ {comm.commission_value.toFixed(2)}</p>
                        <Badge className={`text-[10px] mt-1 ${st.bg} ${st.text} flex items-center gap-1 w-fit ml-auto`}>
                          <StatusIcon className="w-3 h-3" /> {st.label}
                        </Badge>
                      </div>

                      {/* Data */}
                      <div className="sm:col-span-2 text-xs text-muted-foreground">
                        <p>{new Date(comm.created_date).toLocaleDateString('pt-BR')}</p>
                        {comm.payment_date && <p className="text-slate-500">{new Date(comm.payment_date).toLocaleDateString('pt-BR')}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}