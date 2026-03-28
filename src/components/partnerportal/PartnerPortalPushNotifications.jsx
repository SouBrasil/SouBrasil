import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, ShoppingCart, Send, Calendar, CheckCircle2, Loader2, Info, Clock, Upload, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const TIERS = [
  { min: 1, max: 5, price: 20, label: '1 – 5 mensagens', tag: 'R$ 20,00/msg' },
  { min: 6, max: 10, price: 19, label: '6 – 10 mensagens', tag: 'R$ 19,00/msg' },
  { min: 11, max: 20, price: 18, label: '11 – 20 mensagens', tag: 'R$ 18,00/msg' },
  { min: 21, max: 35, price: 17, label: '21 – 35 mensagens', tag: 'R$ 17,00/msg' },
  { min: 36, max: 50, price: 15, label: '36 – 50 mensagens', tag: 'R$ 15,00/msg' },
];

const getPrice = (qty) => {
  const tier = TIERS.find(t => qty >= t.min && qty <= t.max);
  return tier ? tier.price : (qty > 50 ? null : 20);
};

const getTierIndex = (qty) => TIERS.findIndex(t => qty >= t.min && qty <= t.max);

export default function PartnerPortalPushNotifications({ partner, partnerAccess }) {
  const [qty, setQty] = useState(5);
  const [radiusKm, setRadiusKm] = useState(10);
  const [confirmPurchase, setConfirmPurchase] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgImage, setMsgImage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [confirmSchedule, setConfirmSchedule] = useState(false);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['push-orders', partner?.id],
    queryFn: () => base44.entities.PushNotificationOrder.filter({ partner_id: partner?.id }),
    enabled: !!partner?.id,
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ['scheduled-push', partner?.id],
    queryFn: () => base44.entities.ScheduledPushNotification.filter({ partner_id: partner?.id }),
    enabled: !!partner?.id,
  });

  const [checkoutData, setCheckoutData] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      // Cria cobrança real no Asaas
      const res = await base44.functions.invoke('asaasPayment', {
        action: 'create_push_payment',
        quantity: qty,
        total_price: totalPrice,
        partner_id: partner?.id,
        partner_name: partner?.name,
        radius_km: radiusKm,
      });
      if (!res?.data?.payment) throw new Error('Erro ao criar pagamento');
      return res.data;
    },
    onSuccess: (data) => {
      setConfirmPurchase(false);
      setCheckoutData(data);
      toast.success('Cobrança criada! Realize o pagamento para liberar os créditos.');
    },
    onError: (err) => toast.error('Erro ao processar compra: ' + err.message),
  });

  const handleCheckPayment = async () => {
    if (!checkoutData?.payment?.asaas_payment_id) return;
    setCheckingPayment(true);
    try {
      const res = await base44.functions.invoke('asaasPayment', {
        action: 'check_push_payment',
        asaas_payment_id: checkoutData.payment.asaas_payment_id,
        partner_id: partner?.id,
        partner_name: partner?.name,
        quantity: qty,
        radius_km: radiusKm,
      });
      if (res?.data?.credits_added) {
        qc.invalidateQueries(['push-orders']);
        setCheckoutData(null);
        setPaymentDone(true);
        toast.success(`✅ Pagamento confirmado! ${qty} crédito(s) adicionado(s)!`);
      } else {
        toast.info('Pagamento ainda não confirmado. Aguarde e tente novamente.');
      }
    } catch { toast.error('Erro ao verificar pagamento.'); }
    setCheckingPayment(false);
  };

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ScheduledPushNotification.create({
        partner_id: partner?.id,
        partner_name: partner?.name,
        order_id: activeOrder?.id,
        title: msgTitle,
        message: msgBody,
        image_url: msgImage,
        scheduled_at: scheduledAt,
        radius_km: activeOrder?.radius_km || 10,
        status: 'aguardando_aprovacao',
      });
      // Deduct credit
      if (activeOrder) {
        await base44.entities.PushNotificationOrder.update(activeOrder.id, {
          credits_remaining: (activeOrder.credits_remaining || 0) - 1,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['scheduled-push']);
      qc.invalidateQueries(['push-orders']);
      setConfirmSchedule(false);
      setMsgTitle(''); setMsgBody(''); setScheduledAt('');
      toast.success('Notificação agendada para análise do time Sou Brasil!');
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMsgImage(file_url);
    setUploading(false);
  };

  const unitPrice = getPrice(qty);
  const totalPrice = unitPrice ? qty * unitPrice * (radiusKm > 10 ? 1.5 : 1) : null;
  const activeOrder = orders.find(o => o.status === 'pago' && (o.credits_remaining || 0) > 0);

  // Minimum schedule: 2 days from now
  const minScheduleDate = new Date();
  minScheduleDate.setDate(minScheduleDate.getDate() + 2);
  const minScheduleStr = minScheduleDate.toISOString().slice(0, 16);

  const tierIdx = getTierIndex(qty);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-bold">Como funciona?</p>
            <p>Compre créditos de notificação PUSH e envie mensagens para todos os usuários dentro do raio configurado do seu comércio. O preço por mensagem varia conforme a quantidade contratada. Com raio de 20km, o valor aumenta 50%.</p>
            <p className="font-medium">⚠️ As mensagens somente serão enviadas após análise e aprovação do time Sou Brasil (até 48h).</p>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div>
        <h3 className="font-bold text-sm mb-3">Tabela de Preços</h3>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((tier, i) => (
            <button key={i}
              onClick={() => setQty(tier.min)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${tierIdx === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40'}`}>
              <div className="font-bold">{tier.label}</div>
              <div className="opacity-80">{tier.tag}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Calculator */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Calculadora</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Quantidade de notificações</label>
              <Input type="number" min={1} max={50} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Raio de distância (km)</label>
              <select value={radiusKm} onChange={e => setRadiusKm(parseInt(e.target.value))}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value={10}>10 km (padrão)</option>
                <option value={20}>20 km (+50%)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="text-sm">
              <p className="text-muted-foreground">Valor unitário: <span className="font-bold text-slate-800">{unitPrice ? `R$ ${unitPrice},00` : '—'}</span></p>
              {radiusKm > 10 && <p className="text-xs text-orange-600">+ 50% pelo raio estendido</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-green-600">{totalPrice ? `R$ ${totalPrice.toFixed(0)},00` : '—'}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <Button
              className="ml-3 bg-green-600 hover:bg-green-700 shadow-[0_4px_10px_rgba(0,0,0,0.2)] h-11 px-5 font-bold"
              style={{ boxShadow: '0 4px 8px rgba(22,163,74,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}
              disabled={!totalPrice || qty > 50}
              onClick={() => setConfirmPurchase(true)}
            >
              <ShoppingCart className="w-4 h-4 mr-1" /> Comprar
            </Button>
          </div>
          {qty > 50 && (
            <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
              Para quantidades superiores a 50, entre em contato com o time de suporte da Sou Brasil.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active credits */}
      {activeOrder && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-green-800">{activeOrder.credits_remaining} crédito(s) disponíveis</p>
                <p className="text-xs text-green-600">Raio de {activeOrder.radius_km} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule message */}
      {activeOrder && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4 text-primary" />Criar Notificação PUSH</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
              <Input value={msgTitle} onChange={e => setMsgTitle(e.target.value)} placeholder="Ex: Promoção especial no {nome do comércio}!" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem *</label>
              <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={3}
                className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none"
                placeholder="Sua mensagem para os clientes próximos..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Imagem (opcional)</label>
              {msgImage && <img src={msgImage} alt="Preview" className="w-full h-24 object-cover rounded-xl mb-2" />}
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 text-sm text-slate-500 hover:bg-slate-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Enviando...' : 'Adicionar imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Data e Hora de Envio * <span className="text-slate-400">(mínimo 2 dias a partir de hoje)</span>
              </label>
              <Input type="datetime-local" value={scheduledAt} min={minScheduleStr} onChange={e => setScheduledAt(e.target.value)} className="rounded-xl" />
            </div>
            <Button onClick={() => setConfirmSchedule(true)} disabled={!msgTitle || !msgBody || !scheduledAt || scheduledAt < minScheduleStr}
              className="w-full bg-primary h-11 rounded-xl font-bold">
              <Calendar className="w-4 h-4 mr-2" /> Agendar Envio
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scheduled history */}
      {scheduled.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">Histórico de Notificações</h3>
          {scheduled.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Bell className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="inline w-3 h-3 mr-1" />
                  {new Date(s.scheduled_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <Badge className={`text-[10px] ${s.status === 'aprovado' ? 'bg-green-100 text-green-700' : s.status === 'enviado' ? 'bg-blue-100 text-blue-700' : s.status === 'rejeitado' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                {s.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Purchase confirmation */}
      {/* Checkout / Payment Modal */}
      {checkoutData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-black text-lg text-center">💳 Realize o Pagamento</h3>
            <p className="text-sm text-center text-slate-600">
              {qty} notificações push por <strong>R$ {totalPrice?.toFixed(0)},00</strong>
            </p>
            {checkoutData.payment?.pix_copy_paste && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-green-700 text-center">⚡ PIX — Copie e cole:</p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <code className="text-xs break-all text-slate-700">{checkoutData.payment.pix_copy_paste.slice(0, 60)}...</code>
                </div>
                <Button onClick={() => { navigator.clipboard.writeText(checkoutData.payment.pix_copy_paste); toast.success('Pix copiado!'); }}
                  className="w-full bg-green-600 hover:bg-green-700 gap-2">
                  <Copy className="w-4 h-4" /> Copiar Código PIX
                </Button>
              </div>
            )}
            {checkoutData.payment?.asaas_invoice_url && !checkoutData.payment?.pix_copy_paste && (
              <a href={checkoutData.payment.asaas_invoice_url} target="_blank" rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 text-sm">
                💳 Pagar com Cartão / Boleto
              </a>
            )}
            <p className="text-xs text-slate-500 text-center">Após pagar, clique em verificar para liberar os créditos.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCheckoutData(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleCheckPayment} disabled={checkingPayment} className="flex-1 bg-primary gap-2">
                {checkingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Verificar Pagamento</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <ShoppingCart className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h3 className="font-black text-lg text-center mb-2">Confirmar Compra</h3>
            <p className="text-center text-sm text-slate-600 mb-4">
              Deseja realmente comprar <strong>{qty} notificação(ões)</strong> push por <strong>R$ {totalPrice?.toFixed(0)},00</strong>?
            </p>
            <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-xl p-3 mb-4">
              ⚠️ Os créditos serão liberados somente após confirmação do pagamento.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmPurchase(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => purchaseMutation.mutate()} disabled={purchaseMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
                {purchaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK, Comprar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule confirmation */}
      {confirmSchedule && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <Calendar className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-black text-lg text-center mb-2">Confirmar Agendamento</h3>
            <p className="text-center text-sm text-slate-600 mb-2">
              A notificação "<strong>{msgTitle}</strong>" será agendada para {scheduledAt ? new Date(scheduledAt).toLocaleString('pt-BR') : '—'}.
            </p>
            <p className="text-xs text-center text-blue-600 bg-blue-50 rounded-xl p-3 mb-4">
              A mensagem somente será enviada após a validação do time Sou Brasil, o que poderá levar até 48 horas.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmSchedule(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => scheduleMutation.mutate()} disabled={scheduleMutation.isPending} className="flex-1 bg-primary">
                {scheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agendar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}