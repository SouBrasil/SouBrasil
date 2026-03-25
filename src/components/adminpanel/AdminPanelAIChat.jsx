import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bot, User, Send, ChevronLeft, Clock, Search, MessageSquare, Store, Calendar, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminPanelAIChat({ session, userType = 'usuario' }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['ai-conversations-all', userType],
    queryFn: () => base44.entities.AIConversation.filter({ user_type: userType }, '-last_message_at', 300),
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase().trim();
    return conversations.filter(c =>
      (c.user_name || '').toLowerCase().includes(q) ||
      (c.user_email || '').toLowerCase().includes(q) ||
      (c.partner_name || '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !selected) return;
      const adminMsg = {
        role: 'admin',
        content: reply.trim(),
        sent_by: session?.name || 'Admin',
        sent_at: new Date().toISOString(),
      };
      const existing = selected.admin_replies || [];
      await base44.entities.AIConversation.update(selected.id, {
        admin_replies: [...existing, adminMsg],
        unread_admin: false,
        status: 'encerrado',
        last_message_at: new Date().toISOString(),
      });
      setSelected(prev => ({ ...prev, admin_replies: [...existing, adminMsg], status: 'encerrado' }));
      setReply('');
    },
    onSuccess: () => qc.invalidateQueries(['ai-conversations-all', userType]),
  });

  const markRead = async (conv) => {
    if (conv.unread_admin) {
      await base44.entities.AIConversation.update(conv.id, { unread_admin: false });
      qc.invalidateQueries(['ai-conversations-all', userType]);
    }
    setSelected(conv);
  };

  const unreadCount = conversations.filter(c => c.unread_admin).length;
  const title = userType === 'parceiro' ? 'Histórico IA — Parceiros' : 'Histórico IA — Usuários';

  if (selected) {
    const allMessages = [
      ...(selected.messages || []),
      ...(selected.admin_replies || []),
    ].sort((a, b) => {
      const dateA = new Date(a.sent_at || a.timestamp || 0);
      const dateB = new Date(b.sent_at || b.timestamp || 0);
      return dateA - dateB;
    });

    const profile = selected.user_profile_snapshot || {};

    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar para lista
        </button>

        {/* User Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              {userType === 'parceiro' ? <Store className="w-7 h-7 text-blue-600" /> : <User className="w-7 h-7 text-blue-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-slate-800">{selected.user_name || '—'}</h3>
                <Badge variant="outline" className="text-[10px]">{userType === 'parceiro' ? '🏪 Parceiro' : '👤 Usuário'}</Badge>
                <Badge variant={selected.status === 'transferido' ? 'default' : selected.status === 'encerrado' ? 'outline' : 'secondary'} className="text-[10px]">
                  {selected.status === 'transferido' ? '⏳ Aguardando' : selected.status === 'encerrado' ? '✅ Encerrado' : '🟢 Ativo'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selected.user_email}</span>
                {selected.partner_name && <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5 text-primary" />{selected.partner_name}</span>}
                {selected.total_sessions > 1 && <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{selected.total_sessions} sessões</span>}
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                  Primeiro contato: {new Date(selected.created_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {/* Profile snapshot details */}
              {Object.keys(profile).length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {profile.phone && <span className="bg-slate-50 rounded-lg px-3 py-1.5 border"><strong>📱 Telefone:</strong> {profile.phone}</span>}
                  {profile.city && <span className="bg-slate-50 rounded-lg px-3 py-1.5 border"><strong>📍 Cidade:</strong> {profile.city}</span>}
                  {profile.subscription_type && <span className="bg-slate-50 rounded-lg px-3 py-1.5 border"><strong>👑 Plano:</strong> {profile.subscription_type}</span>}
                  {profile.role && <span className="bg-slate-50 rounded-lg px-3 py-1.5 border"><strong>🔖 Perfil:</strong> {profile.role}</span>}
                </div>
              )}
            </div>
          </div>
          {selected.summary && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-800 mb-1">📋 Resumo gerado pela IA:</p>
              <p className="text-xs text-blue-700">{selected.summary}</p>
            </div>
          )}
        </div>

        {/* Full Conversation */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="font-bold text-sm text-slate-700">💬 Histórico Completo da Conversa</p>
            <span className="text-xs text-slate-400">{(selected.messages || []).length} mensagens</span>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {(selected.messages || []).length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">Nenhuma mensagem registrada.</p>
            ) : (
              (selected.messages || []).map((msg, i) => (
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
                    {msg.timestamp && (
                      <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}
                </div>
              ))
            )}
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

          {/* Reply box — only if transferred/pending */}
          {(selected.status === 'transferido' || selected.status === 'ativo') && (
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">{title}</h2>
            <p className="text-xs text-slate-500">{conversations.length} conversa{conversations.length !== 1 ? 's' : ''} registradas</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou parceiro..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'Nenhum resultado encontrado.' : 'Nenhuma conversa registrada ainda.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => markRead(conv)}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    {userType === 'parceiro' ? <Store className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-800 truncate">{conv.user_name || conv.user_email}</p>
                      {conv.unread_admin && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.user_email}</p>
                    {conv.partner_name && <p className="text-xs text-primary font-medium truncate">🏪 {conv.partner_name}</p>}
                    {conv.summary && <p className="text-xs text-slate-400 truncate mt-0.5">{conv.summary}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <Badge variant={conv.status === 'transferido' ? 'default' : conv.status === 'encerrado' ? 'outline' : 'secondary'} className="text-[10px]">
                    {conv.status === 'transferido' ? '⏳ Aguardando' : conv.status === 'encerrado' ? '✅ Encerrado' : '🟢 Ativo'}
                  </Badge>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.last_message_at || conv.created_date).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-slate-400">{(conv.messages || []).length} msgs · {conv.total_sessions || 1} sessão(ões)</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}