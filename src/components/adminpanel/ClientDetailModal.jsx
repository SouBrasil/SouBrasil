import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  X, User, Crown, Phone, Mail, MapPin, Calendar, CreditCard,
  History, Send, MessageSquare, Loader2, CheckCircle2, Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClientDetailModal({ user, usages, onClose, onGrantTrial, canAdmin }) {
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);

  const userUsages = usages.filter(u => u.created_by === user.email);

  const getSubType = (u) => {
    if (u.subscription_type === 'annual') return 'Anual';
    if (u.subscription_type === 'monthly') return 'Mensal';
    if (u.trial_start_date && Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) < 7) return 'Trial';
    return 'Free';
  };

  const subColor = (u) => {
    const t = getSubType(u);
    if (t === 'Anual') return 'bg-blue-100 text-blue-700';
    if (t === 'Mensal') return 'bg-purple-100 text-purple-700';
    if (t === 'Trial') return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-500';
  };

  const handleSendMessage = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }
    setSending(true);
    try {
      // Cria notificação no banco para o usuário
      await base44.entities.Notification.create({
        title: msgTitle,
        message: msgBody,
        type: 'info',
        target: 'specific',
        target_email: user.email,
        read: false,
        sent_at: new Date().toISOString(),
      });

      // Envia e-mail como notificação push
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `📬 ${msgTitle} — Sou Brasil`,
        body: `Olá, ${user.full_name || 'cliente'}!\n\n${msgBody}\n\nAtenciosamente,\nEquipe Sou Brasil`,
      });

      toast.success('Mensagem enviada com sucesso!');
      setMsgTitle('');
      setMsgBody('');
      setShowMessageForm(false);
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-base text-slate-800">Dados do Cliente</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-4">
            {user.profile_photo ? (
              <img src={user.profile_photo} alt={user.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-8 h-8 text-slate-400" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg text-slate-800">{user.full_name || 'Sem nome'}</h3>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge className={`text-[10px] ${subColor(user)}`}>{getSubType(user)}</Badge>
                {user.role === 'admin' && <Badge className="text-[10px] bg-red-100 text-red-700">Admin</Badge>}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={<Calendar className="w-3.5 h-3.5" />} label="CADASTRO" value={new Date(user.created_date).toLocaleDateString('pt-BR')} />
            <InfoBox icon={<CreditCard className="w-3.5 h-3.5" />} label="PLANO" value={getSubType(user)} />
            <InfoBox icon={<History className="w-3.5 h-3.5" />} label="USOS TOTAIS" value={userUsages.length} />
            {user.phone && <InfoBox icon={<Phone className="w-3.5 h-3.5" />} label="TELEFONE" value={user.phone} />}
            {user.cpf && <InfoBox icon={<Shield className="w-3.5 h-3.5" />} label="CPF" value={user.cpf} />}
            {user.birth_date && <InfoBox icon={<Calendar className="w-3.5 h-3.5" />} label="NASCIMENTO" value={new Date(user.birth_date).toLocaleDateString('pt-BR')} />}
            {user.city && <InfoBox icon={<MapPin className="w-3.5 h-3.5" />} label="CIDADE" value={`${user.city}${user.state ? ` - ${user.state}` : ''}`} />}
            {user.gender && <InfoBox icon={<User className="w-3.5 h-3.5" />} label="GÊNERO" value={user.gender} />}
          </div>

          {/* Subscription dates */}
          {(user.subscription_start_date || user.trial_start_date) && (
            <div className="grid grid-cols-2 gap-3">
              {user.trial_start_date && (
                <InfoBox icon={<Calendar className="w-3.5 h-3.5" />} label="INÍCIO TRIAL" value={new Date(user.trial_start_date).toLocaleDateString('pt-BR')} />
              )}
              {user.subscription_start_date && (
                <InfoBox icon={<Crown className="w-3.5 h-3.5" />} label="ASSINATURA DESDE" value={new Date(user.subscription_start_date).toLocaleDateString('pt-BR')} />
              )}
              {user.subscription_end_date && (
                <InfoBox icon={<Calendar className="w-3.5 h-3.5" />} label="EXPIRA EM" value={new Date(user.subscription_end_date).toLocaleDateString('pt-BR')} />
              )}
            </div>
          )}

          {/* Usage History */}
          {userUsages.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Histórico de Usos ({userUsages.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-slate-100 p-2">
                {userUsages.map((us, i) => (
                  <div key={i} className="text-xs text-slate-600 flex justify-between py-1 px-2 rounded-lg bg-green-50">
                    <span className="font-medium">{us.partner_name || 'Parceiro'}</span>
                    <span className="text-slate-400">{new Date(us.used_at || us.created_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send Message */}
          {!showMessageForm ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90 rounded-xl"
              onClick={() => setShowMessageForm(true)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Enviar Mensagem ao Usuário
            </Button>
          ) : (
            <div className="space-y-3 border border-primary/20 rounded-xl p-4 bg-primary/5">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Nova Mensagem
              </p>
              <Input
                placeholder="Título da mensagem"
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
              />
              <Textarea
                placeholder="Escreva sua mensagem aqui..."
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowMessageForm(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 rounded-xl" onClick={handleSendMessage} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Enviar</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-1 text-slate-400 mb-1">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-700">{value || '—'}</p>
    </div>
  );
}