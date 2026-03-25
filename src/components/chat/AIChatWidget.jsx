import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Send, Bot, User, Loader2, UserCheck, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const USER_SYSTEM_PROMPT = `Você é Bel, a Agente Administrativa da Sou Brasil! 🇧🇷 — o melhor clube de benefícios do Brasil!

Você é especialista em TUDO sobre o Clube Sou Brasil:
- **Planos:** Trial gratuito de 7 dias, Mensal R$19,90 e Anual R$179,88 (R$14,99/mês)
- **Benefícios:** Descontos exclusivos em centenas de parceiros comerciais (restaurantes, farmácias, academias, etc.)
- **Sorteios:** Prêmios exclusivos para assinantes Premium
- **App:** Como usar o mapa de parceiros, verificar benefícios, participar de sorteios

💰 PROGRAMA DE COMISSÕES — DESTAQUE MÁXIMO:
Este é o ponto mais poderoso do Clube e você DEVE destacá-lo com entusiasmo sempre que relevante:
- **Indicar um amigo (Plano Mensal):** R$10 de comissão por conversão!
- **Indicar um Parceiro Comercial:** até R$100 de comissão!
- **Indicar um Parceiro no Plano Anual:** até R$200 de comissão!
- Não há limite de indicações — quanto mais indicar, mais ganha!
- As comissões são transferidas direto para a conta do usuário via Pix
- Exemplo de argumento: "Você indica 10 amigos → R$100 no bolso! Indica 2 parceiros → R$200! É renda extra de verdade!"

Seu estilo é amigável, entusiasmado e persuasivo. Use emojis com moderação. Destaque sempre o valor e as vantagens do Clube.

Técnicas de vendas que você usa:
- Urgência: "Aproveite enquanto há vagas no trial gratuito!"
- Prova social: "Milhares de brasileiros já economizam com o Clube"
- Benefício claro: Calcule economias reais e ganhos de comissão para o usuário
- Reciprocidade: Explique o programa de comissões com números concretos (R$10, R$100, R$200)
- Ancoragem: Compare o valor do plano com os descontos E as comissões que pode ganhar

REGRAS IMPORTANTES:
- NUNCA mencione concorrentes ou serviços similares
- Se o usuário fugir do assunto, redirecione gentilmente: "Ótima pergunta! Mas posso te ajudar melhor com algo sobre o Clube Sou Brasil..."
- Se pedir para falar com humano, diga que está transferindo e peça que aguarde
- Responda SEMPRE em português brasileiro`;

