import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, TrendingUp, Users, DollarSign, Store, User, ChevronDown, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPanelReferrals({ session }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReferrer, setFilterReferrer] = useState('');
  const [selectedReferrer, setSelectedReferrer] = useState(null);

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['ap-referral-conversions'],
    queryFn: () => base44.entities.ReferralConversion.list('-created_date', 1000),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['ap-referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date', 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['ap-ref-users'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  // Stats
  const totalConversions = conversions.length;
  const paidConversions = conversions.filter(c => c.status === 'pago').length;
  const clientReferrals = conversions.filter(c => c.referral_type === 'cliente');
  const partnerReferrals = conversions.filter(c => c.referral_type === 'parceiro');
  const COMMISSION = { cliente: 5, parceiro: 20 };
  const totalEarnings = conversions.filter(c => c.status === 'pago').reduce((s, c) => s + (c.earnings || COMMISSION[c.referral_type] || 5), 0);

  // Group by referrer
  const byReferrer = {};
  conversions.forEach(c => {
    const k = c.referrer_email;
    if (!byReferrer[k]) byReferrer[k] = { email: k, count: 0, paid: 0, earnings: 0, type: c.referral_type, conversions: [] };
    byReferrer[k].count++;
    if (c.status === 'pago') { byReferrer[k].paid++; byReferrer[k].earnings += c.earnings || COMMISSION[c.referral_type] || 5; }
    byReferrer[k].conversions.push(c);
  });
  const referrerList = Object.values(byReferrer).sort((a, b) => b.count - a.count);

  const filteredConversions = conversions.filter(c => {
    const matchSearch = !search || c.referrer_email?.includes(search) || c.referred_email?.includes(search);
    const matchType = filterType === 'all' || c.referral_type === filterType;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchReferrer = !filterReferrer || c.referrer_email === filterReferrer;
    return matchSearch && matchType && matchStatus && matchReferrer;
  });

  const getUserInfo = (email) => users.find(u => u.email === email);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total de Indicações', value: totalConversions, color: 'text-blue-600', bg: 'bg-blue-50', icon: TrendingUp },
          { label: 'Convertidas (Pagas)', value: paidConversions, color: 'text-green-600', bg: 'bg-green-50', icon: Users },
          { label: 'Via Clientes', value: clientReferrals.length, color: 'text-purple-600', bg: 'bg-purple-50', icon: User },
          { label: 'Via Parceiros', value: partnerReferrals.length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Store },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Referrers ranking */}
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
                    <button key={r.email} onClick={() => setFilterReferrer(filterReferrer === r.email ? '' : r.email)}
                      className={`w-full flex items-center gap-3 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left ${filterReferrer === r.email ? 'bg-green-50' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{u?.full_name || r.email}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-green-700">{r.count} indica.</p>
                        <p className="text-[10px] text-slate-400">{r.paid} pagas</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversions list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-2">
              {[['all','Todos'],['cliente','Clientes'],['parceiro','Parceiros']].map(([v,l]) => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterType === v ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {l}
                </button>
              ))}
              {[['all','Todos'],['pendente','Pendente'],['pago','Pago']].map(([v,l]) => (
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

          {filterReferrer && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-bold text-green-700">Filtrando por indicador: {filterReferrer}</p>
              {(() => {
                const u = getUserInfo(filterReferrer);
                if (!u) return null;
                return (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>Nome: {u.full_name}</span>
                    <span>Telefone: {u.phone || '—'}</span>
                    <span>CPF: {u.cpf || '—'}</span>
                    <span>Cidade: {u.city || '—'}</span>
                    <span>Cadastro: {new Date(u.created_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                );
              })()}
            </div>
          )}

          <p className="text-xs text-slate-500">{filteredConversions.length} indicações</p>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredConversions.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma indicação encontrada.</p>
              </div>
            ) : filteredConversions.map(c => {
              const referrer = getUserInfo(c.referrer_email);
              const referred = getUserInfo(c.referred_email);
              return (
                <Card key={c.id} className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.referral_type === 'parceiro' ? 'bg-amber-50' : 'bg-purple-50'}`}>
                        {c.referral_type === 'parceiro' ? <Store className="w-4 h-4 text-amber-600" /> : <User className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold truncate">{referrer?.full_name || c.referrer_email}</p>
                          <span className="text-slate-300">→</span>
                          <p className="text-xs text-slate-600 truncate">{referred?.full_name || c.referred_email}</p>
                        </div>
                        <p className="text-[10px] text-slate-400">{new Date(c.created_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={`text-[10px] ${c.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {c.status === 'pago' ? `R$${c.earnings || COMMISSION[c.referral_type] || 5}` : 'Pendente'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{c.referral_type}</Badge>
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