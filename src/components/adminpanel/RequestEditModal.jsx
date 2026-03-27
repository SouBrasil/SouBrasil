import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Loader2, Upload, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'restaurante','lanchonete','pizzaria','sorveteria','padaria','loja','conveniencia',
  'papelaria','materiais_construcao','distribuidora_bebidas','mercado','farmacia',
  'petshop','aviario','hortifruti','servicos','assistencia_tecnica','oficina',
  'lavanderia','fotografia','saude','clinica_estetica','odontologia','psicologia',
  'academia','beleza','barbearia','salao_beleza','manicure','spa','educacao',
  'cursos','idiomas','escola','biblioteca','entretenimento','lazer','viagens',
  'cinema','eventos','automoveis','loja_automoveis','funilaria','vidracaria',
  'borracharia','outro'
];

function FieldInput({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <Label className="text-xs font-semibold">{label}</Label>
      <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} className="mt-1 text-sm" />
    </div>
  );
}

function TextAreaInput({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <Label className="text-xs font-semibold">{label}</Label>
      <textarea
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function ImageUploadField({ label, value, onUpload, onDelete, onUrlChange, uploading }) {
  return (
    <div>
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="mt-1 space-y-2">
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="w-full h-32 object-cover rounded-lg border" />
            <button type="button" onClick={onDelete}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-full h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
            <Image className="w-6 h-6" />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {value ? 'Substituir imagem' : 'Enviar imagem'}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
        {value && <Input value={value} onChange={onUrlChange} placeholder="URL da imagem" className="text-xs" />}
      </div>
    </div>
  );
}

export default function RequestEditModal({ request, onClose, onSaved }) {
  const [form, setForm] = useState({ ...request });
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const qc = useQueryClient();

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleUploadImage = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set(field, file_url);
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.PartnerRequest.update(request.id, {
        business_name: form.business_name,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        cpf: form.cpf,
        cnpj: form.cnpj,
        phone: form.phone,
        whatsapp: form.whatsapp,
        category: form.category,
        address: form.address,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
        benefit_description: form.benefit_description,
        discount_value: form.discount_value,
        logo_url: form.logo_url,
        business_photo_url: form.business_photo_url,
        instagram: form.instagram,
        facebook: form.facebook,
        tiktok: form.tiktok,
        youtube: form.youtube,
        website: form.website,
        notes: form.notes,
        revision_notes: form.revision_notes,
      });
      qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
      toast.success('Solicitação atualizada!');
      onSaved({ ...form });
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // helper wrappers para passar state sem perder foco (sem definir componentes inline)

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-black text-lg">✏️ Editar Solicitação</h2>
            <p className="text-xs text-slate-500 mt-0.5">{request.business_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Dados do responsável */}
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">👤 Responsável</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldInput label="Nome do Comércio" value={form.business_name} onChange={e => set('business_name', e.target.value)} />
              <FieldInput label="Nome do Responsável" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
              <FieldInput label="E-mail" type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
              <FieldInput label="Telefone" value={form.phone} onChange={e => set('phone', e.target.value)} />
              <FieldInput label="WhatsApp" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
              <FieldInput label="CPF" value={form.cpf} onChange={e => set('cpf', e.target.value)} />
              <FieldInput label="CNPJ" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
            </div>
          </section>

          {/* Categoria e endereço */}
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📍 Localização</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Categoria</Label>
                <select
                  value={form.category || ''}
                  onChange={e => set('category', e.target.value)}
                  className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <FieldInput label="Endereço" value={form.address} onChange={e => set('address', e.target.value)} />
              <FieldInput label="Latitude" type="number" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
              <FieldInput label="Longitude" type="number" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
            </div>
          </section>

          {/* Benefício */}
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🎁 Benefício</p>
            <div className="space-y-3">
              <TextAreaInput label="Descrição do Benefício" value={form.benefit_description} onChange={e => set('benefit_description', e.target.value)} />
              <FieldInput label="Valor do Desconto (ex: 15%, R$10)" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} />
            </div>
          </section>

          {/* Imagens */}
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🖼️ Imagens</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Logo / Foto Principal"
                value={form.logo_url}
                onUpload={e => handleUploadImage('logo_url', e.target.files[0])}
                onDelete={() => set('logo_url', '')}
                onUrlChange={e => set('logo_url', e.target.value)}
                uploading={uploadingField === 'logo_url'}
              />
              <ImageUploadField
                label="Foto do Estabelecimento"
                value={form.business_photo_url}
                onUpload={e => handleUploadImage('business_photo_url', e.target.files[0])}
                onDelete={() => set('business_photo_url', '')}
                onUrlChange={e => set('business_photo_url', e.target.value)}
                uploading={uploadingField === 'business_photo_url'}
              />
            </div>
          </section>

          {/* Redes sociais */}
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🔗 Redes Sociais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldInput label="Instagram" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
              <FieldInput label="Facebook" value={form.facebook} onChange={e => set('facebook', e.target.value)} placeholder="https://facebook.com/..." />
              <FieldInput label="TikTok" value={form.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="https://tiktok.com/..." />
              <FieldInput label="YouTube" value={form.youtube} onChange={e => set('youtube', e.target.value)} placeholder="https://youtube.com/..." />
              <FieldInput label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
            </div>
          </section>

          {/* Observações */}
          <section>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📋 Observações</p>
            <div className="space-y-3">
              <TextAreaInput label="Observações internas" value={form.notes} onChange={e => set('notes', e.target.value)} />
              <TextAreaInput label="Notas de revisão (visível ao parceiro)" value={form.revision_notes} onChange={e => set('revision_notes', e.target.value)} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 font-bold">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : '💾 Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}