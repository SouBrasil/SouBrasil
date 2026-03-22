import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, TrendingUp, Users, DollarSign, Store, User, X, Wifi } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPanelReferrals() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReferrer, setFilterReferrer] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const qc = useQueryClient();

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['ap-referral-commissions'],
    queryFn: () => base44.entities.AffiliateCommission.list('-created_date', 1000),
    staleTime: 0,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['ap-ref-users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    staleTime: 30000,
  });

  // Tempo real
  useEffect(() => {
    const unsub = base44.entities.AffiliateCommission.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['ap-referral-commissions'] });
      setLastUpdate(new Date());
    });
    return () => unsub();
  }, [qc]);

  // ── Stats ──
  const total = commissions.length;
  const paidList = commissions.filter(c => ['confirmada', 'transferida'].includes(c.status));
  const paid = paidList.length;
  const viaClientes = commissions.filter(c => c.user_type === 'cliente').length;
  const viaParceiros = commissions.filter(c => c.user_type === 'parceiro').length;
  const totalComissionado = paidList.reduce((s, c) => s + (c.commission_value || 0), 0);

  // ── Ranking por indicador ──
  const byReferrer = {};
  commissions.forEach(c => {
    const k = c.referrer_email;
    if (!byReferrer[k]) byReferrer[k] = { email: k, name: c.referrer_name, count: 0, paid: 0, total: 0 };
    byReferrer[k].count++;
    if (['confirmada', 'transferida'].includes(c.status)) {
      byReferrer[k].paid++;
      byReferrer[k].total += c.commission_value || 0;
    }
  });
  const referrerList = Object.values(byReferrer).sort((a, b) => b.count - a.count);

  // ── Filtro ──
  const filtered = commissions.filter(c => {
    const matchSearch = !search ||
      c.referrer_email?.toLowerCase().includes(search.toLowerCase()) ||
      c.referred_email?.toLowerCase().includes(search.toLowerCase()) ||
      c.referrer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.referred_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || c.user_type === filterType;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchReferrer = !filterReferrer || c.referrer_email === filterReferrer;
    return matchSearch && matchType && matchStatus && matchReferrer;
  });

  const getUserInfo = (email) => users.find(u => u.email === email);

  const STATUS_COLOR = {
    pendente:    'bg-yellow-100 text-yellow-700',
    confirmada:  'bg-green-100 text-green-700',
    transferida: 'bg-blue-100 text-blue-700',
    falha:       'bg-red-100 text-red-700',
  };
  const STATUS_LABEL = {
    pendente: 'Pendente', confirmada: 'Confirmada', transferida: 'Transferida', falha: 'Falha',
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total de Indicações',     value: total,                          color: 'text-blue-600',   bg: 'bg-blue-50',   icon: TrendingUp },
          { label: 'Convertidas (Pagas)',      value: paid,                           color: 'text-green-600',  bg: 'bg-green-50',  icon: Users },
          { label: 'Via Clientes',             value: viaClientes,                    color: 'text-purple-600', bg: 'bg-purple-50', icon: User },
          { label: 'Via Parceiros',            value: viaParceiros,                   color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Store },
          { label: 'Total Comissionado',       value: `R$ ${totalComissionado.toFixed(2)}`, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: DollarSign },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ranking */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" /> Ranking de Indicadores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {referrerList.length === 0 ? (
                  <p className="text-center py-8 text-sm text-slate-400">Nenhuma indicação ainda.</p>
                ) : referrerList.map((r, i) => {
                  const u = getUserInfo(r.email);
                  return (
                    <button key={r.email}
                      onClick={() => setFilterReferrer(filterReferrer === r.email ? '' : r.email)}
                      className={`w-full flex items-center gap-3 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left ${filterReferrer === r.email ? 'bg-green-50' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{u?.full_name || r.name || r.email}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-green-700">{r.count} ind.</p>
                        <p className="text-[10px] text-emerald-600">R$ {r.total.toFixed(2)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de comissões */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[['all','Todos'],['cliente','Clientes'],['parceiro','Parceiros']].map(([v,l]) => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterType === v ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {l}
                </button>
              ))}
              {[['all','Todos'],['pendente','Pendente'],['confirmada','Confirmada'],['transferida','Transferida']].map(([v,l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterStatus === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {l}
                </button>
              ))}
              {filterReferrer && (
                <button onClick={() => setFilterReferrer('')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-yellow-100 text-yellow-700">
                  <X className="w-3 h-3" /> Limpar filtro
                </button>
              )}
            </div>
          </div>

          {filterReferrer && (() => {
            const u = getUserInfo(filterReferrer);
            return (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs font-bold text-green-700">Filtrando: {u?.full_name || filterReferrer}</p>
                {u && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1 text-xs text-slate-600">
                    <span>Tel: {u.phone || '—'}</span>
                    <span>Cidade: {u.city || '—'}</span>
                    <span>CPF: {u.cpf || '—'}</span>
                    <span>Cadastro: {new Date(u.created_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{filtered.length} indicações</p>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1">
              <Wifi className="w-3 h-3 text-green-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-green-700 font-medium">
                Tempo real {lastUpdate ? `· ${lastUpdate.toLocaleTimeString('pt-BR')}` : '· aguardando'}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma indicação encontrada.</p>
              </div>
            ) : filtered.map(c => {
              const referrer = getUserInfo(c.referrer_email);
              const referred = getUserInfo(c.referred_email);
              return (
                <Card key={c.id} className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.user_type === 'parceiro' ? 'bg-amber-50' : 'bg-purple-50'}`}>
                        {c.user_type === 'parceiro'
                          ? <Store className="w-4 h-4 text-amber-600" />
                          : <User className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold truncate max-w-[120px]">{referrer?.full_name || c.referrer_name || c.referrer_email}</p>
                          <span className="text-slate-300 text-xs">→</span>
                          <p className="text-xs text-slate-600 truncate max-w-[120px]">{referred?.full_name || c.referred_name || c.referred_email}</p>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400">{new Date(c.created_date).toLocaleDateString('pt-BR')}</p>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{c.user_type}</Badge>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{c.plan_type === 'annual' ? 'Anual' : 'Mensal'}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={`text-[10px] ${STATUS_COLOR[c.status] || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </Badge>
                        {c.commission_value > 0 && (
                          <p className="text-xs font-bold text-emerald-700">R$ {c.commission_value.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}