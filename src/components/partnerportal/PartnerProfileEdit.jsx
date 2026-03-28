import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Save, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { value: 'restaurante', label: '🍽️ Restaurante' }, { value: 'lanchonete', label: '🍔 Lanchonete' },
  { value: 'pizzaria', label: '🍕 Pizzaria' }, { value: 'sorveteria', label: '🍦 Sorveteria' },
  { value: 'padaria', label: '🥐 Padaria' }, { value: 'barbearia', label: '💈 Barbearia' },
  { value: 'salao_beleza', label: '💇 Salão de Beleza' }, { value: 'manicure', label: '💅 Manicure' },
  { value: 'spa', label: '🧖 Spa' }, { value: 'clinica_estetica', label: '✨ Clínica Estética' },
  { value: 'academia', label: '🏋️ Academia' }, { value: 'saude', label: '💊 Saúde' },
  { value: 'odontologia', label: '🦷 Odontologia' }, { value: 'psicologia', label: '🧠 Psicologia' },
  { value: 'petshop', label: '🐾 Pet Shop' }, { value: 'farmacia', label: '💉 Farmácia' },
  { value: 'mercado', label: '🛒 Mercado' }, { value: 'loja', label: '🛍️ Loja' },
  { value: 'servicos', label: '⚙️ Serviços' }, { value: 'oficina', label: '🔧 Oficina' },
  { value: 'assistencia_tecnica', label: '🔌 Assistência Técnica' }, { value: 'outro', label: '📦 Outro' },
];

const statusMap = {
  pendente: { label: '⏳ Em análise pela Sou Brasil', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  em_revisao: { label: '📝 Devolvida para correção', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  aprovado: { label: '✅ Alterações aprovadas', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  recusado: { label: '❌ Alterações não aprovadas', color: 'bg-red-100 text-red-700', icon: X },
};

export default function PartnerProfileEdit({ partner, partnerId, partnerAccess }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    business_name: partner?.name || '',
    category: partner?.category || '',
    phone: partner?.phone || '',
    whatsapp: partner?.phone || '',
    discount_type: partner?.discount_type || 'beneficio_especial',
    discount_value: partner?.discount_value || '',
    benefit_description: partner?.discount_description || '',
    redemption_conditions: '',
    opening_hours: partner?.opening_hours || '',
    instagram: partner?.instagram || '',
    facebook: partner?.facebook || '',
    tiktok: partner?.tiktok || '',
    youtube: partner?.youtube || '',
    website: partner?.website || '',
  });
  const [imageUrl, setImageUrl] = useState(partner?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // Fetch latest profile update request for this partner
  const { data: requests = [] } = useQuery({
    queryKey: ['partner-profile-requests', partnerAccess?.email],
    queryFn: async () => {
      const all = await base44.entities.PartnerRequest.list('-created_date', 50);
      return all.filter(r => r.owner_email === partnerAccess?.email && r.is_profile_update === true);
    },
    enabled: !!partnerAccess?.email,
  });

  const latestUpdateRequest = requests[0] || null;
  const latestStatus = latestUpdateRequest?.status;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success('Imagem enviada!');
    } catch { toast.error('Erro ao enviar imagem'); }
    setUploading(false);
  };

  const handleSubmitChanges = async () => {
    setSubmitting(true);
    try {
      await base44.entities.PartnerRequest.create({
        business_name: form.business_name,
        owner_name: partnerAccess?.partner_name || form.business_name,
        owner_email: partnerAccess?.email || '',
        whatsapp: form.whatsapp || form.phone,
        phone: form.phone,
        category: form.category,
        address: partner?.address || '',
        latitude: partner?.latitude || 0,
        longitude: partner?.longitude || 0,
        benefit_description: form.benefit_description,
        discount_value: form.discount_value,
        redemption_conditions: form.redemption_conditions,
        logo_url: imageUrl,
        business_photo_url: imageUrl,
        instagram: form.instagram,
        facebook: form.facebook,
        tiktok: form.tiktok,
        youtube: form.youtube,
        website: form.website,
        opening_hours: form.opening_hours,
        status: 'pendente',
        is_profile_update: true,
        existing_partner_id: partnerId,
        notes: `[ATUALIZAÇÃO DE PERFIL] Solicitada pelo parceiro ${partnerAccess?.email}`,
      });
      qc.invalidateQueries({ queryKey: ['partner-profile-requests'] });
      toast.success('Alterações enviadas! A equipe Sou Brasil analisará em até 30 dias.');
      setShowConfirm(false);
    } catch (err) {
      toast.error('Erro ao enviar alterações: ' + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">

      {/* Status da última solicitação de atualização */}
      {latestUpdateRequest && (
        <Card className={`border-2 ${latestStatus === 'aprovado' ? 'border-green-300' : latestStatus === 'recusado' ? 'border-red-300' : 'border-yellow-300'}`}>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-600 mb-1">📋 Status da sua última solicitação de alteração:</p>
            <Badge className={`text-xs ${statusMap[latestStatus]?.color || 'bg-slate-100 text-slate-700'}`}>
              {statusMap[latestStatus]?.label || latestStatus}
            </Badge>
            {latestUpdateRequest.revision_notes && (
              <p className="text-xs text-orange-600 mt-2 bg-orange-50 rounded p-2">{latestUpdateRequest.revision_notes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Enviada em {new Date(latestUpdateRequest.created_date).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">📸 Foto do Estabelecimento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {imageUrl && <img src={imageUrl} alt="Parceiro" className="w-full h-40 object-cover rounded-xl border" />}
          <label className="flex items-center justify-center gap-2 cursor-pointer px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : 'Trocar Foto'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">🏪 Dados do Comércio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nome do Comércio</label>
            <Input value={form.business_name} onChange={e => set('business_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Segmento</label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">📞 Contato</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Telefone</label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(41) 99999-9999" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">WhatsApp</label>
            <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(41) 99999-9999" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Horário de Funcionamento</label>
            <Input value={form.opening_hours} onChange={e => set('opening_hours', e.target.value)} placeholder="Seg-Sex 08h-18h, Sáb 08h-12h" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">🎁 Benefício</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo de Desconto</label>
            <Select value={form.discount_type} onValueChange={v => set('discount_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                <SelectItem value="beneficio_especial">Benefício Especial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Valor do Desconto</label>
            <Input value={form.discount_value} onChange={e => set('discount_value', e.target.value)} placeholder="Ex: 15% ou R$20" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descrição do Benefício</label>
            <textarea value={form.benefit_description} onChange={e => set('benefit_description', e.target.value)}
              rows={3} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Descreva detalhadamente o benefício..." />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Regras de Resgate</label>
            <textarea value={form.redemption_conditions} onChange={e => set('redemption_conditions', e.target.value)}
              rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Realize o resgate do cupom dourado na hora do pagamento para demonstrar que está ativo como membro do Clube SOU Brasil." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">📲 Redes Sociais</CardTitle></CardHeader>
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

      <Button onClick={() => setShowConfirm(true)} className="w-full gap-2 bg-primary hover:bg-primary/90">
        <Save className="w-4 h-4" /> Salvar Alterações
      </Button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="font-black text-lg text-slate-800">Enviar para Análise?</h3>
            <p className="text-sm text-slate-600">
              Suas alterações serão encaminhadas para o time da Sou Brasil, que terá até 30 dias para analisá-las. Deseja continuar?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSubmitChanges} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar para Análise'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}