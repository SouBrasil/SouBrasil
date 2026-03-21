import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Plus, Trash2, Send, CheckCircle2, X, Loader2, Image, Filter } from 'lucide-react';
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
  { value: 'all', label: '👥 Todos os Usuários' },
  { value: 'premium', label: '👑 Premium (Mensal + Anual)' },
  { value: 'premium_anual', label: '⭐ Premium Anual' },
  { value: 'premium_mensal', label: '📅 Premium Mensal' },
  { value: 'trial', label: '🔑 Trial' },
  { value: 'free', label: '🆓 Usuários Free' },
  { value: 'parceiros', label: '🏪 Parceiros Comerciais' },
  { value: 'specific', label: '✉️ Usuário Específico' },
];

const emptyForm = { title: '', message: '', type: 'info', target: 'all', target_email: '', action_url: '', image_url: '', filter_city: '', filter_state: '' };

function PushPartnerRequests() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ['all-push-orders'],
    queryFn: () => base44.entities.ScheduledPushNotification.filter({ status: 'aguardando_aprovacao' }),
  });

  const approveMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.ScheduledPushNotification.update(item.id, { status: 'aprovado' });
      await base44.entities.Notification.create({
        title: '✅ Notificação aprovada!',
        message: `Sua notificação "${item.title}" foi aprovada e será enviada conforme agendado.`,
        type: 'system', target: 'specific', target_email: item.partner_id,
        sent_at: new Date().toISOString(),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-push-orders'] }); toast.success('Notificação aprovada!'); setSelected(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.ScheduledPushNotification.update(item.id, { status: 'rejeitado', admin_notes: item._notes || '' });
      await base44.entities.Notification.create({
        title: '❌ Notificação não aprovada',
        message: `Sua notificação "${item.title}" não foi aprovada. Motivo: ${item._notes || 'Entre em contato com o suporte.'}`,
        type: 'alert', target: 'specific', target_email: item.partner_id,
        sent_at: new Date().toISOString(),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-push-orders'] }); toast.error('Notificação rejeitada.'); setSelected(null); },
  });

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma notificação de parceiro aguardando aprovação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-orange-500" />
        <h3 className="font-bold text-slate-700">Notificações Push de Parceiros</h3>
        <Badge className="bg-orange-100 text-orange-700">{orders.length} aguardando</Badge>
      </div>
      {orders.map(item => (
        <Card key={item.id} className="border-orange-200 bg-orange-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              {item.image_url && <img src={item.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
              <div className="flex-1">
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Parceiro: {item.partner_name} | Envio: {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString('pt-BR') : '—'} | Raio: {item.radius_km}km
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 h-8 text-xs flex-1" onClick={() => approveMutation.mutate(item)}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar e Enviar
              </Button>
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs flex-1 text-red-600 border-red-200" onClick={() => rejectMutation.mutate(item)}>
                <X className="w-3.5 h-3.5" /> Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPanelNotifications({ session }) {
  const [activeTab, setActiveTab] = useState('send');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadingImg, setUploadingImg] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['ap-notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 200),
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      // Usa a função backend que cria UserNotification para cada usuário
      const res = await base44.functions.invoke('sendNotification', data);
      if (!res.data?.success) throw new Error(res.data?.error || 'Erro ao enviar');
      // Registra no histórico
      await base44.entities.Notification.create({ ...data, sent_at: new Date().toISOString() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-notifications'] });
      toast.success('Notificação enviada com sucesso!');
      setShowForm(false); setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-notifications'] }); toast.success('Notificação removida!'); },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!form.title || !form.message) { toast.error('Preencha título e mensagem'); return; }
    if (form.target === 'specific' && !form.target_email) { toast.error('Informe o e-mail do usuário'); return; }
    sendMutation.mutate(form);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
      toast.success('Imagem carregada!');
    } catch { toast.error('Erro ao carregar imagem'); }
    setUploadingImg(false);
  };

  const getTypeStyle = (type) => typeOptions.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-600';
  const getTypeLabel = (type) => typeOptions.find(t => t.value === type)?.label || type;

  const tabs = [
    { id: 'send', label: 'Enviar Notificação' },
    { id: 'history', label: 'Histórico' },
    { id: 'partner-push', label: 'Push Parceiros' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'partner-push' && <PushPartnerRequests />}

      {activeTab === 'send' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">Envie notificações para usuários do Clube Sou Brasil</p>
            <Button onClick={() => setShowForm(s => !s)} className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" /> Nova Notificação
            </Button>
          </div>

          {showForm && (
            <Card className="border-green-200 bg-green-50/20">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Nova Notificação Push</h3>
                <form onSubmit={handleSend} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
                      <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título da notificação" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem *</label>
                      <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder="Conteúdo da notificação..."
                        className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
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
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Filtrar por Cidade (opcional)</label>
                      <Input value={form.filter_city} onChange={e => setForm(f => ({ ...f, filter_city: e.target.value }))} placeholder="Ex: São Paulo" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Filtrar por Estado (opcional)</label>
                      <Input value={form.filter_state} onChange={e => setForm(f => ({ ...f, filter_state: e.target.value }))} placeholder="Ex: SP" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Imagem (opcional)</label>
                      <div className="flex items-center gap-3">
                        {form.image_url && <img src={form.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-input rounded-md text-xs hover:bg-slate-50 transition-colors">
                          {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                          {uploadingImg ? 'Carregando...' : 'Carregar Imagem'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                        </label>
                        {form.image_url && <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-xs text-red-500">Remover</button>}
                      </div>
                    </div>
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

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            💡 <strong>Dica:</strong> Use filtros de cidade/estado para segmentar por região. Deixe em branco para enviar a todos do público selecionado.
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">{notifications.length} notificações enviadas</p>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
          ) : notifications.map(n => (
            <Card key={n.id} className="border-slate-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {n.image_url && <img src={n.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">{n.title}</p>
                      <Badge className={`text-[10px] ${getTypeStyle(n.type)}`}>{getTypeLabel(n.type)}</Badge>
                      {n.target && <Badge variant="outline" className="text-[10px]">{n.target === 'all' ? 'Todos' : n.target_email || n.target}</Badge>}
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