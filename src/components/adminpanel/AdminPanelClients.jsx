import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User, Download, Filter, MapPin, Clock, Gift, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ClientDetailModal from './ClientDetailModal';
import DeleteUserConfirmModal from './DeleteUserConfirmModal';

function exportToCSV(data, filename) {
  const headers = ['Nome', 'Email', 'Telefone', 'CPF', 'Cidade', 'Bairro', 'Estado', 'Plano', 'Cadastro', 'Último Acesso', 'Usos', 'Inatividade (dias)'];
  const rows = data.map(u => [
    u.full_name || '', u.email || '', u.phone || '', u.cpf || '',
    u.city || '', u.neighborhood || '', u.state || '',
    u._subType || '', new Date(u.created_date).toLocaleDateString('pt-BR'),
    u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : 'Nunca',
    u._usageCount || 0, u._inactiveDays || ''
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPanelClients({ session }) {
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterInactivity, setFilterInactivity] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['ap-clients'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['ap-usages-cli'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 2000),
  });

  const grantTrialMutation = useMutation({
    mutationFn: async (user) => {
      return base44.entities.User.update(user.id, {
        trial_start_date: new Date().toISOString(),
        subscription_type: null,
        free_granted_until: null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-clients'] }); toast.success('Trial de 7 dias ativado!'); },
  });

  const makeFreeMutation = useMutation({
    mutationFn: async (userId) => {
      return base44.entities.User.update(userId, {
        trial_start_date: null,
        subscription_type: null,
        free_granted_until: null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-clients'] }); toast.success('Usuário revertido para Free!'); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (user) => {
      const res = await base44.functions.invoke('deleteUser', { userId: user.id, userEmail: user.email });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-clients'] }); toast.success('Usuário e todos os dados excluídos!'); },
    onError: (e) => toast.error('Erro ao excluir: ' + e.message),
  });

  const getSubType = (u) => {
    if (u.subscription_type === 'free_granted') {
      if (u.free_granted_until && new Date(u.free_granted_until) > new Date()) return 'free_granted';
      return 'inactive';
    }
    if (u.subscription_type === 'annual') return 'annual';
    if (u.subscription_type === 'monthly') return 'monthly';
    if (u.trial_start_date && Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) < 7) return 'trial';
    return 'free';
  };

  const getInactiveDays = (u) => {
    const lastAccess = u.last_login ? new Date(u.last_login) : new Date(u.created_date);
    return Math.floor((Date.now() - lastAccess.getTime()) / 86400000);
  };

  const isInactive = (u) => getInactiveDays(u) >= 60;

  const subBadge = (u) => {
    const t = getSubType(u);
    const map = {
      annual: 'bg-blue-100 text-blue-700',
      monthly: 'bg-purple-100 text-purple-700',
      trial: 'bg-green-100 text-green-700',
      free_granted: 'bg-amber-100 text-amber-700',
      free: 'bg-slate-100 text-slate-500',
      inactive: 'bg-red-100 text-red-500',
    };
    const label = { annual: 'Anual', monthly: 'Mensal', trial: 'Trial', free_granted: 'Free Concedido', free: 'Free', inactive: 'Expirado' };
    return <Badge className={`text-[10px] ${map[t]}`}>{label[t]}</Badge>;
  };

  // Build enriched users
  const enriched = users.map(u => ({
    ...u,
    _subType: getSubType(u),
    _inactiveDays: getInactiveDays(u),
    _usageCount: usages.filter(us => us.created_by === u.email).length,
  }));

  // Unique cities and states
  const cities = [...new Set(users.map(u => u.city).filter(Boolean))].sort();
  const states = [...new Set(users.map(u => u.state).filter(Boolean))].sort();

  const filtered = enriched.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) || u.cpf?.includes(search);
    const matchSub = filterSub === 'all' || u._subType === filterSub || (filterSub === 'inactive' && isInactive(u));
    const matchCity = !filterCity || u.city?.toLowerCase().includes(filterCity.toLowerCase());
    const matchState = !filterState || u.state === filterState;
    const matchInactivity = filterInactivity === 'all' ||
      (filterInactivity === '60+' && u._inactiveDays >= 60) ||
      (filterInactivity === '30+' && u._inactiveDays >= 30) ||
      (filterInactivity === '7+' && u._inactiveDays >= 7) ||
      (filterInactivity === '0' && u._inactiveDays < 7);
    return matchSearch && matchSub && matchCity && matchState && matchInactivity;
  });

  const handleExport = (format) => {
    if (format === 'csv') {
      exportToCSV(filtered, 'clientes_sou_brasil.csv');
    } else {
      toast.info('Exportação em PDF disponível em breve.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nome, e-mail, CPF, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(s => !s)} className="gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filtros
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => handleExport('csv')}>
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Subscription filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ['all', 'Todos'], ['annual', 'Anual'], ['monthly', 'Mensal'],
          ['trial', 'Trial'], ['free', 'Free'],
          ['inactive', 'Inativos +60d'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilterSub(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterSub === val ? (val === 'inactive' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Filtros Avançados</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Cidade</label>
                <Input list="cities-list" value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Filtrar por cidade..." className="text-xs h-8" />
                <datalist id="cities-list">{cities.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Estado</label>
                <select value={filterState} onChange={e => setFilterState(e.target.value)} className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs">
                  <option value="">Todos</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Inatividade</label>
                <select value={filterInactivity} onChange={e => setFilterInactivity(e.target.value)} className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs">
                  <option value="all">Todos</option>
                  <option value="0">Ativos (menos de 7d)</option>
                  <option value="7+">Inativo 7+ dias</option>
                  <option value="30+">Inativo 30+ dias</option>
                  <option value="60+">Inativo 60+ dias</option>
                </select>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setFilterCity(''); setFilterState(''); setFilterInactivity('all'); }}>
              Limpar filtros avançados
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500">{filtered.length} clientes</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const inactiveDays = u._inactiveDays;
            const inactive = inactiveDays >= 60;
            return (
              <Card key={u.id} className={`border-slate-200 hover:border-slate-300 transition-colors cursor-pointer ${inactive ? 'border-red-100 bg-red-50/20' : ''}`} onClick={() => setSelected(u)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {u.profile_photo ? (
                      <img src={u.profile_photo} alt={u.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-800">{u.full_name || 'Sem nome'}</p>
                        {u.role === 'admin' && <Badge className="text-[10px] bg-red-100 text-red-700">Admin</Badge>}
                        {subBadge(u)}
                        {inactive && <Badge className="text-[10px] bg-red-100 text-red-600">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <div className="flex gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                        <span>{u._usageCount} usos</span>
                        {u.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{u.city}{u.state ? `/${u.state}` : ''}</span>}
                        <span className={`flex items-center gap-0.5 ${inactive ? 'text-red-400 font-medium' : ''}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {inactiveDays === 0 ? 'Ativo hoje' : `${inactiveDays}d inativo`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {['master', 'administrador'].includes(session?.role) && !['annual', 'monthly'].includes(u._subType) && u._subType === 'free' && (
                        <Button variant="ghost" size="sm"
                          className="text-xs text-green-700 hover:bg-green-50 border border-green-300 h-7 px-2"
                          onClick={() => grantTrialMutation.mutate(u)} title="Ativar Trial 7 dias">
                          <Gift className="w-3 h-3 mr-1" /> Trial
                        </Button>
                      )}
                      {['master', 'administrador'].includes(session?.role) && u.role !== 'admin' && (
                        <Button variant="ghost" size="sm"
                          className="text-xs text-red-600 hover:bg-red-50 border border-red-200 h-7 px-2"
                          onClick={() => {
                            if (confirm(`Excluir ${u.full_name || u.email} e todos os seus dados? Esta ação é irreversível.`)) {
                              deleteUserMutation.mutate(u);
                            }
                          }}
                          title="Excluir usuário">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <ClientDetailModal
          user={selected}
          usages={usages}
          onClose={() => setSelected(null)}
          onGrantTrial={(u) => grantTrialMutation.mutate(u)}
          canAdmin={['master', 'administrador'].includes(session?.role)}
        />
      )}
    </div>
  );
}