import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerProfileEdit({ partner, partnerId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    phone: partner?.phone || '',
    discount_value: partner?.discount_value || '',
    discount_description: partner?.discount_description || '',
    opening_hours: partner?.opening_hours || '',
    instagram: partner?.instagram || '',
    facebook: partner?.facebook || '',
    tiktok: partner?.tiktok || '',
    youtube: partner?.youtube || '',
    website: partner?.website || '',
  });
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(partner?.image_url || '');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Partner.update(partnerId, { ...form, image_url: imageUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-partner', partnerId] });
      toast.success('Perfil atualizado com sucesso!');
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            📸 Foto do Estabelecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {imageUrl && (
            <img src={imageUrl} alt="Parceiro" className="w-full h-40 object-cover rounded-xl border" />
          )}
          <label className="flex items-center justify-center gap-2 cursor-pointer px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : 'Trocar Foto'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📞 Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Telefone</label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(41) 99999-9999" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Horário de Funcionamento</label>
            <Input value={form.opening_hours} onChange={e => set('opening_hours', e.target.value)} placeholder="Seg-Sex 08h-18h, Sáb 08h-12h" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🎁 Benefício</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Valor do Desconto</label>
            <Input value={form.discount_value} onChange={e => set('discount_value', e.target.value)} placeholder="Ex: 15% ou R$20" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descrição do Benefício</label>
            <textarea value={form.discount_description} onChange={e => set('discount_description', e.target.value)}
              rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Descreva detalhadamente o benefício para os clientes..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📲 Redes Sociais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ['instagram', '📷 Instagram', 'https://instagram.com/...'],
            ['facebook', '👍 Facebook', 'https://facebook.com/...'],
            ['tiktok', '🎵 TikTok', 'https://tiktok.com/@...'],
            ['youtube', '▶️ YouTube', 'https://youtube.com/@...'],
            ['website', '🌐 Site', 'https://seusite.com.br'],
          ].map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="text-xs text-slate-500 mb-1 block">{label}</label>
              <Input value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full gap-2 bg-primary hover:bg-primary/90">
        {saveMutation.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          : <><Save className="w-4 h-4" /> Salvar Alterações</>}
      </Button>
    </div>
  );
}