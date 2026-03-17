import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Crown, Gift, Trophy, Lock, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { getSubscriptionStatus } from '@/lib/subscription';

const mockRaffles = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max',
    description: 'Sorteio especial de aniversário do Sou Brasil. Todos os membros Premium participam automaticamente.',
    prize: 'iPhone 15 Pro Max 256GB',
    draw_date: '2025-03-31',
    participants: 847,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
    status: 'active',
  },
  {
    id: '2',
    title: 'Viagem para o Nordeste',
    description: 'Pacote completo para 2 pessoas: passagem, hotel 4 estrelas e passeios.',
    prize: 'Pacote para 2 pessoas – Fortaleza/CE',
    draw_date: '2025-04-15',
    participants: 1203,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    status: 'active',
  },
  {
    id: '3',
    title: 'Vale Compras R$500',
    description: 'Vale compras para usar em qualquer parceiro Sou Brasil da sua cidade.',
    prize: 'Vale Compras R$500',
    draw_date: '2025-02-28',
    participants: 2341,
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    status: 'finished',
    winner: 'J*** S***',
  },
];

export default function Raffles() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const sub = getSubscriptionStatus(user);
  const isPremium = sub.active && !sub.isTrial;

  const active = mockRaffles.filter((r) => r.status === 'active');
  const finished = mockRaffles.filter((r) => r.status === 'finished');

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h1 className="text-xl font-bold">Sorteios</h1>
      </div>

      {!isPremium && (
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-yellow-800 text-sm">Apenas membros Premium</p>
              <p className="text-xs text-yellow-700 mt-0.5">Assine o plano Premium para participar dos sorteios exclusivos.</p>
            </div>
            <Link to="/Pricing">
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white shrink-0">
                Assinar
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isPremium && (
        <Card className="bg-gradient-to-r from-primary to-accent text-white">
          <CardContent className="p-5 flex items-center gap-3">
            <Crown className="w-8 h-8 shrink-0" />
            <div>
              <p className="font-bold">Você está participando!</p>
              <p className="text-sm text-white/80">Seu nome está na lista de todos os sorteios ativos.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="font-bold text-base mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Sorteios Ativos
        </h2>
        <div className="space-y-4">
          {active.map((raffle) => (
            <Card key={raffle.id} className="overflow-hidden rounded-2xl shadow-sm">
              <div className="relative h-36">
                <img src={raffle.image} alt={raffle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Badge className="absolute top-3 right-3 bg-green-500 text-white">Ativo</Badge>
                <h3 className="absolute bottom-3 left-3 text-white font-bold text-lg">{raffle.title}</h3>
              </div>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">{raffle.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Sorteio: {new Date(raffle.draw_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{raffle.participants.toLocaleString()} participantes</span>
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                  <p className="text-xs font-medium text-primary">Prêmio</p>
                  <p className="text-sm font-bold">{raffle.prize}</p>
                </div>
                {!isPremium && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl p-3">
                    <Lock className="w-4 h-4 shrink-0" />
                    Assine o Premium para participar automaticamente
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-3 text-muted-foreground">Sorteios Encerrados</h2>
          <div className="space-y-3">
            {finished.map((raffle) => (
              <Card key={raffle.id} className="overflow-hidden rounded-2xl opacity-70">
                <CardContent className="p-4 flex items-center gap-4">
                  <img src={raffle.image} alt={raffle.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{raffle.title}</p>
                    <p className="text-xs text-muted-foreground">{raffle.prize}</p>
                    {raffle.winner && (
                      <p className="text-xs text-primary font-medium mt-1">🏆 Ganhador: {raffle.winner}</p>
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