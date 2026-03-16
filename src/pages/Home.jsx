import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Star, ArrowRight, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSubscriptionStatus } from '@/lib/subscription';
import PartnerCard from '@/components/partners/PartnerCard';
import PartnerBannerCarousel from '@/components/home/PartnerBannerCarousel';

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

  const partnersWithDistance = partners.map((p) => ({
    ...p,
    distance: location ? getDistance(location.lat, location.lng, p.latitude, p.longitude) : null,
  })).sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const nearby = partnersWithDistance.filter((p) => p.distance !== null && p.distance < 10);
  const featured = partnersWithDistance.slice(0, 6);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Partner banner carousel */}
      <PartnerBannerCarousel partners={featured.slice(0, 5)} />

      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/10 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative">
          <p className="text-sm text-white/80">Olá, {user?.full_name?.split(' ')[0] || 'Bem-vindo'}!</p>
          <h1 className="text-2xl font-bold mt-1">Sou Brasil</h1>
          <p className="text-sm text-white/70 mt-2">Descontos exclusivos nos melhores comércios da sua região</p>
          
          {sub.active ? (
            <Badge className="mt-4 bg-accent text-accent-foreground font-semibold">
              <Crown className="w-3 h-3 mr-1" />
              {sub.isTrial ? `Trial · ${sub.daysLeft} dias restantes` : `Premium · ${sub.daysLeft} dias`}
            </Badge>
          ) : (
            <Link to="/Pricing">
              <Button size="sm" className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                <Crown className="w-4 h-4 mr-1" />
                Assinar agora
              </Button>
            </Link>
          )}
        </div>
      </div>

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
            {nearby.slice(0, 4).map((p) => (
              <PartnerCard key={p.id} partner={p} distance={p.distance} />
            ))}
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
          {featured.map((p) => (
            <PartnerCard key={p.id} partner={p} distance={p.distance} />
          ))}
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