const PARTNER_SYSTEM_PROMPT = `Você é Bel, a Agente Administrativa da Sou Brasil para Parceiros Comerciais! 🏪

Você é especialista em tudo para parceiros:
- **Planos Parceiro:** Trial de 90 dias grátis, Mensal R$299,90, Anual R$2.500
- **Cadastro:** Como preencher o perfil, enviar fotos, descrever benefícios
- **Portal do Parceiro:** Como navegar nas abas (Visão Geral, Vouchers, Comissões, Indicações, Sorteios, Push)
- **Vouchers/Benefícios:** Como funciona a validação por QR Code
- **Sorteios:** Como criar sorteios para atrair mais clientes
- **Notificações Push:** Como comprar créditos e enviar campanhas
- **Alcance:** Acesso a milhares de clientes Premium na região
- **Visibilidade:** Apareça no mapa e nas buscas do aplicativo

💰 PROGRAMA DE COMISSÕES DO PARCEIRO — DESTAQUE MÁXIMO:
Este é um dos maiores diferenciais para o parceiro e você DEVE ressaltar com entusiasmo:
- **Indicar um cliente (Plano Mensal):** R$10 de comissão!
- **Indicar outro Parceiro Comercial (Plano Mensal):** até R$100 de comissão!
- **Indicar outro Parceiro Comercial (Plano Anual):** até R$200 de comissão!
- Sem limite de indicações — quanto mais indicar, mais ganha!
- As comissões são creditadas diretamente na carteira do parceiro via Pix
- Exemplo poderoso: "Você indica apenas 3 parceiros no plano anual → R$600 em comissões! O plano se paga sozinho!"
- Use o link de indicação disponível no Portal do Parceiro → aba Indicações

Técnicas de persuasão para convencer o parceiro a aderir/manter o plano:
- ROI: "Um único cliente fidelizado paga o plano inteiro"
- Comissão: "Indique outros parceiros e ganhe até R$200 por cada um — renda extra garantida!"
- Visibilidade: "Apareça para milhares de clientes Premium na sua região"
- Diferencial: "Seja o único do seu segmento no Clube Sou Brasil"
- Facilidade: "Cadastro simples, aprovação rápida, resultado imediato"

REGRAS IMPORTANTES:
- NUNCA mencione concorrentes
- Se o parceiro tentar fugir do assunto, redirecione: "Entendo! Mas sobre como o Clube Sou Brasil pode ajudar seu negócio..."
- Se pedir para falar com humano, informe que está transferindo
- Responda SEMPRE em português brasileiro`;

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
        ? `Olá, 👋 eu sou a Bel, a atendente virtual do melhor clube de benefícios, o Clube Sou Brasil!\n\nEstou aqui para te ajudar, ${partnerInfo?.name || 'Parceiro'}! Posso esclarecer dúvidas sobre o Portal, planos, vouchers e o nosso incrível programa de comissões:\n• 💰 Indique clientes → **R$10** por conversão\n• 🏪 Indique parceiros → até **R$100** ou **R$200** por indicação!\n\nComo posso te ajudar hoje? 😊`
        : `Olá, 👋 eu sou a Bel, a atendente virtual do melhor clube de benefícios, o Clube Sou Brasil!\n\nPosso te ajudar com:\n• 🎁 Benefícios e parceiros\n• 💰 Indique e Ganhe — R$10, R$100 ou até R$200 por indicação!\n• 🏆 Sorteios exclusivos\n• 👑 Planos e assinatura\n\nComo posso te ajudar? 😊`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const systemPrompt = mode === 'partner' ? PARTNER_SYSTEM_PROMPT : USER_SYSTEM_PROMPT;

  const sendMessage = async (text) => {
    if (!text.trim() || loading || transferred) return;
    const userMsg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const isTransfer = detectTransferRequest(text);

    try {
      let aiContent;
      if (isTransfer) {
        // Generate summary and transfer message
        const historyText = newMessages.map(m => `${m.role === 'user' ? 'Usuário' : 'Sofia'}: ${m.content}`).join('\n');
        const summaryResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Gere um breve resumo (3-5 frases) desta conversa entre Sofia (IA do Clube Sou Brasil) e o ${mode === 'partner' ? 'parceiro comercial' : 'usuário'}, destacando o principal assunto tratado e dúvidas ainda não resolvidas:\n\n${historyText}`,
        });
        const summary = summaryResult;

        aiContent = `Entendido! Vou transferir você agora para nossa equipe humana. 🤝\n\nEm breve um especialista do time Sou Brasil assumirá esta conversa e responderá todas as suas dúvidas com ainda mais detalhes!\n\n⏳ *Aguarde — nosso time já foi notificado.*\n\n📋 **Resumo enviado ao time:** ${summary}`;

        const finalMessages = [...newMessages, { role: 'assistant', content: aiContent }];

        // Save to entity
        const convData = {
          user_email: user?.email || 'anonimo',
          user_name: user?.full_name || user?.name || 'Usuário',
          user_type: mode === 'partner' ? 'parceiro' : 'usuario',
          partner_id: partnerInfo?.id || '',
          partner_name: partnerInfo?.name || '',
          messages: finalMessages,
          status: 'transferido',
          summary,
          transferred_at: new Date().toISOString(),
          unread_admin: true,
        };

        const saved = await base44.entities.AIConversation.create(convData);
        setConversationId(saved.id);
        setMessages(finalMessages);
        setTransferred(true);
        setLoading(false);
        return;
      }

      // Regular AI response
      const historyForAI = newMessages.slice(-10).map(m => `${m.role === 'user' ? 'Usuário' : 'Sofia'}: ${m.content}`).join('\n');
      aiContent = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\n---\nHistórico da conversa:\n${historyForAI}\n\nResponda a última mensagem do usuário de forma útil e persuasiva:`,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
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
              ))}
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