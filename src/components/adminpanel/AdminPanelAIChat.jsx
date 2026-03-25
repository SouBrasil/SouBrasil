import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bot, User, Send, ChevronLeft, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminPanelAIChat({ session, userType = 'usuario' }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['ai-conversations', userType],
    queryFn: () => base44.entities.AIConversation.filter({ user_type: userType, status: 'transferido' }, '-created_date', 100),
    refetchInterval: 15000,
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !selected) return;
      const adminMsg = {
        role: 'admin',
        content: reply.trim(),
        sent_by: session.name,
        sent_at: new Date().toISOString(),
      };
      const existing = selected.admin_replies || [];
      await base44.entities.AIConversation.update(selected.id, {
        admin_replies: [...existing, adminMsg],
        unread_admin: false,
        status: 'encerrado',
      });
      setSelected(prev => ({ ...prev, admin_replies: [...existing, adminMsg], status: 'encerrado' }));
      setReply('');
    },
    onSuccess: () => qc.invalidateQueries(['ai-conversations', userType]),
  });

  const markRead = async (conv) => {
    if (conv.unread_admin) {
      await base44.entities.AIConversation.update(conv.id, { unread_admin: false });
      qc.invalidateQueries(['ai-conversations', userType]);
    }
    setSelected(conv);
  };

  const unreadCount = conversations.filter(c => c.unread_admin).length;

  const title = userType === 'parceiro' ? 'Chat IA — Parceiros' : 'Chat IA — Usuários';

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar para lista
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Conversation header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{selected.user_name || selected.user_email}</p>
                <p className="text-xs text-slate-500">{selected.user_email}</p>
                {selected.partner_name && <p className="text-xs text-primary font-medium">🏪 {selected.partner_name}</p>}
              </div>
              <div className="text-right">
                <Badge variant={selected.status === 'encerrado' ? 'outline' : 'default'} className="text-[10px]">
                  {selected.status === 'encerrado' ? '✅ Respondido' : '⏳ Aguardando'}
                </Badge>
                <p className="text-xs text-slate-400 mt-1">{new Date(selected.transferred_at || selected.created_date).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            {selected.summary && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-800 mb-1">📋 Resumo da IA:</p>
                <p className="text-xs text-blue-700">{selected.summary}</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {(selected.messages || []).map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' :
                  msg.role === 'admin' ? 'bg-green-600 text-white rounded-tl-sm' :
                  'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  {msg.role === 'admin' && <p className="text-[10px] text-green-200 mb-1">👤 {msg.sent_by}</p>}
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
            {(selected.admin_replies || []).map((msg, i) => (
              <div key={`admin-${i}`} className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-green-700" />
                </div>
                <div className="max-w-[75%] bg-green-600 text-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap">
                  <p className="text-[10px] text-green-200 mb-1">👤 {msg.sent_by}</p>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          <div className="px-4 py-4 border-t border-slate-100">
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Digite sua resposta para o usuário..."
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-green-400 resize-none"
                rows={3}
              />
              <button
                onClick={() => sendReply.mutate()}
                disabled={!reply.trim() || sendReply.isPending}
                className="w-10 h-10 self-end rounded-xl bg-green-600 hover:bg-green-700 flex items-center justify-center disabled:opacity-40"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-500">Conversas transferidas para atendimento humano</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma conversa transferida ainda.</p>
          <p className="text-xs mt-1">As conversas aparecerão aqui quando usuários solicitarem atendimento humano.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => markRead(conv)}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800 truncate">{conv.user_name || conv.user_email}</p>
                      {conv.unread_admin && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.user_email}</p>
                    {conv.partner_name && <p className="text-xs text-primary font-medium">🏪 {conv.partner_name}</p>}
                    {conv.summary && <p className="text-xs text-slate-400 truncate mt-0.5">{conv.summary}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={conv.status === 'encerrado' ? 'outline' : 'default'} className="text-[10px] mb-1">
                    {conv.status === 'encerrado' ? '✅ Respondido' : '⏳ Aguardando'}
                  </Badge>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.transferred_at || conv.created_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-13">
                {(conv.messages || []).length} mensagens na conversa
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}