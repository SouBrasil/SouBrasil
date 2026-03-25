import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Star, ArrowRight, Crown, Ticket, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getSubscriptionStatus } from '@/lib/subscription';
import PartnerCard from '@/components/partners/PartnerCard';
import PartnerBannerCarousel from '@/components/home/PartnerBannerCarousel';
import ActionCarousel from '@/components/home/ActionCarousel';
import { useMemo } from 'react';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // Start trial if new user
  useEffect(() => {
    if (user && !user.trial_start_date && !user.subscription_type) {
      base44.auth.updateMe({ trial_start_date: new Date().toISOString() }).then((u) => setUser(u));
    }
  }, [user]);

  const sub = getSubscriptionStatus(user);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners-home'],
    queryFn: () => base44.entities.Partner.filter({ active: true }, '-created_date', 100),
  });

  const { data: carouselBanners = [] } = useQuery({
    queryKey: ['carousel-banners-home'],
    queryFn: () => base44.entities.CarouselBanner.filter({ carousel_type: 'home_banner', active: true }, 'display_order', 20),
  });

  const { data: actionButtons = [] } = useQuery({
    queryKey: ['carousel-action-buttons-home'],
    queryFn: () => base44.entities.CarouselBanner.filter({ carousel_type: 'action_button', active: true }, 'display_order', 10),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews-home'],
    queryFn: () => base44.entities.PartnerReview.list('-created_date', 200),
  });

  // Build map of partner_id -> { avg, count }
  const ratingsMap = useMemo(() => {
    const map = {};
    reviews.forEach((r) => {
      if (!map[r.partner_id]) map[r.partner_id] = { sum: 0, count: 0 };
      map[r.partner_id].sum += r.rating;
      map[r.partner_id].count += 1;
    });
    return map;
  }, [reviews]);

  const partnersWithDistance = partners.map((p) => ({
    ...p,
    distance: location ? getDistance(location.lat, location.lng, p.latitude, p.longitude) : null,
  })).sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const nearby = partnersWithDistance.filter((p) => p.distance !== null && p.distance < 10).slice(0, 20);
  // Show all partners when no GPS, or filter by 20km when GPS available
  const featured = location
    ? partnersWithDistance.filter((p) => p.distance !== null && p.distance < 20).slice(0, 12)
    : partnersWithDistance.slice(0, 12);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Olá, {user?.full_name?.split(' ').slice(0, 2).join(' ') || 'Bem-vindo'}!
          </p>
          <h2 className="text-sm font-bold text-foreground whitespace-nowrap">
            {sub.active && !sub.isTrial
              ? 'Seja Bem Vindo 👋'
              : sub.isTrial
              ? `Trial: ${sub.daysLeft} dias restantes`
              : 'Seus benefícios'}
          </h2>
        </div>
        {user?.partner_id && (
          <Link to="/PartnerPortal">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold px-3 py-1.5 cursor-pointer hover:opacity-90 shadow-md">
              🏪 Parceiro Comercial
            </Badge>
          </Link>
        )}
        {!user?.partner_id && (sub.active && !sub.isTrial ? (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs"
            style={sub.isAnnual ? {
              background: 'linear-gradient(135deg, #d4af37, #f0c040, #b8960c)',
              color: '#1a1a00',
              boxShadow: '0 2px 8px rgba(212,175,55,0.5)',
            } : {
              background: 'linear-gradient(135deg, #9ca3af, #e5e7eb, #6b7280)',
              color: '#1a1a1a',
              boxShadow: '0 2px 8px rgba(156,163,175,0.5)',
            }}
          >
            <Crown className="w-3 h-3" />
            {sub.isAnnual ? 'Premium Anual' : 'Premium Mensal'} · {sub.daysLeft}d
          </div>
        ) : sub.isTrial ? (
          <Link to="/Pricing">
            <Badge className="bg-green-600 text-white font-semibold px-3 py-1.5 cursor-pointer hover:bg-green-700 shadow-md">
              <Crown className="w-3 h-3 mr-1" />
              🎁 Trial Ativo · {sub.daysLeft}d restantes
            </Badge>
          </Link>
        ) : (
          <Link to="/Pricing">
            <Badge className="bg-accent text-accent-foreground font-semibold px-3 py-1.5 cursor-pointer hover:bg-accent/90">
              <Crown className="w-3 h-3 mr-1" />
              Assinar
            </Badge>
          </Link>
        ))}
      </div>

      {/* Trial Banner */}
      {sub.isTrial && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-green-800 text-sm">🎉 Seu período Trial está ativo!</p>
            <p className="text-xs text-green-700 mt-0.5">
              Você tem acesso completo a todos os benefícios por mais <strong>{sub.daysLeft} dia{sub.daysLeft !== 1 ? 's' : ''}</strong>.
              {sub.daysLeft <= 3 && ' Assine para não perder o acesso!'}
            </p>
            {sub.daysLeft <= 3 && (
              <Link to="/Pricing" className="inline-block mt-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full transition-colors">
                Assinar agora →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick action chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <Link to="/Pricing"
          className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full font-semibold text-xs text-white"
          style={{ background: 'linear-gradient(135deg, #1a5c2a, #1a7a42)', boxShadow: '0 2px 8px rgba(26,92,42,0.4)' }}
        >
          <Crown className="w-3.5 h-3.5" /> Planos
        </Link>
        <Link to="/ReferralHub"
          className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full font-semibold text-xs text-white"
          style={{ background: 'linear-gradient(135deg, #1a2e6b, #2a3e8b)', boxShadow: '0 2px 8px rgba(26,46,107,0.4)' }}
        >
          <Gift className="w-3.5 h-3.5" /> Indique e Ganhe
        </Link>
        <Link to="/Raffles"
          className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full font-semibold text-xs text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9d5cf0)', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}
        >
          <Ticket className="w-3.5 h-3.5" /> Sorteios
        </Link>
        <Link to="/AffiliateProgram"
          className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full font-semibold text-xs text-white"
          style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 2px 8px rgba(180,83,9,0.4)' }}
        >
          <Star className="w-3.5 h-3.5" /> Afiliados
        </Link>
      </div>

      {/* Action carousel */}
      <ActionCarousel customButtons={actionButtons} />

      {/* Partner banner carousel */}
      <PartnerBannerCarousel partners={featured.slice(0, 5)} customBanners={carouselBanners} />

      {/* Nearby section - horizontal scroll */}
      {nearby.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Perto de você
            </h2>
            <Link to="/Map" className="text-sm text-primary font-medium flex items-center gap-1">
              Ver mapa <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {nearby.map((p) => {
              const r = ratingsMap[p.id];
              return (
                <div key={p.id} className="shrink-0 w-44">
                  <PartnerCard partner={p} distance={p.distance} avgRating={r ? (r.sum / r.count).toFixed(1) : null} reviewCount={r?.count} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            {location ? 'Parceiros próximos a você' : 'Parceiros em Destaque'}
          </h2>
          <Link to="/Partners" className="text-sm text-primary font-medium flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {featured.map((p) => {
            const r = ratingsMap[p.id];
            return <PartnerCard key={p.id} partner={p} distance={p.distance} avgRating={r ? (r.sum / r.count).toFixed(1) : null} reviewCount={r?.count} />;
          })}
        </div>
        {featured.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum parceiro cadastrado ainda.</p>
          </div>
        )}
      </section>
    </div>
  );
}