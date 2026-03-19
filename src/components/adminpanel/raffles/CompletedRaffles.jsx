import { Trophy, Users, Calendar, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function CompletedRaffles({ raffles, participants }) {
  const getParticipants = (id) => participants.filter(p => p.raffle_id === id);

  if (raffles.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum sorteio realizado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{raffles.length} sorteios realizados</p>
      {raffles.map(raffle => {
        const ps = getParticipants(raffle.id);
        return (
          <Card key={raffle.id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {raffle.image_url ? (
                  <img src={raffle.image_url} alt={raffle.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-800">{raffle.title}</p>
                    <Badge className="text-[10px] bg-blue-100 text-blue-700">Realizado</Badge>
                  </div>
                  <p className="text-sm text-slate-600">🏆 Prêmio: {raffle.prize}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ps.length} participantes</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                      {new Date(raffle.draw_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {raffle.winner_user_name && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-yellow-800">Ganhador(a)</p>
                        <p className="text-sm font-semibold">{raffle.winner_user_name}</p>
                        <p className="text-xs text-slate-500">{raffle.winner_user_email}</p>
                      </div>
                    </div>
                  )}
                  {raffle.redemption_conditions && (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                      <span className="font-medium">Condições de resgate:</span> {raffle.redemption_conditions}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}