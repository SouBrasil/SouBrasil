import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Store, Users, Gift, BarChart2, QrCode, Link2, UserCheck,
  Calendar, TrendingUp, LogOut, Shield, Copy, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function PartnerPortal() {
  const [user, setUser] = useState(null);
  const [partnerAccess, setPartnerAccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Find partner access record
      const accesses = await base44.entities.PartnerAccess.filter({ email: u.email });
      if (accesses.length === 0) {
        navigate('/Home');
        return;
      }
      setPartnerAccess(accesses[0]);
    }).catch(() => navigate('/Home'));
  }, []);

  const partnerId = partnerAccess?.partner_id;

  const { data: partner } = useQuery({
    queryKey: ['portal-partner', partnerId],
    queryFn: async () => {
      const list = await base44.entities.Partner.filter({ id: partnerId });
      return list[0] || null;
    },
    enabled: !!partnerId,
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['portal-usages', partnerId],
    queryFn: () => base44.entities.BenefitUsage.filter({ partner_id: partnerId }, '-created_date', 200),
    enabled: !!partnerId,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['portal-referrals', partnerId],
    queryFn: () => base44.entities.ReferralSignup.filter({ partner_id: partnerId }, '-created_date', 100),
    enabled: !!partnerId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['portal-reviews', partnerId],
    queryFn: () => base44.entities.PartnerReview.filter({ partner_id: partnerId }),
    enabled: !!partnerId,
  });

  const todayUsages = usages.filter((u) => {
    const d = new Date(u.used_at || u.created_date);
    return d.toDateString() === new Date().toDateString();
  });

  const weekUsages = usages.filter((u) => {
    const d = new Date(u.used_at || u.created_date);
    return Date.now() - d.getTime() < 7 * 86400000;
  });

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

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  const referralLink = partnerAccess
    ? `${window.location.origin}/OnboardingRegister?ref=${partnerAccess.referral_link || partnerAccess.partner_id}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Link copiado!', description: 'Compartilhe com seus clientes.' });
  };

  if (!partnerAccess || !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
    { id: 'usages', label: 'Vouchers', icon: Gift },
    { id: 'referrals', label: 'Cadastros', icon: UserCheck },
    { id: 'reviews', label: 'Avaliações', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {partner.image_url ? (
              <img src={partner.image_url} alt={partner.name} className="w-10 h-10 rounded-xl object-cover border-2 border-white/30" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-xs text-white/70">Portal do Parceiro</p>
              <p className="font-bold text-sm line-clamp-1">{partner.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => base44.auth.logout('/')} className="text-white hover:bg-white/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border overflow-x-auto sticky top-[65px] z-40">
        <div className="max-w-2xl mx-auto flex gap-1 px-4 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Usos Hoje', value: todayUsages.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Usos na Semana', value: weekUsages.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Total de Usos', value: usages.length, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Cadastros via Link', value: referrals.length, color: 'text-orange-600', bg: 'bg-orange-50' },
              ].map((s) => (
                <Card key={s.label} className="border-border">
                  <CardContent className="p-4">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Usos nos Últimos 7 Dias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
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

            {/* Referral link */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">Seu Link de Indicação</p>
                </div>
                <p className="text-xs text-muted-foreground">Compartilhe este link com seus clientes para que eles se cadastrem no Clube Sou Brasil.</p>
                <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono break-all text-muted-foreground">
                  {referralLink}
                </div>
                <Button onClick={copyLink} className="w-full gap-2" variant="outline">
                  <Copy className="w-4 h-4" /> Copiar Link
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'usages' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Vouchers / Benefícios Utilizados</p>
              <Badge variant="outline">{usages.length} total</Badge>
            </div>
            {usages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum benefício utilizado ainda.</p>
              </div>
            ) : (
              usages.map((u) => (
                <Card key={u.id} className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.created_by || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(u.used_at || u.created_date).toLocaleString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Usado</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Cadastros via Seu Link</p>
              <Badge variant="outline">{referrals.length} total</Badge>
            </div>
            {referrals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum cadastro via seu link ainda.</p>
                <p className="text-xs mt-1">Compartilhe seu link de indicação!</p>
              </div>
            ) : (
              referrals.map((r) => (
                <Card key={r.id} className="border-border">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.user_name || r.user_email || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.signed_up_at || r.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {r.converted_to_premium ? (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Premium</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Cadastrado</Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Avaliações do Parceiro</p>
              <Badge variant="outline">⭐ {avgRating} · {reviews.length} avaliações</Badge>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma avaliação ainda.</p>
              </div>
            ) : (
              reviews.map((r) => (
                <Card key={r.id} className="border-border">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{r.reviewer_name || 'Anônimo'}</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}