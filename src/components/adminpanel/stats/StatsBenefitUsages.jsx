import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, Filter, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StatsBenefitUsages({ onBack }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('most');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterPartner, setFilterPartner] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: usages = [], isLoading } = useQuery({
    queryKey: ['ap-usages-count'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 2000),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ['ap-partners-list'],
    queryFn: () => base44.entities.Partner.list('-created_date', 500),
  });

  const periodMs = { all: null, '7': 7 * 86400000, '30': 30 * 86400000, '90': 90 * 86400000 };

  const filteredUsages = useMemo(() => {
    const ms = filterPeriod !== 'all' ? periodMs[filterPeriod] : null;
    return usages.filter(u => {
      const inPeriod = !ms || (Date.now() - new Date(u.used_at || u.created_date)) <= ms;
      const matchPartner = !filterPartner || u.partner_id === filterPartner;
      return inPeriod && matchPartner;
    });
  }, [usages, filterPeriod, filterPartner]);

  const usageByPartner = useMemo(() => {
    const map = {};
    filteredUsages.forEach(u => {
      if (!map[u.partner_name]) map[u.partner_name] = { name: u.partner_name, count: 0, partner_id: u.partner_id };
      map[u.partner_name].count++;
    });
    return Object.values(map);
  }, [filteredUsages]);

  const sorted = useMemo(() => {
    const filtered = usageByPartner.filter(p =>
      !search || p.name?.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.sort((a, b) => sortBy === 'most' ? b.count - a.count : a.count - b.count);
  }, [usageByPartner, search, sortBy]);

  const chartData = sorted.slice(0, 10).map(p => ({
    name: p.name?.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
    usos: p.count,
  }));

  const partnerOptions = [...new Set(usages.map(u => ({ id: u.partner_id, name: u.partner_name }))
    .filter(p => p.id)
    .map(p => JSON.stringify(p)))].map(s => JSON.parse(s));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Visão Geral
        </button>
        <h2 className="font-black text-lg text-slate-800">Usos de Benefícios</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-2xl font-black text-slate-800">{filteredUsages.length}</p>
          <p className="text-[10px] text-slate-500">Total de Usos</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-2xl font-black text-green-600">{sorted[0]?.name?.slice(0, 10) || '—'}</p>
          <p className="text-[10px] text-slate-500">Mais utilizado</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-2xl font-black text-red-500">{sorted[sorted.length - 1]?.name?.slice(0, 10) || '—'}</p>
          <p className="text-[10px] text-slate-500">Menos utilizado</p>
        </CardContent></Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-600 mb-3">Top {Math.min(10, chartData.length)} por Usos</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                <Tooltip />
                <Bar dataKey="usos" fill="#22c55e" radius={[0, 4, 4, 0]} name="Usos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar parceiro..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-3.5 h-3.5" /> Filtros
          </Button>
          {[['most', <><TrendingUp className="w-3 h-3" /> Mais usados</>], ['least', <><TrendingDown className="w-3 h-3" /> Menos usados</>]].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {showFilters && (
          <Card className="border-slate-200">
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Período</p>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Parceiro</p>
                <Select value={filterPartner || '__all'} onValueChange={v => setFilterPartner(v === '__all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="max-h-48 overflow-y-auto">
                    <SelectItem value="__all">Todos parceiros</SelectItem>
                    {partnerOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <button onClick={() => { setFilterPeriod('all'); setFilterPartner(''); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">Limpar filtros</button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-slate-500">{sorted.length} parceiros com usos</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <Card key={p.partner_id || p.name} className="border-slate-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-800">{p.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-lg text-green-600">{p.count}</p>
                  <p className="text-[10px] text-slate-400">usos</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}