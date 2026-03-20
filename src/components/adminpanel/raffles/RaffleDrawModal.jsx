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

    // Send email notification — HTML estilizado baseado no template visual
    const appUrl = window.location.origin;
    await base44.integrations.Core.SendEmail({
      to: w.user_email,
      subject: `🏆 VOCÊ É UM GANHADOR! Sorteio "${raffle.title}" — Clube Sou Brasil!`,
      body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#1a3a0a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#0d2a06,#1a4a0a,#2d6b14);padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#0d2a06,#1a5010);border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);max-width:600px;width:100%;">
  <!-- Header -->
  <tr><td style="padding:28px 24px 16px;text-align:center;background:rgba(0,0,0,0.2);">
    <img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png" alt="Sou Brasil" style="height:56px;width:auto;" />
  </td></tr>
  <!-- Hero -->
  <tr><td style="padding:24px 24px 12px;text-align:center;">
    <div style="font-size:56px;margin-bottom:4px;">🏆🎉</div>
    <h1 style="color:#f0c040;font-size:32px;font-weight:900;margin:0 0 6px;text-shadow:0 2px 12px rgba(240,192,64,0.5);">VOCÊ É UM GANHADOR!</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">Parabéns aos ganhadores do sorteio!</p>
  </td></tr>
  <!-- App promo box -->
  <tr><td style="padding:16px 24px;">
    <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(240,192,64,0.3);border-radius:16px;padding:20px;text-align:center;">
      <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 6px;">Dentro do app</p>
      <p style="color:#f0c040;font-size:20px;font-weight:900;margin:0 0 10px;font-style:italic;">Sou Brasil</p>
      <p style="color:#ffffff;font-size:18px;font-weight:bold;margin:0 0 4px;">Seu prêmio já está disponível!</p>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">🎁 Prêmio: <strong style="color:#f0c040;">${raffle.prize}</strong></p>
      ${raffle.redemption_conditions ? `<p style="color:rgba(255,255,255,0.5);font-size:12px;margin:8px 0 0;">📋 ${raffle.redemption_conditions}</p>` : ''}
    </div>
  </td></tr>
  <!-- Winner name -->
  <tr><td style="padding:8px 24px 16px;text-align:center;">
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 4px;">Ganhador(a)</p>
    <p style="color:#ffffff;font-size:20px;font-weight:900;margin:0;">${w.user_name || w.user_email} 🏆</p>
  </td></tr>
  <!-- CTA Button -->
  <tr><td style="padding:8px 24px 24px;text-align:center;">
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 14px;">Acesse o app e resgate seu prêmio agora mesmo!</p>
    <a href="${appUrl}/Raffles" style="display:inline-block;background:linear-gradient(135deg,#1565C0,#1976D2);color:#ffffff;font-size:16px;font-weight:900;padding:16px 48px;border-radius:50px;text-decoration:none;letter-spacing:1px;box-shadow:0 4px 20px rgba(21,101,192,0.5);">RESGATAR PRÊMIO</a>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:rgba(0,0,0,0.3);padding:16px 24px;text-align:center;">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">Clube de Benefícios Sou Brasil © 2025 — Porque todo brasileiro merece desconto!</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
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