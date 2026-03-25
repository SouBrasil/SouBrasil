import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Send, Bot, User, Loader2, UserCheck, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const USER_SYSTEM_PROMPT = `Você é Bel, a Agente Administrativa da Sou Brasil! 🇧🇷 — o melhor clube de benefícios do Brasil!

Você é especialista em TUDO sobre o Clube Sou Brasil:
- **Planos:** Trial gratuito de 7 dias, Mensal R$19,90 e Anual R$179,88 (R$14,99/mês)
- **Benefícios:** Descontos exclusivos em centenas de parceiros comerciais (restaurantes, farmácias, academias, lojas, serviços, beleza, saúde, educação, etc.)
- **Mapa de parceiros:** App exibe mapa com todos os parceiros próximos ao usuário com filtros por categoria
- **Voucher digital:** Usuário apresenta o QR Code do app para validar o desconto no estabelecimento parceiro
- **Sorteios:** Prêmios exclusivos periódicos para assinantes Premium — o usuário participa com um clique
- **App:** Como usar o mapa, verificar benefícios, resgatar vouchers, participar de sorteios, indicar amigos
- **Seja Parceiro:** Comércios locais podem se cadastrar para fazer parte da rede de parceiros

💰 PROGRAMA DE COMISSÕES — DESTAQUE MÁXIMO:
- **Indicar um amigo (Plano Mensal):** R$10 de comissão!
- **Indicar um Parceiro Comercial (Plano Mensal):** até R$100 de comissão!
- **Indicar um Parceiro Comercial (Plano Anual):** até R$200 de comissão!
- Sem limite de indicações — quanto mais indicar, mais ganha!
- Comissões via Pix direto na carteira do usuário
- Exemplo: "Indica 10 amigos → R$100! Indica 2 parceiros → até R$400!"

Seu estilo é amigável, entusiasmado e persuasivo. Use emojis com moderação. Destaque sempre o valor e as vantagens do Clube.

Técnicas de vendas:
- Urgência: "Aproveite enquanto há vagas no trial gratuito!"
- Prova social: "Milhares de brasileiros já economizam com o Clube"
- Benefício claro: Calcule economias reais e ganhos de comissão
- Ancoragem: Compare o valor do plano com os descontos e comissões obtidos

REGRAS IMPORTANTES:
- NUNCA mencione concorrentes ou serviços similares
- Se o usuário fugir do assunto, redirecione gentilmente
- Se pedir para falar com humano, diga que está transferindo
- Responda SEMPRE em português brasileiro`;

const PARTNER_SYSTEM_PROMPT = `Você é Bel, a Agente Administrativa da Sou Brasil para Parceiros Comerciais! 🏪

Você é especialista em tudo para parceiros:
- **Planos Parceiro:** Trial de 90 dias grátis, Mensal R$299,90, Anual R$2.500
- **Cadastro:** Como preencher o perfil, enviar fotos, descrever benefícios, endereço com coordenadas no mapa
- **Portal do Parceiro:** Abas — Visão Geral (stats), Vouchers (usos), Comissões, Indicações, Avaliações, Sorteios, Notif. Push, Perfil, Minha Conta
- **Vouchers/Benefícios:** Validação por QR Code que o cliente apresenta — parceiro confirma o uso
- **Sorteios:** Criar sorteios para atrair e fidelizar clientes da base Sou Brasil
- **Notificações Push:** Comprar créditos e enviar campanhas geolocalizadas para clientes na região
- **Alcance:** Acesso a milhares de clientes Premium na região com perfil de quem busca economia
- **Visibilidade:** Apareça no mapa e nas buscas do aplicativo com foto, horário, descrição e avaliações
- **Avaliações:** Clientes avaliam o estabelecimento — aumenta credibilidade e atrai mais clientes

💰 PROGRAMA DE COMISSÕES DO PARCEIRO — DESTAQUE MÁXIMO:
- **Indicar um cliente (Plano Mensal):** R$10 de comissão!
- **Indicar outro Parceiro Comercial (Plano Mensal):** até R$100 de comissão!
- **Indicar outro Parceiro Comercial (Plano Anual):** até R$200 de comissão!
- Sem limite de indicações!
- Exemplo: "Indica 3 parceiros no anual → R$600! O plano se paga sozinho!"
- Link de indicação disponível na aba Indicações do Portal

Técnicas de persuasão:
- ROI: "Um único cliente fidelizado paga o plano inteiro"
- Comissão: "Indique parceiros e ganhe até R$200 cada — renda extra garantida!"
- Visibilidade: "Apareça para milhares de clientes Premium na sua região"
- Diferencial: "Seja o único do seu segmento no Clube Sou Brasil"

REGRAS IMPORTANTES:
- NUNCA mencione concorrentes
- Redirecione gentilmente se sair do assunto
- Se pedir humano, informe que está transferindo
- Responda SEMPRE em português brasileiro`;

