import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Store, Gift, TrendingUp, Star, DollarSign, UserCheck, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminStats() {
  const { data: partners = [] } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => base44.entities.Partner.list('-created_date', 200),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['admin-usages'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 500),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => base44.entities.PartnerReview.list('-created_date', 500),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['admin-notifs'],
    queryFn: () => base44.entities.UserNotification.list('-created_date', 200),
  });

  const activePartners = partners.filter((p) => p.active).length;

  // Usages per day (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    const count = usages.filter((u) => {
      const ud = new Date(u.used_at || u.created_date);
      return ud.toDateString() === d.toDateString();
    }).length;
    return { label, count };
  });

  // Category distribution
  const catMap = {};
  partners.forEach((p) => {
    catMap[p.category] = (catMap[p.category] || 0) + 1;
  });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const categoryLabels = {
    restaurante: 'Restaurantes', loja: 'Lojas', servicos: 'Serviços',
    saude: 'Saúde', beleza: 'Beleza', educacao: 'Educação',
    entretenimento: 'Entretenimento', mercado: 'Mercado', oficina: 'Oficinas',
  };

  // Top partners by usage
  const partnerUsageMap = {};
  usages.forEach((u) => {
    partnerUsageMap[u.partner_name] = (partnerUsageMap[u.partner_name] || 0) + 1;
  });
  const topPartners = Object.entries(partnerUsageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name: name?.length > 15 ? name.slice(0, 15) + '…' : name, count }));

  const stats = [
    { label: 'Parceiros Ativos', value: activePartners, icon: Store, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total de Usos', value: usages.length, icon: Gift, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avaliações', value: reviews.length, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Notificações Enviadas', value: notifications.length, icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Usos nos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Usos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Parceiros por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => `${(categoryLabels[name] || name).slice(0,8)} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [val, categoryLabels[name] || name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top 5 Parceiros Mais Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topPartners} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Usos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}