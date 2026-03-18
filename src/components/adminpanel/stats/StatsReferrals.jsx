import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, Users, Store, User, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function StatsReferrals({ onBack }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['ap-rpt-referrals'],
    queryFn: () => base44.entities.ReferralConversion.list('-created_date', 1000),
  });
  const { data: referrals = [] } = useQuery({
    queryKey: ['ap-referrals-base'],
    queryFn: () => base44.entities.Referral.list('-created_date', 500),
  });
  const { data: partnerAccess = [] } = useQuery({
    queryKey: ['ap-partner-access'],
    queryFn: () => base44.entities.PartnerAccess.list('-created_date', 500),
  });

  // Agrupar conversões por quem indicou
  const byReferrer = useMemo(() => {
    const map = {};
    conversions.forEach(c => {
      if (!map[c.referrer_email]) {
        map[c.referrer_email] = { email: c.referrer_email, type: c.referral_type, total: 0, premium: 0, pending: 0, paid: 0, list: [] };
      }
      map[c.referrer_email].total++;
      if (c.status === 'pendente') map[c.referrer_email].pending++;
      if (c.status === 'pago') map[c.referrer_email].paid++;
      if (c.status !== 'cancelado') map[c.referrer_email].premium++;
      map[c.referrer_email].list.push(c);
    });
    return Object.values(map);
  }, [conversions]);

  const totalConversions = conversions.length;
  const premiumConversions = conversions.filter(c => c.status === 'pago').length;
  const partnerReferrals = conversions.filter(c => c.referral_type === 'parceiro').length;
  const clientReferrals = conversions.filter(c => c.referral_type === 'cliente').length;

  const filtered = byReferrer.filter(r => {
    const matchSearch = !search || r.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || r.type === filterType;
    return matchSearch && matchType;
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Visão Geral
        </button>
        <h2 className="font-black text-lg text-slate-800">Indicações</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-slate-200"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-teal-600" /></div>
          </div>
          <p className="text-2xl font-black text-slate-800">{totalConversions}</p>
          <p className="text-xs text-slate-500">Total de indicações</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-green-600" /></div>
          </div>
          <p className="text-2xl font-black text-green-600">{premiumConversions}</p>
          <p className="text-xs text-slate-500">Viraram premium</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center"><Store className="w-3.5 h-3.5 text-purple-600" /></div>
          </div>
          <p className="text-2xl font-black text-purple-600">{partnerReferrals}</p>
          <p className="text-xs text-slate-500">Origem: Parceiro</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><User className="w-3.5 h-3.5 text-blue-600" /></div>
          </div>
          <p className="text-2xl font-black text-blue-600">{clientReferrals}</p>
          <p className="text-xs text-slate-500">Origem: Cliente</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {[['all', 'Todos'], ['parceiro', 'Parceiros'], ['cliente', 'Clientes']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterType(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterType === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} indicadores</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => {
            const isOpen = expanded === r.email;
            return (
              <Card key={r.email} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'parceiro' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                      {r.type === 'parceiro' ? <Store className="w-4 h-4 text-purple-600" /> : <User className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-800 truncate">{r.email}</p>
                        <Badge className={`text-[10px] ${r.type === 'parceiro' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.type === 'parceiro' ? 'Parceiro' : 'Cliente'}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-0.5 text-[10px] text-slate-400">
                        <span>{r.total} indicações</span>
                        <span className="text-green-600 font-medium">{r.paid} viraram premium</span>
                        {r.pending > 0 && <span className="text-orange-500">{r.pending} pendentes</span>}
                      </div>
                    </div>
                    <button onClick={() => setExpanded(isOpen ? null : r.email)} className="text-slate-400 hover:text-slate-600 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-bold text-slate-600">Indicações individuais</p>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {r.list.map((c, ci) => (
                          <div key={ci} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-xs text-slate-700">{c.referred_email}</p>
                              <p className="text-[10px] text-slate-400">{new Date(c.converted_at || c.created_date).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <Badge className={`text-[10px] ${c.status === 'pago' ? 'bg-green-100 text-green-700' : c.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {c.status === 'pago' ? 'Premium' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}