const USER_QUICK_ACTIONS = [
  { emoji: '🎁', label: 'Benefícios e parceiros', message: 'Quero saber mais sobre os benefícios e parceiros do Clube Sou Brasil', color: '#d97706', shadow: 'rgba(217,119,6,0.4)' },
  { emoji: '💰', label: 'Indique e Ganhe R$10, R$100 ou R$200!', message: 'Como funciona o programa Indique e Ganhe? Quanto posso ganhar?', color: '#16a34a', shadow: 'rgba(22,163,74,0.4)' },
  { emoji: '🏆', label: 'Sorteios exclusivos', message: 'Quero saber sobre os sorteios exclusivos do Clube Sou Brasil', color: '#ea580c', shadow: 'rgba(234,88,12,0.4)' },
  { emoji: '👑', label: 'Planos e assinatura', message: 'Quais são os planos disponíveis e quanto custam?', color: '#2563eb', shadow: 'rgba(37,99,235,0.4)' },
];

const PARTNER_QUICK_ACTIONS = [
  { emoji: '🏪', label: 'Benefícios do Portal', message: 'Quais são os benefícios de ser parceiro do Clube Sou Brasil?', color: '#d97706', shadow: 'rgba(217,119,6,0.4)' },
  { emoji: '💰', label: 'Indique e Ganhe R$10, R$100 ou R$200!', message: 'Como funciona o programa de comissões para parceiros?', color: '#16a34a', shadow: 'rgba(22,163,74,0.4)' },
  { emoji: '🎰', label: 'Criar sorteios', message: 'Como posso criar sorteios para meus clientes?', color: '#ea580c', shadow: 'rgba(234,88,12,0.4)' },
  { emoji: '💎', label: 'Planos Parceiro', message: 'Quais são os planos disponíveis para parceiros comerciais?', color: '#2563eb', shadow: 'rgba(37,99,235,0.4)' },
];

const TRANSFER_KEYWORDS = [
  'falar com humano', 'atendimento humano', 'falar com pessoa', 'falar com alguém',
  'humano', 'atendente', 'suporte humano', 'pessoa real', 'funcionário', 'quero falar',
  'transferir', 'atendimento real'
];

function detectTransferRequest(msg) {
  const lower = msg.toLowerCase();
  return TRANSFER_KEYWORDS.some(kw => lower.includes(kw));
}

