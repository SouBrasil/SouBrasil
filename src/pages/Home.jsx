import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Star, ArrowRight, Crown } from 'lucide-react';
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
    queryFn: () => base44.entities.Partner.filter({ active: true }, '-created_date', 20),
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

  const nearby = partnersWithDistance.filter((p) => p.distance !== null && p.distance < 10);
  const featured = partnersWithDistance.slice(0, 6);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Olá, {user?.full_name?.split(' ').slice(0, 2).join(' ') || 'Bem-vindo'}!
          </p>
          <h2 className="text-lg font-bold text-foreground">
            {sub.active && !sub.isTrial
              ? 'Seja Bem Vindo 👋'
              : sub.isTrial
              ? `Trial: ${sub.daysLeft} dias restantes`
              : 'Seus benefícios'}
          </h2>
        </div>
        {sub.active && !sub.isTrial ? (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #f0c040, #b8960c)',
              color: '#1a1a00',
              boxShadow: '0 2px 8px rgba(212,175,55,0.5)',
            }}
          >
            <Crown className="w-3 h-3" />
            Usuário Premium · {sub.daysLeft}d
          </div>
        ) : sub.isTrial ? (
          <Link to="/Pricing">
            <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1.5 cursor-pointer hover:bg-primary/90">
              <Crown className="w-3 h-3 mr-1" />
              {sub.daysLeft}d Trial · Assinar
            </Badge>
          </Link>
        ) : (
          <Link to="/Pricing">
            <Badge className="bg-accent text-accent-foreground font-semibold px-3 py-1.5 cursor-pointer hover:bg-accent/90">
              <Crown className="w-3 h-3 mr-1" />
              Assinar
            </Badge>
          </Link>
        )}
      </div>

      {/* Action carousel */}
      <ActionCarousel />

      {/* Partner banner carousel */}
      <PartnerBannerCarousel partners={featured.slice(0, 5)} />

      {/* Nearby section */}
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
          <div className="grid grid-cols-2 gap-3">
            {nearby.slice(0, 4).map((p) => {
              const r = ratingsMap[p.id];
              return <PartnerCard key={p.id} partner={p} distance={p.distance} avgRating={r ? (r.sum / r.count).toFixed(1) : null} reviewCount={r?.count} />;
            })}
          </div>
        </section>
      )}

      {/* Featured */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            Parceiros em destaque
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