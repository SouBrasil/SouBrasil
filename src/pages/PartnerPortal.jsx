import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Store, Users, Gift, BarChart2, UserCheck,
  TrendingUp, LogOut, Link2, Copy, Star,
  Clock, DollarSign, ArrowLeft, Shield, Eye, Zap, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { motion } from 'framer-motion';
import PartnerLoginModal from '@/components/partners/PartnerLoginModal';
import ChangePasswordScreen from '@/components/partners/ChangePasswordScreen';
import PartnerPortalRaffles from '@/components/partnerportal/PartnerPortalRaffles';
import PartnerPortalPushNotifications from '@/components/partnerportal/PartnerPortalPushNotifications';
import PartnerTrialBanner from '@/components/partnerportal/PartnerTrialBanner';
import PartnerPortalReferrals from '@/components/partnerportal/PartnerPortalReferrals';
import PartnerProfileEdit from '@/components/partnerportal/PartnerProfileEdit';
import PartnerPortalCommissions from '@/components/partnerportal/PartnerPortalCommissions';

export default function PartnerPortal() {
  const [user, setUser] = useState(null);
  const [partnerAccess, setPartnerAccess] = useState(null);
  const [partnerRequest, setPartnerRequest] = useState(null);
  const [provisionalRequest, setProvisionalRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30');
  const [showLogin, setShowLogin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const accesses = await base44.entities.PartnerAccess.filter({ email: u.email });
      if (accesses.length > 0) {
        const access = accesses[0];
        setPartnerAccess(access);
        if (access.notes === 'provisional_correction') {
          const reqs = await base44.entities.PartnerRequest.filter({ owner_email: u.email });
          if (reqs.length > 0) setProvisionalRequest(reqs[0]);
        }
      } else {
        const requests = await base44.entities.PartnerRequest.filter({ owner_email: u.email });
        if (requests.length > 0) setPartnerRequest(requests[0]);
        setShowLogin(true);
      }
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
      setShowLogin(true);
    });
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
    queryFn: () => base44.entities.BenefitUsage.filter({ partner_id: partnerId }, '-created_date', 500),
    enabled: !!partnerId,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['portal-referrals', partnerId],
    queryFn: () => base44.entities.ReferralSignup.filter({ partner_id: partnerId }, '-created_date', 200),
    enabled: !!partnerId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['portal-reviews', partnerId],
    queryFn: () => base44.entities.PartnerReview.filter({ partner_id: partnerId }),
    enabled: !!partnerId,
  });

  const periodDays = parseInt(period);

  const filteredUsages = usages.filter(u => {
    const d = new Date(u.used_at || u.created_date);
    return Date.now() - d.getTime() < periodDays * 86400000;
  });

  const todayUsages = usages.filter(u => {
    const d = new Date(u.used_at || u.created_date);
    return d.toDateString() === new Date().toDateString();
  });

  // Calcular comissões do parceiro usando a mesma regra: valor por conversão conforme configuração
  const { data: commissions = [] } = useQuery({
    queryKey: ['partner-commissions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.AffiliateCommission.filter({ referrer_email: user.email });
    },
    enabled: !!user?.email,
  });

  const totalEarnings = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const premiumReferrals = referrals.filter(r => r.converted_to_premium);

  // Build chart data for chosen period
  const chartData = Array.from({ length: Math.min(periodDays, 30) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (Math.min(periodDays, 30) - 1 - i));
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const count = usages.filter(u => {
      const ud = new Date(u.used_at || u.created_date);
      return ud.toDateString() === d.toDateString();
    }).length;
    return { label, count };
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—';

  const referralLink = partnerAccess
    ? `${window.location.origin}/PartnerSignup?ref=${partnerAccess.referral_link || partnerAccess.partner_id}&type=partner`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Link copiado!', description: 'Compartilhe com seus clientes.' });
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: 'Clube Sou Brasil', url: referralLink });
    } else {
      copyLink();
    }
  };

  // --- PROVISIONAL CORRECTION SCREEN ---
  if (partnerAccess && provisionalRequest !== undefined && partnerAccess.notes === 'provisional_correction') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #6b2400, #c45000)' }}>
        <img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png"
          alt="Sou Brasil" className="h-16 w-auto mb-6 drop-shadow-xl" />
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h2 className="text-xl font-black text-center mb-2">Cadastro em Revisão</h2>
          <p className="text-sm text-muted-foreground text-center mb-5">
            Sua solicitação foi devolvida para correção. Revise os dados abaixo e reenvie para análise.
          </p>
          {provisionalRequest && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <p><strong>Comércio:</strong> {provisionalRequest.business_name}</p>
              <p><strong>E-mail:</strong> {provisionalRequest.owner_email}</p>
              <p><strong>Status:</strong> <span className="text-orange-600 font-bold">Aguardando correção</span></p>
              {provisionalRequest.notes && (
                <p className="text-xs text-slate-500 bg-white rounded p-2 border">{provisionalRequest.notes}</p>
              )}
            </div>
          )}
          <div className="space-y-3">
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 font-bold"
              onClick={() => navigate('/BecomePartner')}
            >
              ✏️ Editar e Reenviar Cadastro
            </Button>
            <Button variant="outline" className="w-full" onClick={() => base44.auth.logout('/')}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  // --- MUST CHANGE PASSWORD ---
  if (partnerAccess?.must_change_password) {
    return (
      <ChangePasswordScreen
        partnerAccess={partnerAccess}
        onPasswordChanged={(updated) => setPartnerAccess(updated)}
      />
    );
  }

  // --- LOADING ---
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // --- PENDING REQUEST ---
  if (partnerRequest && partnerRequest.status === 'pendente' && !partnerAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-5">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black mb-3">Cadastro em Análise</h2>
          <p className="text-muted-foreground mb-6">
            Sua solicitação para ser parceiro Sou Brasil está sendo analisada pela nossa equipe. Em breve você receberá uma resposta!
          </p>
          <Badge className="mb-6 text-sm px-4 py-2" variant="outline">📋 Status: Em análise</Badge>
          <br />
          <Button variant="outline" onClick={() => navigate('/Home')} className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o App
          </Button>
        </div>
      </div>
    );
  }

  // --- LOGIN MODAL ---
  if (showLogin && !partnerAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #0d3320, #145a32)' }}>
        <img
          src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png"
          alt="Sou Brasil" className="h-20 w-auto mb-8 drop-shadow-xl" />
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-base">Portal do Parceiro</h2>
              <p className="text-xs text-muted-foreground">Acesso exclusivo para parceiros</p>
            </div>
          </div>
          <PartnerLoginModal
            onSuccess={(access) => { setPartnerAccess(access); setShowLogin(false); }}
            onBecomePartner={() => navigate('/BecomePartner')}
            onBack={() => navigate('/Home')}
          />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart2, emoji: '📊' },
    { id: 'plans', label: 'Planos', icon: Zap, emoji: '💎' },
    { id: 'usages', label: 'Vouchers', icon: Gift, emoji: '🎁' },
    { id: 'commissions', label: 'Comissões', icon: TrendingUp, emoji: '💰' },
    { id: 'referrals', label: 'Indicações', icon: UserCheck, emoji: '🤝' },
    { id: 'reviews', label: 'Avaliações', icon: Star, emoji: '⭐' },
    { id: 'raffles', label: 'Sorteios', icon: Gift, emoji: '🎰' },
    { id: 'push', label: 'Notif. Push', icon: Store, emoji: '🔔' },
    { id: 'profile', label: 'Meu Perfil', icon: Eye, emoji: '👤' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ background: 'linear-gradient(135deg, #145a32, #1a7a42)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {partner.image_url ? (
              <img src={partner.image_url} alt={partner.name} className="w-10 h-10 rounded-xl object-cover border-2 border-white/30" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Portal do Parceiro</p>
              <p className="font-bold text-sm text-white line-clamp-1">{partner.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="text-white hover:bg-white/10 text-xs gap-1"
              onClick={() => navigate('/Home')}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cliente
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => base44.auth.logout('/')}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs - 3D circular style with horizontal scroll */}
      <div className="sticky top-[57px] z-40 overflow-x-auto" style={{ background: 'linear-gradient(135deg, #0d3320, #145a32)' }}>
        <div className="flex gap-4 px-4 py-3" style={{ width: 'max-content', minWidth: '100%' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 transition-all"
                style={{ minWidth: 64 }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all"
                  style={isActive ? {
                    background: 'linear-gradient(145deg, #f0c040, #d4af37)',
                    boxShadow: '0 6px 16px rgba(212,175,55,0.6), 0 2px 6px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.4)',
                    transform: 'translateY(-2px) scale(1.08)',
                  } : {
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  {tab.emoji}
                </div>
                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: isActive ? '#f0c040' : 'rgba(255,255,255,0.7)' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">

        {/* Trial/Premium Banner — ONLY on overview tab */}
         {activeTab === 'overview' && (
           <>
             <PartnerTrialBanner
               partnerAccess={partnerAccess}
               partner={partner}
               onGoToPricing={() => navigate('/PricingPartner')}
             />
             {/* Quick button to view plans */}
             {partner && !partner.subscription_type && (
               <Button 
                 onClick={() => navigate('/PricingPartner')}
                 className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold gap-2 h-12 text-base"
               >
                 <Zap className="w-5 h-5" /> Ver Planos de Parceiro
               </Button>
             )}
           </>
         )}

        {/* Period filter */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Período de análise:</p>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[['7','Últimos 7 dias'],['15','Últimos 15 dias'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['180','Últimos 180 dias'],['365','Últimos 365 dias']].map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Vouchers Hoje', value: todayUsages.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Gift },
                { label: `Vouchers (${period}d)`, value: filteredUsages.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp },
                { label: 'Cadastros via Link', value: referrals.length, color: 'text-purple-600', bg: 'bg-purple-50', icon: Users },
                { label: 'Comissões Ganhas', value: `R$${totalEarnings.toFixed(2)}`, color: 'text-amber-600', bg: 'bg-amber-50', icon: DollarSign },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                          <Icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vouchers Utilizados — Últimos {Math.min(periodDays, 30)} dias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.floor(chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#145a32" radius={[4, 4, 0, 0]} name="Usos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rating card */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-700">{avgRating}</p>
                  <p className="text-xs text-amber-600">{reviews.length} avaliações de clientes</p>
                </div>
              </CardContent>
            </Card>

            {/* Referral link — ÚNICO */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <p className="font-bold text-sm">🔗 Link de Indicação</p>
                </div>
                <p className="text-xs text-muted-foreground">Compartilhe este link com qualquer pessoa e ganhe comissões quando ela contratar um plano</p>
                <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono break-all text-muted-foreground">
                  {referralLink}
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyLink} className="flex-1 gap-2" variant="outline" size="sm">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </Button>
                  <Button onClick={shareLink} className="flex-1 gap-2 bg-green-600 hover:bg-green-700" size="sm">
                    <Share2 className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Commission summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Sistema de Comissão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadastros gratuitos via link:</span>
                  <span className="font-bold">{referrals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadastros convertidos (pagos):</span>
                  <span className="font-bold text-emerald-600">{premiumReferrals.length}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold">Total ganho (comissão por conversão):</span>
                  <span className="font-black text-emerald-600 text-base">R${totalEarnings.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">* Comissão conforme configuração do sistema de afiliação.</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* PLANS TAB */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white text-center">
              <div className="text-3xl mb-2">💎</div>
              <h2 className="text-xl font-black mb-1">Planos para Parceiros</h2>
              <p className="text-white/80 text-sm">Escolha o melhor plano para seu negócio e aproveite todos os benefícios do Clube Sou Brasil.</p>
            </div>
            <Button
              onClick={() => navigate('/PricingPartner')}
              className="w-full h-14 text-base font-black bg-primary hover:bg-primary/90 gap-2"
            >
              <Zap className="w-5 h-5" /> Ver Planos e Assinar
            </Button>
          </div>
        )}

        {/* USAGES TAB */}
        {activeTab === 'usages' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Benefícios Utilizados</p>
              <Badge variant="outline">{usages.length} total</Badge>
            </div>
            {usages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
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

        {/* COMMISSIONS TAB */}
        {activeTab === 'commissions' && (
          <PartnerPortalCommissions partner={partner} partnerAccess={partnerAccess} />
        )}

        {/* REFERRALS TAB */}
        {activeTab === 'referrals' && (
          <PartnerPortalReferrals partner={partner} partnerAccess={partnerAccess} />
        )}

        {/* RAFFLES TAB */}
        {activeTab === 'raffles' && (
          <PartnerPortalRaffles partner={partner} partnerAccess={partnerAccess} />
        )}

        {/* PUSH TAB */}
        {activeTab === 'push' && (
          <PartnerPortalPushNotifications partner={partner} partnerAccess={partnerAccess} />
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <PartnerProfileEdit partner={partner} partnerId={partnerId} />
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Avaliações dos Clientes</p>
              <Badge variant="outline">⭐ {avgRating} · {reviews.length}</Badge>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
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