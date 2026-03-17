import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const categories = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'loja', label: 'Loja' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'saude', label: 'Saúde' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'educacao', label: 'Educação' },
  { value: 'entretenimento', label: 'Entretenimento' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'outro', label: 'Outro' },
];

export default function PartnerFormModal({ partner, onClose, onSaved }) {
  const [form, setForm] = useState(partner || {
    name: '', category: 'restaurante', description: '', discount_type: 'percentual',
    discount_value: '', discount_description: '', address: '', latitude: -15.7801,
    longitude: -47.9292, phone: '', image_url: '', opening_hours: '', usage_limit: 1, active: true,
  });
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (partner?.id) {
        await base44.entities.Partner.update(partner.id, form);
      } else {
        await base44.entities.Partner.create(form);
      }
    },
    onSuccess: onSaved,
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const f = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card px-4 py-4 border-b border-border flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="font-bold text-base">{partner ? 'Editar Parceiro' : 'Novo Parceiro'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Image upload */}
          <div className="flex items-center gap-3">
            {form.image_url ? (
              <img src={form.image_url} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <label className="flex-1">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? 'Enviando...' : 'Upload de Imagem'}
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          <div>
            <Label className="text-xs">Ou URL da imagem</Label>
            <Input value={form.image_url} onChange={(e) => f('image_url', e.target.value)} placeholder="https://..." className="mt-1" />
          </div>

          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={form.name} onChange={(e) => f('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Categoria *</Label>
            <Select value={form.category} onValueChange={(v) => f('category', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={(e) => f('description', e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tipo de Desconto</Label>
              <Select value={form.discount_type} onValueChange={(v) => f('discount_type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual</SelectItem>
                  <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                  <SelectItem value="beneficio_especial">Benefício Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor do Desconto *</Label>
              <Input value={form.discount_value} onChange={(e) => f('discount_value', e.target.value)} placeholder="ex: 15%" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição do Benefício</Label>
            <Input value={form.discount_description} onChange={(e) => f('discount_description', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Endereço *</Label>
            <Input value={form.address} onChange={(e) => f('address', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input type="number" value={form.latitude} onChange={(e) => f('latitude', parseFloat(e.target.value))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input type="number" value={form.longitude} onChange={(e) => f('longitude', parseFloat(e.target.value))} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone} onChange={(e) => f('phone', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Limite Diário</Label>
              <Input type="number" min={1} value={form.usage_limit} onChange={(e) => f('usage_limit', parseInt(e.target.value))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Horário de Funcionamento</Label>
            <Input value={form.opening_hours} onChange={(e) => f('opening_hours', e.target.value)} placeholder="Seg-Sex 08h-18h" className="mt-1" />
          </div>
          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={!form.name || !form.discount_value || !form.address || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Salvando...' : partner ? 'Salvar Alterações' : 'Criar Parceiro'}
          </Button>
        </div>
      </div>
    </div>
  );
}