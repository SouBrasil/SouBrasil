import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Plus, Trash2, Send, Users, Crown, Clock, Info, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const typeOptions = [
  { value: 'info', label: 'Informação', color: 'bg-blue-100 text-blue-700' },
  { value: 'promo', label: 'Promoção', color: 'bg-purple-100 text-purple-700' },
  { value: 'benefit', label: 'Benefício', color: 'bg-green-100 text-green-700' },
  { value: 'alert', label: 'Alerta', color: 'bg-orange-100 text-orange-700' },
  { value: 'system', label: 'Sistema', color: 'bg-slate-100 text-slate-700' },
];

const targetOptions = [
  { value: 'all', label: 'Todos os Usuários', icon: Users },
  { value: 'premium', label: 'Somente Premium', icon: Crown },
  { value: 'trial', label: 'Somente Trial', icon: Clock },
  { value: 'specific', label: 'Usuário Específico', icon: Info },
];

const emptyForm = { title: '', message: '', type: 'info', target: 'all', target_email: '', action_url: '' };

export default function AdminPanelNotifications({ session }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['ap-notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 200),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Notification.create({ ...data, sent_at: new Date().toISOString() });
    },
    onSuccess: () => {
      qc.invalidateQueries(['ap-notifications']);
      toast.success('Notificação enviada com sucesso!');
      setShowForm(false); setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => { qc.invalidateQueries(['ap-notifications']); toast.success('Notificação removida!'); },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!form.title || !form.message) { toast.error('Preencha título e mensagem'); return; }
    if (form.target === 'specific' && !form.target_email) { toast.error('Informe o e-mail do usuário'); return; }
    sendMutation.mutate(form);
  };

  const getTypeStyle = (type) => typeOptions.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-600';
  const getTypeLabel = (type) => typeOptions.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">{notifications.length} notificações enviadas</p>
        <Button onClick={() => setShowForm(s => !s)} className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" /> Nova Notificação
        </Button>
      </div>

      {showForm && (
        <Card className="border-green-200 bg-green-50/20">
          <CardContent className="p-4">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Nova Notificação</h3>
            <form onSubmit={handleSend} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da notificação" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Conteúdo da notificação..."
                    className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                    {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Destinatários</label>
                  <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                    {targetOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {form.target === 'specific' && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">E-mail do Usuário</label>
                    <Input type="email" value={form.target_email} onChange={e => setForm(f => ({ ...f, target_email: e.target.value }))} placeholder="usuario@email.com" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Link de Ação (opcional)</label>
                  <Input value={form.action_url} onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))} placeholder="/Partners ou /Pricing" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={sendMutation.isPending} className="bg-green-600 hover:bg-green-700 gap-2">
                  <Send className="w-4 h-4" /> {sendMutation.isPending ? 'Enviando...' : 'Enviar Notificação'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card key={n.id} className="border-slate-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">{n.title}</p>
                      <Badge className={`text-[10px] ${getTypeStyle(n.type)}`}>{getTypeLabel(n.type)}</Badge>
                      {n.target && <Badge variant="outline" className="text-[10px]">{n.target === 'all' ? 'Todos' : n.target === 'premium' ? 'Premium' : n.target === 'trial' ? 'Trial' : n.target_email || n.target}</Badge>}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {n.sent_at ? new Date(n.sent_at).toLocaleString('pt-BR') : new Date(n.created_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => { if (confirm('Excluir notificação?')) deleteMutation.mutate(n.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}