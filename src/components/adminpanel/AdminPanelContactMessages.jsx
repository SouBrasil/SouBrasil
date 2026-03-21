import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const STATUS_LABELS = {
  nova: { label: 'Nova', color: 'bg-red-100 text-red-700' },
  em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-700' },
  respondida: { label: 'Respondida', color: 'bg-green-100 text-green-700' },
};

const TYPE_LABELS = {
  cadastro_duplicado: '🔒 CPF/CNPJ Duplicado',
  suporte: '🛠️ Suporte',
  outros: '📬 Outros',
};

export default function AdminPanelContactMessages() {
  const [expanded, setExpanded] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: () => base44.entities.ContactMessage.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContactMessage.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['contact-messages']); toast.success('Atualizado!'); },
  });

  const handleReply = (msg) => {
    if (!replyText.trim()) return;
    updateMutation.mutate({
      id: msg.id,
      data: { status: 'respondida', admin_reply: replyText },
    });
    setReplyText('');
    setExpanded(null);
  };

  const filtered = filterStatus === 'all' ? messages : messages.filter(m => m.status === filterStatus);
  const newCount = messages.filter(m => m.status === 'nova').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800">Caixa de Mensagens</h2>
          {newCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{newCount} nova{newCount > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all', 'Todas'], ['nova', 'Novas'], ['em_analise', 'Em Análise'], ['respondida', 'Respondidas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma mensagem encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => {
            const isExpanded = expanded === msg.id;
            const statusInfo = STATUS_LABELS[msg.status] || STATUS_LABELS.nova;
            return (
              <Card key={msg.id} className={`border-slate-200 ${msg.status === 'nova' ? 'border-l-4 border-l-red-400' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm text-slate-800">{msg.sender_name || 'Anônimo'}</p>
                        <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        {msg.type && <Badge className="text-[10px] bg-slate-100 text-slate-600">{TYPE_LABELS[msg.type] || msg.type}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{msg.sender_email}</p>
                      {msg.extra_info && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-1 inline-block">{msg.extra_info}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{new Date(msg.created_date).toLocaleString('pt-BR')}</p>
                    </div>
                    <button onClick={() => setExpanded(isExpanded ? null : msg.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Mensagem:</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                      </div>

                      {msg.admin_reply && (
                        <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                          <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Resposta do Admin:
                          </p>
                          <p className="text-sm text-green-800 whitespace-pre-wrap">{msg.admin_reply}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {msg.status !== 'em_analise' && msg.status !== 'respondida' && (
                          <Button size="sm" variant="outline" className="text-xs h-8"
                            onClick={() => updateMutation.mutate({ id: msg.id, data: { status: 'em_analise' } })}>
                            <Clock className="w-3 h-3 mr-1" /> Em Análise
                          </Button>
                        )}
                      </div>

                      {msg.status !== 'respondida' && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Escreva uma resposta..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            rows={3}
                            className="text-sm rounded-xl"
                          />
                          <Button size="sm" onClick={() => handleReply(msg)} disabled={!replyText.trim()}
                            className="bg-green-600 hover:bg-green-700 text-xs h-8">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Responder e Fechar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}