export default function AIChatWidget({ user, mode = 'user', partnerInfo = null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: mode === 'partner'
        ? `Olá, 👋 eu sou a Bel, a atendente virtual do melhor clube de benefícios, o Clube Sou Brasil!\n\nOlá, ${partnerInfo?.name || 'Parceiro'}! Selecione um tópico ou digite sua dúvida:`
        : `Olá, 👋 eu sou a Bel, a atendente virtual do melhor clube de benefícios, o Clube Sou Brasil!\n\nSelecione um tópico ou digite sua dúvida:`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Load or create persistent conversation record when chat opens
  useEffect(() => {
    if (!open || initialized || !user?.email) return;
    setInitialized(true);
    const loadHistory = async () => {
      try {
        const existing = await base44.entities.AIConversation.filter(
          { user_email: user.email, user_type: mode === 'partner' ? 'parceiro' : 'usuario' },
          '-last_message_at', 1
        );
        if (existing.length > 0) {
          const conv = existing[0];
          setConversationId(conv.id);
          if (conv.messages && conv.messages.length > 0) {
            // Greet by name using history context
            const firstName = user.full_name?.split(' ')[0] || '';
            const greeting = mode === 'partner'
              ? `Olá de novo, ${partnerInfo?.name || firstName || 'Parceiro'}! 👋 Bem-vindo de volta ao suporte Sou Brasil! Como posso te ajudar hoje?`
              : `Olá de novo${firstName ? `, ${firstName}` : ''}! 👋 É um prazer te ver novamente! Em que posso te ajudar hoje?`;
            setMessages([...conv.messages, { role: 'assistant', content: greeting, timestamp: new Date().toISOString() }]);
          }
          if (conv.status === 'transferido') setTransferred(true);
        }
      } catch (_) {}
    };
    loadHistory();
  }, [open]);

  const systemPrompt = mode === 'partner' ? PARTNER_SYSTEM_PROMPT : USER_SYSTEM_PROMPT;

  const persistMessages = async (msgs, extraData = {}) => {
    if (!user?.email) return;
    const now = new Date().toISOString();
    const profileSnapshot = {
      phone: user.phone || '',
      city: user.city || '',
      subscription_type: user.subscription_type || '',
      role: user.role || '',
    };
    try {
      if (conversationId) {
        await base44.entities.AIConversation.update(conversationId, {
          messages: msgs,
          last_message_at: now,
          user_name: user.full_name || '',
          user_profile_snapshot: profileSnapshot,
          ...extraData,
        });
      } else {
        const existing = await base44.entities.AIConversation.filter(
          { user_email: user.email, user_type: mode === 'partner' ? 'parceiro' : 'usuario' },
          '-last_message_at', 1
        );
        if (existing.length > 0) {
          const conv = existing[0];
          setConversationId(conv.id);
          await base44.entities.AIConversation.update(conv.id, {
            messages: msgs,
            last_message_at: now,
            user_name: user.full_name || conv.user_name,
            total_sessions: (conv.total_sessions || 1) + 1,
            user_profile_snapshot: profileSnapshot,
            ...extraData,
          });
        } else {
          const created = await base44.entities.AIConversation.create({
            user_email: user.email,
            user_name: user.full_name || '',
            user_type: mode === 'partner' ? 'parceiro' : 'usuario',
            partner_id: partnerInfo?.id || '',
            partner_name: partnerInfo?.name || '',
            messages: msgs,
            status: 'ativo',
            last_message_at: now,
            total_sessions: 1,
            unread_admin: false,
            user_profile_snapshot: profileSnapshot,
            ...extraData,
          });
          setConversationId(created.id);
        }
      }
    } catch (_) {}
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading || transferred) return;
    const userMsg = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const isTransfer = detectTransferRequest(text);

    try {
      let aiContent;
      if (isTransfer) {
        // Generate summary and transfer message
        const historyText = newMessages.map(m => `${m.role === 'user' ? 'Usuário' : 'Bel'}: ${m.content}`).join('\n');
        const summaryResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Gere um breve resumo (3-5 frases) desta conversa entre Sofia (IA do Clube Sou Brasil) e o ${mode === 'partner' ? 'parceiro comercial' : 'usuário'}, destacando o principal assunto tratado e dúvidas ainda não resolvidas:\n\n${historyText}`,
        });
        const summary = summaryResult;

        aiContent = `Entendido! Vou transferir você agora para nossa equipe humana. 🤝\n\nEm breve um especialista do time Sou Brasil assumirá esta conversa e responderá todas as suas dúvidas com ainda mais detalhes!\n\n⏳ *Aguarde — nosso time já foi notificado.*\n\n📋 **Resumo enviado ao time:** ${summary}`;

        const finalMessages = [...newMessages, { role: 'assistant', content: aiContent, timestamp: new Date().toISOString() }];

        await persistMessages(finalMessages, {
          status: 'transferido',
          summary,
          transferred_at: new Date().toISOString(),
          unread_admin: true,
        });
        setMessages(finalMessages);
        setTransferred(true);
        setLoading(false);
        return;
      }

      // Regular AI response
      const historyForAI = newMessages.slice(-12).map(m => `${m.role === 'user' ? 'Usuário' : 'Bel'}: ${m.content}`).join('\n');
      const userName = user?.full_name?.split(' ')[0] || '';
      aiContent = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nNome do usuário: ${userName || 'desconhecido'}. Sempre chame pelo nome quando souber.\n\n---\nHistórico da conversa:\n${historyForAI}\n\nResponda a última mensagem do usuário de forma útil e persuasiva:`,
      });

      const assistantMsg = { role: 'assistant', content: aiContent, timestamp: new Date().toISOString() };
      const finalMsgs = [...newMessages, assistantMsg];
      setMessages(finalMsgs);
      persistMessages(finalMsgs);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ops! Tive um problema técnico. Tente novamente em instantes! 😊' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferButton = () => {
    sendMessage('Quero falar com um humano, por favor.');
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center justify-center rounded-full shadow-2xl transition-all active:scale-95"
        style={{
          bottom: mode === 'partner' ? '24px' : '80px',
          right: '16px',
          width: 52,
          height: 52,
          background: 'linear-gradient(135deg, #1a56db, #0e3a99)',
          boxShadow: '0 6px 20px rgba(26,86,219,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        }}
        title="Chat com IA - Sofia"
      >
        <Bot className="w-6 h-6 text-white" />
        {transferred && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200"
            style={{
              bottom: mode === 'partner' ? '88px' : '144px',
              right: '12px',
              width: 'min(360px, calc(100vw - 24px))',
              height: 'min(520px, calc(100vh - 200px))',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #1a56db, #0e3a99)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Bel — Agente Administrativa</p>
                  <p className="text-white/70 text-[10px]">{transferred ? '🔄 Transferido para equipe humana' : '🟢 Online agora'}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((msg, i) => (
                i === 0 && msg.role === 'assistant' ? (
                  <div key={i} className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="max-w-[88%] space-y-2">
                      <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(mode === 'partner' ? PARTNER_QUICK_ACTIONS : USER_QUICK_ACTIONS).map((action) => (
                          <button
                            key={action.label}
                            onClick={() => !loading && !transferred && sendMessage(action.message)}
                            disabled={loading || transferred}
                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-white text-xs font-semibold text-left transition-all active:scale-95 disabled:opacity-50"
                            style={{ background: action.color, boxShadow: `0 3px 8px ${action.shadow}` }}
                          >
                            <span className="text-base leading-none shrink-0">{action.emoji}</span>
                            <span className="leading-tight">{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>
                )
              ))}
              {/* Show quick actions again if last msg is from assistant and no user msg yet */}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              {transferred && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 text-center">
                  ✅ Conversa transferida! Nossa equipe responderá em breve.
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Footer */}
            {!transferred ? (
              <div className="px-3 py-3 border-t border-slate-100 space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center disabled:opacity-40 shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                  </button>
                </div>
                <button
                  onClick={handleTransferButton}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors py-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Falar com atendente humano
                </button>
              </div>
            ) : (
              <div className="px-3 py-3 border-t border-slate-100 text-center">
                <p className="text-xs text-muted-foreground">Aguardando resposta da equipe Sou Brasil...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}