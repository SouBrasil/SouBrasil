import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Trophy, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RaffleDrawModal({ raffle, participants, onClose, onDrawn }) {
  const [drawing, setDrawing] = useState(false);
  const [winner, setWinner] = useState(null);

  const performDraw = async () => {
    if (participants.length === 0) {
      toast.error('Nenhum participante para sortear!');
      return;
    }
    setDrawing(true);

    // Animate for 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    const idx = Math.floor(Math.random() * participants.length);
    const w = participants[idx];
    setWinner(w);

    // Save winner to raffle
    await base44.entities.Raffle.update(raffle.id, {
      status: 'realizado',
      winner_user_email: w.user_email,
      winner_user_name: w.user_name,
    });

    // Send notification to winner
    await base44.entities.Notification.create({
      title: `🏆 Parabéns! Você ganhou o sorteio!`,
      message: `Você foi o(a) ganhador(a) do sorteio "${raffle.title}"! Prêmio: ${raffle.prize}. ${raffle.redemption_conditions ? 'Condições de resgate: ' + raffle.redemption_conditions : ''}`,
      type: 'benefit',
      target: 'specific',
      target_email: w.user_email,
      sent_at: new Date().toISOString(),
    });

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: w.user_email,
      subject: `🏆 Você ganhou o Sorteio "${raffle.title}" — Clube Sou Brasil!`,
      body: `Parabéns ${w.user_name || ''}!\n\nVocê foi sorteado(a) como ganhador(a) do sorteio "${raffle.title}"!\n\nPrêmio: ${raffle.prize}\n\n${raffle.redemption_conditions ? 'Condições de resgate: ' + raffle.redemption_conditions : ''}\n\nCluibe Sou Brasil — Obrigado por participar!`,
    });

    setDrawing(false);
    toast.success(`Sorteio realizado! Ganhador: ${w.user_name || w.user_email}`);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
        <div className="flex justify-end mb-2">
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-10 h-10 text-white" />
        </div>

        <h2 className="font-black text-xl mb-1">{raffle.title}</h2>
        <p className="text-slate-500 text-sm mb-2">{raffle.prize}</p>
        <p className="text-xs text-slate-400 mb-6">{participants.length} participante(s) elegíveis</p>

        {!winner && !drawing && (
          <Button onClick={performDraw} className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-bold">
            <Play className="w-5 h-5 mr-2" /> Realizar Sorteio!
          </Button>
        )}

        {drawing && (
          <div className="space-y-3">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-500" />
            <p className="font-bold text-slate-700 animate-pulse">Sorteando...</p>
          </div>
        )}

        {winner && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-5">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Ganhador(a)</p>
              <p className="text-xl font-black text-slate-800">{winner.user_name || winner.user_email}</p>
              <p className="text-sm text-slate-500">{winner.user_email}</p>
            </div>
            <p className="text-xs text-green-600">✅ Notificação e e-mail enviados ao ganhador!</p>
            <Button onClick={onDrawn} className="w-full bg-green-600 hover:bg-green-700">Concluir</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Play({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}