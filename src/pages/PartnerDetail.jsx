import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, MapPin, Phone, Clock, Percent, Gift,
  Shield, AlertCircle, Star, Heart, Globe, Instagram, Youtube
} from 'lucide-react';
import { getSubscriptionStatus } from '@/lib/subscription';
import ClientVerification from '@/components/partners/ClientVerification';
import PartnerReviews from '@/components/partners/PartnerReviews';
import BenefitConfirmDialog from '@/components/partners/BenefitConfirmDialog';
import BenefitTimer from '@/components/partners/BenefitTimer';
import TrialExpiredModal from '@/components/common/TrialExpiredModal';

const categoryLabels = {
  restaurante: 'Restaurante', loja: 'Loja', servicos: 'Serviços',
  saude: 'Saúde', beleza: 'Beleza', educacao: 'Educação',
  entretenimento: 'Entretenimento', mercado: 'Mercado', oficina: 'Oficina', outro: 'Outro',
};

export default function PartnerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const partnerId = urlParams.get('id');
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usageError, setUsageError] = useState(null);
  const [showTrialExpired, setShowTrialExpired] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: async () => {
      const list = await base44.entities.Partner.filter({ id: partnerId });
      return list[0] || null;
    },
    enabled: !!partnerId,
  });

  const { data: allUsages = [], refetch: refetchUsages } = useQuery({
    queryKey: ['usage-today', partnerId],
    queryFn: async () => {
      const all = await base44.entities.BenefitUsage.filter({ partner_id: partnerId });
      return all.filter((u) => u.created_by === user?.email);
    },
    enabled: !!partnerId && !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.FavoritePartner.list(),
    enabled: !!user,
  });

  const isFavorited = favorites.some((f) => f.partner_id === partnerId);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        const fav = favorites.find((f) => f.partner_id === partnerId);
        await base44.entities.FavoritePartner.delete(fav.id);
      } else {
        await base44.entities.FavoritePartner.create({ partner_id: partnerId, partner_name: partner?.name });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['favorites']),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', partnerId],
    queryFn: () => base44.entities.PartnerReview.filter({ partner_id: partnerId }),
    enabled: !!partnerId,
  });
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const sub = getSubscriptionStatus(user);

  // Check usage cooldown: unlimited partners = 5min cooldown, others = 24h
  const isUnlimited = partner?.unlimited_usage === true;
  const lastUsage = allUsages.sort((a, b) => new Date(b.used_at) - new Date(a.used_at))[0];
  const lastUsedAt = lastUsage?.used_at;
  const msSince = lastUsedAt ? (Date.now() - new Date(lastUsedAt).getTime()) : null;
  const cooldownMs = isUnlimited ? 5 * 60 * 1000 : 12 * 3600 * 1000;
  const canUse = msSince === null || msSince >= cooldownMs;

  // Trial expirado = tem trial_start_date mas sub.active=false e sem plano pago
  const isTrialExpired = !sub.active && !!user?.trial_start_date && !user?.subscription_type;
  // Sem nenhum acesso (sem trial, sem plano): redirecionar para Pricing
  const hasNoAccess = user && !sub.active && !user?.trial_start_date && !user?.subscription_type;

  const handleUseDiscount = () => {
    if (isTrialExpired) {
      setShowTrialExpired(true);
      return;
    }
    if (!sub.active) {
      navigate('/Pricing');
      return;
    }
    if (!canUse) {
      setUsageError('Você já usou este benefício. Aguarde o timer.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmUse = async () => {
    setShowConfirm(false);
    await base44.entities.BenefitUsage.create({
      partner_id: partnerId,
      partner_name: partner.name,
      used_at: new Date().toISOString(),
    });
    await refetchUsages();
    setShowVerification(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Parceiro não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <>
      {showTrialExpired && <TrialExpiredModal onClose={() => setShowTrialExpired(false)} />}
      <AnimatePresence>
        {showVerification && (
          <ClientVerification
            partner={partner}
            partnerName={partner.name}
            onClose={() => setShowVerification(false)}
          />
        )}
      </AnimatePresence>

      {showConfirm && (
        <BenefitConfirmDialog
          partner={partner}
          onConfirm={handleConfirmUse}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="pb-28">
        {/* Image header */}
        <div className="relative h-56 bg-muted">
          {partner.image_url ? (
            <img src={partner.image_url} alt={partner.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Star className="w-16 h-16 text-primary/30" />
            </div>
          )}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => favoriteMutation.mutate()}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
          <div className="absolute bottom-4 right-4">
            <Badge className="bg-accent text-accent-foreground text-lg font-bold px-4 py-2 shadow-lg">
              {partner.discount_type === 'percentual' ? <Percent className="w-4 h-4 mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
              {partner.discount_value}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-5 space-y-4">
          <div>
            <Badge variant="outline" className="mb-2 text-xs">{categoryLabels[partner.category]}</Badge>
            <h1 className="text-2xl font-bold">{partner.name}</h1>
            {avgRating && (
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                ))}
                <span className="text-sm text-muted-foreground ml-1">{avgRating} ({reviews.length} avaliações)</span>
              </div>
            )}
          </div>

          {partner.discount_description && (
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
              <p className="text-sm font-medium text-primary mb-1">Benefício exclusivo</p>
              <p className="text-sm text-foreground">{partner.discount_description}</p>
            </div>
          )}

          {partner.description && (
            <div>
              <h3 className="font-semibold mb-1">Sobre</h3>
              <p className="text-sm text-muted-foreground">{partner.description}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{partner.address}</span>
            </div>
            {partner.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${partner.phone}`} className="text-sm text-primary underline">{partner.phone}</a>
              </div>
            )}
            {partner.opening_hours && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm">{partner.opening_hours}</span>
              </div>
            )}
          </div>

          {/* Social links — only show filled ones */}
          {(partner.instagram || partner.facebook || partner.tiktok || partner.youtube || partner.website) && (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground font-medium">Redes sociais:</p>
              {partner.instagram && (
                <a href={partner.instagram} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Instagram className="w-4 h-4 text-white" />
                </a>
              )}
              {partner.facebook && (
                <a href={partner.facebook} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Globe className="w-4 h-4 text-white" />
                </a>
              )}
              {partner.tiktok && (
                <a href={partner.tiktok} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <span className="text-white text-xs font-black">TK</span>
                </a>
              )}
              {partner.youtube && (
                <a href={partner.youtube} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Youtube className="w-4 h-4 text-white" />
                </a>
              )}
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Globe className="w-4 h-4 text-white" />
                </a>
              )}
            </div>
          )}

          {usageError && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm text-center">
              {usageError}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border pt-4">
            <PartnerReviews partnerId={partnerId} partnerName={partner.name} userEmail={user?.email} />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="space-y-2">
            {sub.active && !canUse && lastUsedAt && (
              <div className="bg-card border border-border rounded-xl px-4 py-2">
                <BenefitTimer usedAt={lastUsedAt} unlimited={isUnlimited} />
              </div>
            )}
            <Button
              onClick={handleUseDiscount}
              className="w-full h-14 text-base font-bold rounded-2xl shadow-xl bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={sub.active && !canUse}
            >
              <Shield className="w-5 h-5 mr-2" />
              {isTrialExpired
                ? 'Assinar para usar o desconto'
                : !sub.active
                ? 'Assinar para usar o desconto'
                : !canUse
                  ? 'Benefício já utilizado'
                  : 'Sou Brasil, Quero Meu Desconto!'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}