import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Store, Gift, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

import StatsClients from './stats/StatsClients';
import StatsActivePartners from './stats/StatsActivePartners';
import StatsBenefitUsages from './stats/StatsBenefitUsages';
import StatsPendingRequests from './stats/StatsPendingRequests';
import StatsRatings from './stats/StatsRatings';
import StatsReferrals from './stats/StatsReferrals';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AdminPanelStats({ session }) {
  const [activeDrill, setActiveDrill] = useState(null);

  const { data: partners = [] } = useQuery({ queryKey: ['ap-partners'], queryFn: () => base44.entities.Partner.list('-created_date', 500) });
  const { data: users = [] } = useQuery({ queryKey: ['ap-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: usages = [] } = useQuery({ queryKey: ['ap-usages'], queryFn: () => base44.entities.BenefitUsage.list('-created_date', 1000) });
  const { data: reviews = [] } = useQuery({ queryKey: ['ap-reviews'], queryFn: () => base44.entities.PartnerReview.list('-created_date', 500) });
  const { data: requests = [] } = useQuery({ queryKey: ['ap-requests'], queryFn: () => base44.entities.PartnerRequest.list('-created_date', 200) });
  const { data: referrals = [] } = useQuery({ queryKey: ['ap-referrals'], queryFn: () => base44.entities.ReferralConversion.list('-created_date', 500) });

  // Drill-down screens
  if (activeDrill === 'clients') return <StatsClients onBack={() => setActiveDrill(null)} />;
  if (activeDrill === 'partners') return <StatsActivePartners onBack={() => setActiveDrill(null)} session={session} />;
  if (activeDrill === 'usages') return <StatsBenefitUsages onBack={() => setActiveDrill(null)} />;
  if (activeDrill === 'requests') return <StatsPendingRequests onBack={() => setActiveDrill(null)} session={session} />;
  if (activeDrill === 'ratings') return <StatsRatings onBack={() => setActiveDrill(null)} />;
  if (activeDrill === 'referrals') return <StatsReferrals onBack={() => setActiveDrill(null)} />;

  const activePartners = partners.filter(p => p.active).length;
  const premiumUsers = users.filter(u => u.subscription_type === 'monthly' || u.subscription_type === 'annual').length;
  const pendingRequests = requests.filter(r => r.status === 'pendente').length;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—';

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return {
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      usos: usages.filter(u => new Date(u.used_at || u.created_date).toDateString() === d.toDateString()).length,
      cadastros: users.filter(u => new Date(u.created_date).toDateString() === d.toDateString()).length,
    };
  });

  const subData = [
    { name: 'Mensal', value: users.filter(u => u.subscription_type === 'monthly').length },
    { name: 'Anual', value: users.filter(u => u.subscription_type === 'annual').length },
    { name: 'Trial', value: users.filter(u => u.trial_start_date && Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) < 7).length },
    { name: 'Free', value: users.filter(u => !u.subscription_type && (!u.trial_start_date || Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) >= 7)).length },
  ];

  // Top 20 parceiros por usos
  const topPartners = Object.entries(
    usages.reduce((acc, u) => { acc[u.partner_name] = (acc[u.partner_name] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({
    name: name?.length > 18 ? name.slice(0, 18) + '…' : name,
    count
  }));

  const stats = [
    { key: 'clients', label: 'Total de Clientes', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${premiumUsers} premium` },
    { key: 'partners', label: 'Parceiros Ativos', value: activePartners, icon: Store, color: 'text-green-600', bg: 'bg-green-50', sub: `de ${partners.length} total` },
    { key: 'usages', label: 'Usos de Benefícios', value: usages.length, icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50', sub: 'total acumulado' },
    { key: 'requests', label: 'Solicitações Pendentes', value: pendingRequests, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', sub: `de ${requests.length} total` },
    { key: 'ratings', label: 'Avaliação Média', value: avgRating, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', sub: `${reviews.length} avaliações` },
    { key: 'referrals', label: 'Indicações', value: referrals.length, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', sub: 'conversões' },
  ];

  return (
    <div className="space-y-6">
      {/* Clickable stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}
              className="border-slate-200 cursor-pointer hover:border-green-400 hover:shadow-md transition-all group"
              onClick={() => setActiveDrill(s.key)}>
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs font-semibold text-slate-600 leading-tight">{s.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                <p className="text-[10px] text-green-600 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalhes →</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Atividade nos Últimos 30 Dias</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={4} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="usos" stroke="#22c55e" strokeWidth={2} dot={false} name="Usos" />
                <Line type="monotone" dataKey="cadastros" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cadastros" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Assinaturas por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={subData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false} fontSize={10}>
                  {subData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 20 partners */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Parceiros (Usos) — Top 20</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="max-h-80 overflow-y-auto px-4 space-y-1.5 pt-2">
              {topPartners.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-0.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${topPartners[0]?.count ? (p.count / topPartners[0].count) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 shrink-0">{p.count}</span>
                </div>
              ))}
              {topPartners.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nenhum uso registrado ainda</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}