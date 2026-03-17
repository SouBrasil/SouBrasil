import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Send, Trash2, Plus, Users, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const typeColors = {
  info: 'bg-blue-100 text-blue-700',
  promo: 'bg-yellow-100 text-yellow-700',
  alert: 'bg-red-100 text-red-700',
  benefit: 'bg-emerald-100 text-emerald-700',
  system: 'bg-gray-100 text-gray-700',
};

const typeLabels = { info: 'Info', promo: 'Promoção', alert: 'Alerta', benefit: 'Benefício', system: 'Sistema' };
const targetLabels = { all: 'Todos', premium: 'Premium', trial: 'Trial', specific: 'Específico' };

export default function AdminNotifications() {
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target: 'all', target_email: '' });
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ['admin-notifs-list'],
    queryFn: () => base44.entities.Notification.list('-created_date', 100),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Notification.create({ ...data, sent_at: new Date().toISOString() });
    },
    onSuccess: () => {
      toast({ title: 'Notificação enviada!', description: 'A notificação foi criada com sucesso.' });
      setForm({ title: '', message: '', type: 'info', target: 'all', target_email: '' });
      setShowForm(false);
      qc.invalidateQueries(['admin-notifs-list']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => qc.invalidateQueries(['admin-notifs-list']),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold">Notificações Push</h2>
          <p className="text-xs text-muted-foreground">{notifs.length} notificações enviadas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Notificação
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Criar Nova Notificação</h3>
            <Input
              placeholder="Título da notificação"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              placeholder="Mensagem..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                <SelectTrigger><SelectValue placeholder="Público" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(targetLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.target === 'specific' && (
              <Input
                placeholder="Email do usuário"
                value={form.target_email}
                onChange={(e) => setForm({ ...form, target_email: e.target.value })}
              />
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => sendMutation.mutate(form)}
                disabled={!form.title || !form.message || sendMutation.isPending}
              >
                <Send className="w-4 h-4" />
                {sendMutation.isPending ? 'Enviando...' : 'Enviar Notificação'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {notifs.map((n) => (
          <Card key={n.id} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[n.type] || 'bg-gray-100 text-gray-700'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <Badge className={`text-[10px] ${typeColors[n.type] || ''}`}>{typeLabels[n.type]}</Badge>
                    <Badge variant="outline" className="text-[10px]">{targetLabels[n.target] || n.target}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {n.sent_at ? new Date(n.sent_at).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => deleteMutation.mutate(n.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {notifs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma notificação enviada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}