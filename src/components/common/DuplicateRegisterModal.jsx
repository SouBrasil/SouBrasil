import { useState } from 'react';
import { AlertTriangle, MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Modal exibido quando CPF ou CNPJ já estão cadastrados
export default function DuplicateRegisterModal({ type, value, name, email, onClose }) {
  const [showMsgForm, setShowMsgForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const fieldLabel = type === 'cpf' ? 'CPF' : 'CNPJ';

  const handleSendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await base44.entities.ContactMessage.create({
        sender_name: name || 'Não informado',
        sender_email: email || 'Não informado',
        subject: `Cadastro duplicado — ${fieldLabel}`,
        message: msg,
        type: 'cadastro_duplicado',
        extra_info: `${fieldLabel}: ${value}`,
        status: 'nova',
      });
      toast.success('Mensagem enviada para a administração!');
      setMsg('');
      setShowMsgForm(false);
      onClose?.();
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-amber-500 p-5 relative text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-black text-white">Cadastro já existente</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-center text-slate-700 text-sm leading-relaxed">
            O <strong>{fieldLabel}</strong> informado já se encontra cadastrado na plataforma Sou Brasil.
          </p>
          <p className="text-center text-slate-500 text-xs">
            Se você acredita que isso é um erro, entre em contato com a administração.
          </p>

          {!showMsgForm ? (
            <div className="space-y-3">
              <Button
                onClick={() => setShowMsgForm(true)}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 font-bold rounded-2xl"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Entrar em contato com a Sou Brasil
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full h-11 rounded-2xl"
              >
                OK, entendido
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Descreva seu problema:</p>
              <Textarea
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Ex: Esse CPF é meu, preciso recuperar meu acesso..."
                rows={4}
                className="rounded-xl"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowMsgForm(false)} className="flex-1 rounded-xl">
                  Voltar
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !msg.trim()}
                  className="flex-1 rounded-xl bg-primary"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" />Enviar</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}