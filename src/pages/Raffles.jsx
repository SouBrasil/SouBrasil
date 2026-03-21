import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, Gift, Trophy, Lock, Calendar, Users, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { getSubscriptionStatus } from '@/lib/subscription';
import { toast } from 'sonner';
import TrialExpiredModal from '@/components/common/TrialExpiredModal';

export default function Raffles() {
  const [user, setUser] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const [showTrialExpired, setShowTrialExpired] = useState(false);

  const sub = getSubscriptionStatus(user);
  const isPremium = sub.active && !sub.isTrial;
  const isTrial = sub.isTrial;
  const isMonthly = user?.subscription_type === 'monthly' && isPremium;
  const isAnnual = user?.subscription_type === 'annual' && isPremium;

  // Trial expirado = tem trial_start_date mas sub.active=false e sem plano pago
  const isTrialExpired = !sub.active && !isPremium && !!user?.trial_start_date && !user?.subscription_type;

  // Max participations based on plan
  const getMaxParticipations = () => {
    if (isAnnual) return Infinity;
    if (isMonthly) return 10;
    if (isTrial) return 1;
    return 0;
  };
  const maxParticipations = getMaxParticipations();

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['raffles-public'],
    queryFn: () => base44.entities.Raffle.filter({ status: 'ativo' }, 'display_order', 50),
  });

  const { data: completedRaffles = [] } = useQuery({
    queryKey: ['raffles-completed'],
    queryFn: () => base44.entities.Raffle.filter({ status: 'realizado' }, '-draw_date', 10),
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['my-participations', user?.email],
    queryFn: () => base44.entities.RaffleParticipant.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const handleParticipateClick = (raffle) => {
    if (isTrialExpired) {
      setShowTrialExpired(true);
      return;
    }
    participateMutation.mutate(raffle);
  };

  const participateMutation = useMutation({
    mutationFn: async (raffle) => {
      await base44.entities.RaffleParticipant.create({
        raffle_id: raffle.id,
        raffle_title: raffle.title,
        user_email: user.email,
        user_name: user.full_name,
        subscription_type: user.subscription_type || (isTrial ? 'trial' : 'free'),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-participations']);
      toast.success('Você está participando! Boa sorte! 🍀');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (raffle) => {
      const p = myParticipations.find(mp => mp.raffle_id === raffle.id);
      if (p) await base44.entities.RaffleParticipant.delete(p.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-participations']);
      toast.info('Você saiu do sorteio.');
    },
  });

  const isParticipating = (raffleId) => myParticipations.some(p => p.raffle_id === raffleId);

  const canParticipate = (raffle) => {
    if (!user) return false;
    if (maxParticipations === 0) return false;
    if (isParticipating(raffle.id)) return true;
    if (myParticipations.length >= maxParticipations) return false;
    // Check audience
    const aud = raffle.target_audience;
    if (aud === 'todos') return true;
    if (aud === 'premium' && isPremium) return true;
    if (aud === 'premium_anual' && isAnnual) return true;
    if (aud === 'premium_mensal' && isMonthly) return true;
    if (aud === 'trial' && isTrial) return true;
    return false;
  };

  const sortedRaffles = [...raffles].sort((a, b) => {
    if (a.display_order !== b.display_order) return (a.display_order || 0) - (b.display_order || 0);
    return new Date(a.draw_date) - new Date(b.draw_date);
  });

  const planLabel = () => {
    if (isAnnual) return { label: 'Premium Anual', info: 'Participe de todos os sorteios!' };
    if (isMonthly) return { label: 'Premium Mensal', info: `Até ${maxParticipations} sorteios por mês` };
    if (isTrial) return { label: 'Trial', info: '1 sorteio disponível' };
    return null;
  };
  const plan = planLabel();

  return (
    <div className="px-4 py-6 space-y-6">
      {showTrialExpired && <TrialExpiredModal onClose={() => setShowTrialExpired(false)} />}
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h1 className="text-xl font-bold">Sorteios</h1>
      </div>

      {!user || (!isPremium && !isTrial) ? (
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-yellow-800 text-sm">Sorteios exclusivos Sou Brasil</p>
              <p className="text-xs text-yellow-700 mt-0.5">Assine o plano Premium para participar dos sorteios exclusivos.</p>
            </div>
            <Link to="/Pricing">
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white shrink-0">Assinar</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-primary to-accent text-white">
          <CardContent className="p-5 flex items-center gap-3">
            <Crown className="w-8 h-8 shrink-0" />
            <div>
              <p className="font-bold">{plan?.label}</p>
              <p className="text-sm text-white/80">{plan?.info}</p>
              <p className="text-xs text-white/60 mt-0.5">Participando em: {myParticipations.length} sorteio(s)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <section>
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Sorteios Ativos
          </h2>
          {sortedRaffles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum sorteio ativo no momento.</p>
              <p className="text-xs mt-1">Fique atento às novidades!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRaffles.map((raffle) => {
                const participating = isParticipating(raffle.id);
                const eligible = canParticipate(raffle);
                const daysLeft = Math.ceil((new Date(raffle.draw_date) - Date.now()) / 86400000);

                return (
                  <Card key={raffle.id} className="overflow-hidden rounded-2xl shadow-sm">
                    <div className="relative h-36">
                      {raffle.image_url ? (
                        <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                          <Trophy className="w-12 h-12 text-white opacity-60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className={`absolute top-3 right-3 ${participating ? 'bg-green-500' : 'bg-primary'} text-white`}>
                        {participating ? '✓ Inscrito' : 'Ativo'}
                      </Badge>
                      <h3 className="absolute bottom-3 left-3 text-white font-bold text-lg">{raffle.title}</h3>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      {raffle.description && <p className="text-sm text-muted-foreground">{raffle.description}</p>}
                      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(raffle.draw_date).toLocaleDateString('pt-BR')}</span>
                          {daysLeft > 0 && <span className="text-xs text-primary">({daysLeft}d)</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{myParticipations.filter(p => p.raffle_id === raffle.id).length > 0 ? 'Você está participando' : 'Sem participação'}</span>
                        </div>
                      </div>
                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                        <p className="text-xs font-medium text-primary">Prêmio</p>
                        <p className="text-sm font-bold">{raffle.prize}</p>
                      </div>
                      {raffle.redemption_conditions && (
                        <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
                          📋 {raffle.redemption_conditions}
                        </p>
                      )}
                      {!eligible && !participating && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-3">
                          <Lock className="w-4 h-4 shrink-0" />
                          {maxParticipations === 0
                            ? 'Assine o Premium para participar'
                            : `Limite de ${maxParticipations} sorteio(s) atingido para seu plano`}
                        </div>
                      )}
                      {(eligible || participating) && (
                        <Button
                          className={`w-full rounded-xl ${participating ? 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600' : 'bg-primary text-white'}`}
                          onClick={() => participating ? withdrawMutation.mutate(raffle) : handleParticipateClick(raffle)}
                          disabled={participateMutation.isPending || withdrawMutation.isPending}
                        >
                          {participating ? (
                            <><CheckCircle2 className="w-4 h-4 mr-2" />Participando — Clique para sair</>
                          ) : (
                            <><Gift className="w-4 h-4 mr-2" />Quero Participar!</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {completedRaffles.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-3 text-muted-foreground">Sorteios Encerrados</h2>
          <div className="space-y-3">
            {completedRaffles.map((raffle) => (
              <Card key={raffle.id} className="overflow-hidden rounded-2xl opacity-70">
                <CardContent className="p-4 flex items-center gap-4">
                  {raffle.image_url ? (
                    <img src={raffle.image_url} alt={raffle.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{raffle.title}</p>
                    <p className="text-xs text-muted-foreground">{raffle.prize}</p>
                    {raffle.winner_user_name && (
                      <p className="text-xs text-primary font-medium mt-1">🏆 Ganhador(a): {raffle.winner_user_name}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">Encerrado</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}