import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, MapPin, Phone, Clock, Percent, Gift,
  Shield, AlertCircle, Star, Heart
} from 'lucide-react';
import { getSubscriptionStatus } from '@/lib/subscription';
import ClientVerification from '@/components/partners/ClientVerification';
import PartnerReviews from '@/components/partners/PartnerReviews';

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
  const [usageError, setUsageError] = useState(null);
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

  const { data: todayUsages = [] } = useQuery({
    queryKey: ['usage-today', partnerId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const all = await base44.entities.BenefitUsage.filter({ partner_id: partnerId });
      return all.filter((u) => {
        return u.created_by === user?.email && new Date(u.used_at) >= today;
      });
    },
    enabled: !!partnerId && !!user,
  });

  const sub = getSubscriptionStatus(user);
  const usageLimit = partner?.usage_limit || 1;
  const usedToday = todayUsages.length;
  const canUse = usedToday < usageLimit;

  const handleUseDiscount = async () => {
    if (!sub.active) {
      navigate('/Pricing');
      return;
    }
    if (!canUse) {
      setUsageError('Você já usou este benefício hoje. Volte amanhã!');
      return;
    }
    // Record usage
    await base44.entities.BenefitUsage.create({
      partner_id: partnerId,
      partner_name: partner.name,
      used_at: new Date().toISOString(),
    });
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
      <AnimatePresence>
        {showVerification && (
          <ClientVerification
            partnerName={partner.name}
            onClose={() => setShowVerification(false)}
          />
        )}
      </AnimatePresence>

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

          {usageError && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm text-center">
              {usageError}
            </div>
          )}

          {!canUse && sub.active && (
            <p className="text-xs text-center text-muted-foreground">
              Você já usou {usedToday}/{usageLimit} vez(es) hoje.
            </p>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <Button
            onClick={handleUseDiscount}
            className="w-full h-14 text-base font-bold rounded-2xl shadow-xl bg-primary hover:bg-primary/90"
            disabled={sub.active && !canUse}
          >
            <Shield className="w-5 h-5 mr-2" />
            {!sub.active ? 'Assinar para usar o desconto' : 'Eu Sou Cliente Sou Brasil'}
          </Button>
        </div>
      </div>
    </>
  );
}