import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const audienceOptions = [
  ['todos', 'Todos os usuários'],
  ['premium', 'Todos Premium'],
  ['premium_anual', 'Premium Anual'],
  ['premium_mensal', 'Premium Mensal'],
  ['trial', 'Trial'],
  ['parceiros', 'Parceiros Comerciais'],
];

const prizeTypeOptions = [
  ['produto', 'Produto'],
  ['servico', 'Serviço'],
  ['voucher', 'Voucher / Vale'],
  ['dinheiro', 'Dinheiro'],
  ['viagem', 'Viagem'],
  ['desconto', 'Desconto Exclusivo'],
  ['outro', 'Outro'],
];

export default function RaffleFormModal({ raffle, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: raffle?.title || '',
    description: raffle?.description || '',
    prize: raffle?.prize || '',
    prize_type: raffle?.prize_type || 'produto',
    image_url: raffle?.image_url || '',
    draw_date: raffle?.draw_date ? raffle.draw_date.slice(0, 16) : '',
    status: raffle?.status || 'rascunho',
    target_audience: raffle?.target_audience || 'todos',
    filter_city: raffle?.filter_city || '',
    filter_state: raffle?.filter_state || '',
    filter_radius_km: raffle?.filter_radius_km || '',
    partner_id: raffle?.partner_id || '',
    partner_name: raffle?.partner_name || '',
    max_participants: raffle?.max_participants || '',
    unlimited_participants: raffle?.unlimited_participants !== false,
    automatic_draw: raffle?.automatic_draw || false,
    redemption_conditions: raffle?.redemption_conditions || '',
    display_order: raffle?.display_order || 0,
  });
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (raffle?.id) return base44.entities.Raffle.update(raffle.id, data);
      return base44.entities.Raffle.create(data);
    },
    onSuccess: () => { toast.success(raffle ? 'Sorteio atualizado!' : 'Sorteio criado!'); onSaved(); },
  });

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('image_url', file_url);
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!form.title || !form.prize || !form.draw_date) {
      toast.error('Preencha título, prêmio e data do sorteio.');
      return;
    }
    const data = {
      ...form,
      max_participants: form.unlimited_participants ? null : parseInt(form.max_participants) || null,
      filter_radius_km: form.filter_radius_km ? parseFloat(form.filter_radius_km) : null,
    };
    saveMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{raffle ? 'Editar Sorteio' : 'Novo Sorteio'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Imagem */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Imagem do Sorteio <span className="text-slate-400">(recomendado: 800x400px)</span></label>
            {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-xl mb-2" />}
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 text-sm text-slate-500 hover:bg-slate-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Enviando...' : 'Clique para enviar imagem'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: iPhone 15 Pro Max" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de Prêmio</label>
              <select value={form.prize_type} onChange={e => set('prize_type', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {prizeTypeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Prêmio *</label>
              <Input value={form.prize} onChange={e => set('prize', e.target.value)} placeholder="Descrição do prêmio" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                className="w-full rounded-md border border-input px-3 py-2 text-sm resize-none"
                placeholder="Descreva o sorteio..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data e Hora do Sorteio *</label>
              <Input type="datetime-local" value={form.draw_date} onChange={e => set('draw_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="rascunho">Rascunho</option>
                <option value="ativo">Ativo (visível)</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Público-Alvo</label>
              <select value={form.target_audience} onChange={e => set('target_audience', e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {audienceOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Ordem de Exibição</label>
              <Input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Filtrar por Cidade</label>
              <Input value={form.filter_city} onChange={e => set('filter_city', e.target.value)} placeholder="Ex: Curitiba" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Filtrar por Estado (UF)</label>
              <Input value={form.filter_state} onChange={e => set('filter_state', e.target.value)} placeholder="Ex: PR" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Raio de km (opcional)</label>
              <Input type="number" value={form.filter_radius_km} onChange={e => set('filter_radius_km', e.target.value)} placeholder="Ex: 10" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Parceiro Vinculado (ID)</label>
              <Input value={form.partner_id} onChange={e => set('partner_id', e.target.value)} placeholder="ID do parceiro" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Condições de Resgate</label>
              <textarea value={form.redemption_conditions} onChange={e => set('redemption_conditions', e.target.value)} rows={2}
                className="w-full rounded-md border border-input px-3 py-2 text-sm resize-none"
                placeholder="Descreva como o ganhador poderá resgatar o prêmio..." />
            </div>

            {/* Participants */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Máximo de Participantes</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.unlimited_participants} onChange={e => set('unlimited_participants', e.target.checked)} className="rounded" />
                  Ilimitado
                </label>
                {!form.unlimited_participants && (
                  <Input type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} placeholder="Número máximo" className="flex-1" />
                )}
              </div>
            </div>

            {/* Automatic draw */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sorteio Automático</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input type="checkbox" checked={form.automatic_draw} onChange={e => set('automatic_draw', e.target.checked)} className="rounded" />
                Realizar sorteio automaticamente na data configurada
              </label>
              {form.automatic_draw && (
                <p className="text-xs text-purple-600 mt-1">⚡ O sorteio será realizado automaticamente. O botão "Realizar" ficará desabilitado.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {raffle ? 'Salvar Alterações' : 'Criar Sorteio'}
          </Button>
        </div>
      </div>
    </div>
  );
}