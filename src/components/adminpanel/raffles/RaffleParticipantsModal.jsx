import { X, Users, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const subBadge = (type) => {
  const map = { premium_anual: 'bg-blue-100 text-blue-700', premium_mensal: 'bg-purple-100 text-purple-700', trial: 'bg-green-100 text-green-700', free: 'bg-slate-100 text-slate-500' };
  return <Badge className={`text-[10px] ${map[type] || 'bg-slate-100 text-slate-500'}`}>{type || 'free'}</Badge>;
};

export default function RaffleParticipantsModal({ raffle, participants, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">{raffle.title}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1"><Users className="w-4 h-4" />{participants.length} participantes</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {participants.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum participante ainda.</p>
            </div>
          ) : (
            participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.user_name || p.user_email}</p>
                  <p className="text-xs text-slate-500">{p.user_email}</p>
                </div>
                {subBadge(p.subscription_type)}
                {raffle.winner_user_email === p.user_email && (
                  <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">🏆 Ganhador</Badge>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">Fechar</Button>
        </div>
      </div>
    </div>
  );
}