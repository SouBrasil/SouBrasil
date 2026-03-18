import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Store, Gift, Star, TrendingUp, UserCheck, AlertCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AdminPanelStats({ session }) {
  const { data: partners = [] } = useQuery({ queryKey: ['ap-partners'], queryFn: () => base44.entities.Partner.list('-created_date', 500) });
  const { data: users = [] } = useQuery({ queryKey: ['ap-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: usages = [] } = useQuery({ queryKey: ['ap-usages'], queryFn: () => base44.entities.BenefitUsage.list('-created_date', 1000) });
  const { data: reviews = [] } = useQuery({ queryKey: ['ap-reviews'], queryFn: () => base44.entities.PartnerReview.list('-created_date', 500) });
  const { data: requests = [] } = useQuery({ queryKey: ['ap-requests'], queryFn: () => base44.entities.PartnerRequest.list('-created_date', 200) });
  const { data: referrals = [] } = useQuery({ queryKey: ['ap-referrals'], queryFn: () => base44.entities.ReferralConversion.list('-created_date', 500) });

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

  const topPartners = Object.entries(
    usages.reduce((acc, u) => { acc[u.partner_name] = (acc[u.partner_name] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name: name?.length > 18 ? name.slice(0, 18) + '…' : name, count }));

  const stats = [
    { label: 'Total de Clientes', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${premiumUsers} premium` },
    { label: 'Parceiros Ativos', value: activePartners, icon: Store, color: 'text-green-600', bg: 'bg-green-50', sub: `de ${partners.length} total` },
    { label: 'Usos de Benefícios', value: usages.length, icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50', sub: 'total acumulado' },
    { label: 'Solicitações Pendentes', value: pendingRequests, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', sub: `de ${requests.length} total` },
    { label: 'Avaliação Média', value: avgRating, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', sub: `${reviews.length} avaliações` },
    { label: 'Indicações', value: referrals.length, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', sub: 'conversões' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs font-semibold text-slate-600 leading-tight">{s.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
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
                <Pie data={subData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent*100).toFixed(0)}%` : ''} labelLine={false} fontSize={10}>
                  {subData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Parceiros (Usos)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topPartners} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} name="Usos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}