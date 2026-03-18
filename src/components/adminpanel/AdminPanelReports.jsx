import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, TrendingUp, Users, Store, Gift, Star, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AdminPanelReports({ session }) {
  const [period, setPeriod] = useState('30');

  const { data: usages = [] } = useQuery({ queryKey: ['ap-rpt-usages'], queryFn: () => base44.entities.BenefitUsage.list('-created_date', 2000) });
  const { data: users = [] } = useQuery({ queryKey: ['ap-rpt-users'], queryFn: () => base44.entities.User.list('-created_date', 1000) });
  const { data: partners = [] } = useQuery({ queryKey: ['ap-rpt-partners'], queryFn: () => base44.entities.Partner.list('-created_date', 500) });
  const { data: reviews = [] } = useQuery({ queryKey: ['ap-rpt-reviews'], queryFn: () => base44.entities.PartnerReview.list('-created_date', 1000) });
  const { data: referrals = [] } = useQuery({ queryKey: ['ap-rpt-referrals'], queryFn: () => base44.entities.ReferralConversion.list('-created_date', 500) });

  const days = parseInt(period);

  const periodData = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return {
      label,
      usos: usages.filter(u => new Date(u.used_at || u.created_date).toDateString() === d.toDateString()).length,
      cadastros: users.filter(u => new Date(u.created_date).toDateString() === d.toDateString()).length,
      parceiros: partners.filter(p => new Date(p.created_date).toDateString() === d.toDateString()).length,
    };
  });

  const interval = days <= 7 ? 0 : days <= 30 ? 4 : 6;

  // Category usage report
  const catUsage = {};
  usages.forEach(u => {
    const p = partners.find(p => p.id === u.partner_id);
    if (p) catUsage[p.category] = (catUsage[p.category] || 0) + 1;
  });
  const catData = Object.entries(catUsage).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  // User acquisition
  const totalUsages = usages.length;
  const periodUsages = usages.filter(u => {
    const d = new Date(u.used_at || u.created_date);
    return (Date.now() - d) <= days * 86400000;
  }).length;

  const periodUsers = users.filter(u => (Date.now() - new Date(u.created_date)) <= days * 86400000).length;
  const premiumUsers = users.filter(u => u.subscription_type === 'monthly' || u.subscription_type === 'annual').length;
  const conversionRate = users.length > 0 ? ((premiumUsers / users.length) * 100).toFixed(1) : 0;

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Período:</span>
        {[['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias']].map(([val, label]) => (
          <button key={val} onClick={() => setPeriod(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `Usos (${period}d)`, value: periodUsages, icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: `Novos Clientes (${period}d)`, value: periodUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Taxa Conversão Premium', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avaliação Média', value: reviews.length ? (reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1) : '—', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity chart */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Atividade no Período</CardTitle>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => exportCSV(periodData, `relatorio-atividade-${period}d.csv`)}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={interval} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="usos" stroke="#22c55e" strokeWidth={2} dot={false} name="Usos" />
              <Line type="monotone" dataKey="cadastros" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cadastros" />
              <Line type="monotone" dataKey="parceiros" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Novos Parceiros" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category usage */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Usos por Categoria de Parceiro</CardTitle>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => exportCSV(catData, 'usos-por-categoria.csv')}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} name="Usos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Export buttons */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Exportar Dados</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { label: 'Clientes (CSV)', fn: () => exportCSV(users.map(u => ({ nome: u.full_name, email: u.email, telefone: u.phone || '', plano: u.subscription_type || 'free', cadastro: new Date(u.created_date).toLocaleDateString('pt-BR') })), 'clientes.csv') },
            { label: 'Parceiros (CSV)', fn: () => exportCSV(partners.map(p => ({ nome: p.name, categoria: p.category, endereco: p.address, desconto: p.discount_value, ativo: p.active ? 'Sim' : 'Não' })), 'parceiros.csv') },
            { label: 'Usos de Benefícios (CSV)', fn: () => exportCSV(usages.map(u => ({ parceiro: u.partner_name, data: new Date(u.used_at || u.created_date).toLocaleString('pt-BR'), usuario: u.created_by })), 'usos-beneficios.csv') },
            { label: 'Avaliações (CSV)', fn: () => exportCSV(reviews.map(r => ({ parceiro: r.partner_name, nota: r.rating, comentario: r.comment || '', avaliador: r.reviewer_name || '', data: new Date(r.created_date).toLocaleDateString('pt-BR') })), 'avaliacoes.csv') },
            { label: 'Indicações (CSV)', fn: () => exportCSV(referrals.map(r => ({ quem_indicou: r.referrer_email, indicado: r.referred_email, status: r.status, ganhos: r.earnings, data: new Date(r.converted_at || r.created_date).toLocaleDateString('pt-BR') })), 'indicacoes.csv') },
          ].map(btn => (
            <Button key={btn.label} variant="outline" size="sm" className="gap-2 text-xs" onClick={btn.fn}>
              <Download className="w-3 h-3" /> {btn.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}