import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Gift, Calendar, Users, Plus, Send, Loader2, Upload, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const prizeTypeOptions = [
  ['desconto_exclusivo', 'Desconto Exclusivo'],
  ['premio_dinheiro', 'Prêmio em Dinheiro'],
  ['produto', 'Produto'],
  ['servico', 'Serviço'],
  ['outro', 'Outro'],
];

const statusBadge = {
  ativo: 'bg-green-100 text-green-700',
  realizado: 'bg-blue-100 text-blue-700',
  rascunho: 'bg-slate-100 text-slate-600',
  pendente: 'bg-yellow-100 text-yellow-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-600',
};

export default function PartnerPortalRaffles({ partner, partnerAccess }) {
  const [subView, setSubView] = useState('list'); // list | form | preview
  const [form, setForm] = useState({
    prize_type: 'produto',
    description: '',
    image_url: '',
    redemption_conditions: '',
    draw_date: '',
    max_participants: '',
    unlimited_participants: true,
  });
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const qc = useQueryClient();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: raffles = [] } = useQuery({
    queryKey: ['public-raffles'],
    queryFn: () => base44.entities.Raffle.list('-draw_date', 100),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['partner-raffle-requests', partner?.id],
    queryFn: () => base44.entities.PartnerRaffleRequest.filter({ partner_id: partner?.id }),
    enabled: !!partner?.id,
  });

  const submitMutation = useMutation({
    mutationFn: () => base44.entities.PartnerRaffleRequest.create({
      ...form,
      partner_id: partner?.id,
      partner_name: partner?.name,
      max_participants: form.unlimited_participants ? null : parseInt(form.max_participants) || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['partner-raffle-requests']);
      setSubmitted(true);
      toast.success('Sorteio enviado para análise!');
    },
  });

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('image_url', file_url);
    setUploading(false);
  };

  const activeRaffles = raffles.filter(r => r.status === 'ativo');
  const completedRaffles = raffles.filter(r => r.status === 'realizado');

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold">Solicitação Enviada!</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Sua solicitação de sorteio foi enviada para análise do time Sou Brasil. Você receberá uma notificação quando for aprovada!
        </p>
        <Button onClick={() => { setSubmitted(false); setSubView('list'); }} className="bg-primary">
          Ver Sorteios
        </Button>
      </div>
    );
  }

  // Preview before submit
  if (subView === 'preview') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setSubView('form')} className="gap-2">
            <X className="w-4 h-4" /> Editar
          </Button>
          <h2 className="font-bold">Prévia do Sorteio</h2>
        </div>
        <p className="text-xs text-muted-foreground">Assim é como o seu sorteio aparecerá para os usuários:</p>
        <Card className="overflow-hidden rounded-2xl">
          {form.image_url ? (
            <img src={form.image_url} alt="Sorteio" className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Trophy className="w-16 h-16 text-white opacity-60" />
            </div>
          )}
          <CardContent className="p-4 space-y-3">
            <div>
              <Badge className="bg-yellow-100 text-yellow-700 text-xs">{form.prize_type}</Badge>
              <h3 className="font-bold text-lg mt-1">Sorteio — {partner?.name}</h3>
              <p className="text-sm text-muted-foreground">{form.description}</p>
            </div>
            {form.draw_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(form.draw_date).toLocaleDateString('pt-BR')}
              </div>
            )}
            {form.redemption_conditions && (
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs font-medium">Condições de resgate:</p>
                <p className="text-xs text-muted-foreground mt-1">{form.redemption_conditions}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setSubView('form')} className="flex-1">Editar</Button>
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="flex-1 bg-primary">
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar para Análise
          </Button>
        </div>
      </div>
    );
  }

  if (subView === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setSubView('list')} size="sm">← Voltar</Button>
          <h2 className="font-bold">Solicitar Sorteio</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Imagem do Prêmio/Sorteio</label>
            {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl mb-2" />}
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 text-sm text-slate-500 hover:bg-slate-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Enviando...' : 'Clique para enviar imagem do produto/serviço'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
            <p className="text-xs text-slate-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              📐 <strong>Dimensão recomendada:</strong> 800 × 600 px (proporção 4:3) ou 1080 × 1080 px (quadrada). Formatos: JPG ou PNG. Máx: 5MB. Imagens nessa proporção ficam melhor na tela do sorteio.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Prêmio *</label>
            <select value={form.prize_type} onChange={e => set('prize_type', e.target.value)}
              className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              {prizeTypeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição do Sorteio *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none"
              placeholder="Descreva o objetivo, prêmio e alcance do sorteio..." />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Condições para Resgate do Prêmio *</label>
            <textarea value={form.redemption_conditions} onChange={e => set('redemption_conditions', e.target.value)} rows={2}
              className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none"
              placeholder="Ex: Apresentar o e-mail ganhador no estabelecimento em até 30 dias..." />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data e Hora do Sorteio *</label>
            <Input type="datetime-local" value={form.draw_date} onChange={e => set('draw_date', e.target.value)} className="rounded-xl" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Máximo de Participantes</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.unlimited_participants} onChange={e => set('unlimited_participants', e.target.checked)} />
                Ilimitado
              </label>
              {!form.unlimited_participants && (
                <Input type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} placeholder="Número máximo" className="flex-1 rounded-xl" />
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setSubView('list')} className="flex-1">Cancelar</Button>
          <Button onClick={() => setSubView('preview')} disabled={!form.description || !form.draw_date} className="flex-1 bg-primary">
            <Trophy className="w-4 h-4 mr-2" /> Visualizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* My requests */}
      {myRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">Minhas Solicitações</h3>
          {myRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-medium">{req.prize_type}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{req.description}</p>
              </div>
              <Badge className={`text-[10px] ${statusBadge[req.status]}`}>{req.status}</Badge>
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => setSubView('form')} className="w-full gap-2 bg-primary h-12 rounded-xl font-bold">
        <Plus className="w-5 h-5" /> Solicitar Novo Sorteio
      </Button>

      {/* Active raffles */}
      <section>
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" /> Sorteios Ativos na Plataforma
        </h2>
        {activeRaffles.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">Nenhum sorteio ativo no momento.</p>
        ) : (
          <div className="space-y-3">
            {activeRaffles.map(r => (
              <Card key={r.id} className="border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.prize}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.draw_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 text-[10px] shrink-0">Ativo</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {completedRaffles.length > 0 && (
        <section>
          <h2 className="font-bold text-sm mb-3 text-muted-foreground">Sorteios Encerrados</h2>
          <div className="space-y-2">
            {completedRaffles.slice(0, 5).map(r => (
              <Card key={r.id} className="border-border opacity-70">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.prize}</p>
                    {r.winner_user_name && <p className="text-xs text-primary">🏆 {r.winner_user_name}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">Encerrado</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}