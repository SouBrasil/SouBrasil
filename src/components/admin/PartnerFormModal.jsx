import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import OpeningHoursPicker from '@/components/common/OpeningHoursPicker';
import { maskCPF, maskCNPJ, maskPhone } from '@/utils/masks';

const categories = [
{ value: 'restaurante', label: '🍽️ Restaurante' },
{ value: 'lanchonete', label: '🍔 Lanchonete' },
{ value: 'pizzaria', label: '🍕 Pizzaria' },
{ value: 'sorveteria', label: '🍦 Sorveteria' },
{ value: 'padaria', label: '🥐 Padaria' },
{ value: 'barbearia', label: '💈 Barbearia' },
{ value: 'salao_beleza', label: '💇 Salão de Beleza' },
{ value: 'manicure', label: '💅 Manicure' },
{ value: 'spa', label: '🧖 Spa' },
{ value: 'clinica_estetica', label: '✨ Clínica de Estética' },
{ value: 'academia', label: '🏋️ Academia' },
{ value: 'saude', label: '💊 Saúde' },
{ value: 'odontologia', label: '🦷 Odontologia' },
{ value: 'psicologia', label: '🧠 Psicologia' },
{ value: 'petshop', label: '🐾 Pet Shop / Cuidados Pet' },
{ value: 'aviario', label: '🐦 Aviário' },
{ value: 'hortifruti', label: '🥦 Hortifruti' },
{ value: 'loja', label: '🛍️ Loja' },
{ value: 'conveniencia', label: '🏪 Loja de Conveniência' },
{ value: 'papelaria', label: '📝 Papelaria' },
{ value: 'mercado', label: '🛒 Mercado / Supermercado' },
{ value: 'farmacia', label: '💉 Farmácia' },
{ value: 'distribuidora_bebidas', label: '🍺 Distribuidora de Bebidas' },
{ value: 'materiais_construcao', label: '🧱 Materiais de Construção' },
{ value: 'automoveis', label: '🚗 Automóveis' },
{ value: 'loja_automoveis', label: '🏎️ Loja de Automóveis' },
{ value: 'oficina', label: '🔧 Oficina Mecânica' },
{ value: 'funilaria', label: '🔨 Funilaria' },
{ value: 'vidracaria', label: '🪟 Vidraçaria' },
{ value: 'borracharia', label: '🛞 Borracharia' },
{ value: 'assistencia_tecnica', label: '🔌 Assistência Técnica' },
{ value: 'servicos', label: '⚙️ Serviços Gerais' },
{ value: 'lavanderia', label: '👕 Lavanderia' },
{ value: 'fotografia', label: '📷 Fotografia' },
{ value: 'educacao', label: '📚 Educação' },
{ value: 'cursos', label: '🎓 Cursos Profissionalizantes' },
{ value: 'idiomas', label: '🌐 Escola de Idiomas' },
{ value: 'escola', label: '🏫 Escola' },
{ value: 'biblioteca', label: '📖 Biblioteca' },
{ value: 'entretenimento', label: '🎭 Entretenimento' },
{ value: 'lazer', label: '🎡 Lazer' },
{ value: 'viagens', label: '✈️ Viagens e Turismo' },
{ value: 'cinema', label: '🎬 Cinema' },
{ value: 'eventos', label: '🎉 Eventos' },
{ value: 'outro', label: '📦 Outro' }];


function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function SectionCard({ title, emoji, optional, children }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>{emoji}</span><span>{title}</span>
          {optional && <span className="text-xs font-normal text-muted-foreground">(opcional)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">{children}</CardContent>
    </Card>);

}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      
      {children}
    </div>);

}

function ImageUpload({ label, url, uploading, onFile, onRemove }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {url ?
      <div className="relative">
          <img src={url} alt="" className="w-full h-28 object-cover rounded-xl border" />
          <button onClick={onRemove} className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center">
            <X className="w-3 h-3" />
          </button>
        </div> :

      <>
          <input type="file" accept="image/*" className="hidden" id={`img-pfm-${label}`}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} disabled={uploading} />
          <label htmlFor={`img-pfm-${label}`}
        className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
            {uploading ?
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
          <><Upload className="w-5 h-5 mb-1 text-muted-foreground" /><p className="text-xs text-muted-foreground">Enviar imagem</p></>
          }
          </label>
        </>
      }
    </div>);

}

const EMPTY = {
  name: '', category: 'restaurante', description: '',
  discount_type: 'percentual', discount_value: '', discount_description: '',
  address: '', cep: '', street: '', number: '', neighborhood: '', city: '', state: '',
  latitude: null, longitude: null, phone: '', image_url: '',
  opening_hours: '', usage_limit: 1, unlimited_usage: false, active: true,
  instagram: '', facebook: '', tiktok: '', youtube: '', website: '',
  // acesso portal
  partner_email: '', cpf: '', cnpj: '', owner_name: '', whatsapp: ''
};

export default function PartnerFormModal({ partner, onClose, onSaved }) {
  const [form, setForm] = useState(partner ? {
    ...EMPTY, ...partner,
    partner_email: partner.partner_email || '',
    cpf: partner.cpf || '', cnpj: partner.cnpj || '',
    owner_name: partner.owner_name || '', whatsapp: partner.whatsapp || ''
  } : EMPTY);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const buildAddress = (f) => [f.street, f.number, f.neighborhood, f.city, f.state, f.cep].filter(Boolean).join(', ');

  const handleCEPBlur = async (cep) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json()).catch(() => null);
    if (res && !res.erro) {
      setForm(f => {
        const updated = {
          ...f,
          street: res.logradouro || f.street,
          neighborhood: res.bairro || f.neighborhood,
          city: res.localidade || f.city,
          state: res.uf || f.state,
        };
        updated.address = buildAddress(updated);
        return updated;
      });
    }
  };

  const handleImageUpload = async (file, field) => {
    const setUpl = field === 'image_url' ? setUploadingLogo : setUploadingPhoto;
    setUpl(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field, file_url);
    setUpl(false);
  };

  const getCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`).then(r => r.json());
          const addr = res.address || {};
          setForm(f => {
            const updated = {
              ...f,
              latitude: lat, longitude: lng,
              street: addr.road || addr.pedestrian || f.street,
              number: addr.house_number || f.number,
              neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || f.neighborhood,
              city: addr.city || addr.town || addr.village || f.city,
              state: addr.state_code || (addr.state ? addr.state.slice(0,2).toUpperCase() : f.state),
              cep: (addr.postcode || f.cep).replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2'),
            };
            updated.address = buildAddress(updated);
            return updated;
          });
          toast.success('Localização e endereço capturados!');
        } catch {
          toast.success('Localização capturada! Preencha o endereço manualmente.');
        }
      },
      () => toast.error('Não foi possível obter localização')
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isNew = !partner?.id;
      const defaultPassword = generatePassword();

      if (isNew) {
        // Cria o parceiro
        const created = await base44.entities.Partner.create({
          name: form.name, category: form.category, description: form.description,
          discount_type: form.discount_type, discount_value: form.discount_value,
          discount_description: form.discount_description, address: form.address,
          latitude: form.latitude || -15.7801, longitude: form.longitude || -47.9292,
          phone: form.phone, image_url: form.image_url, opening_hours: form.opening_hours,
          usage_limit: form.unlimited_usage ? 9999 : (form.usage_limit || 1),
          unlimited_usage: form.unlimited_usage, active: form.active,
          instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok,
          youtube: form.youtube, website: form.website
        });

        // Cria acesso de portal com senha padrão e flag must_change_password
        if (form.partner_email) {
          await base44.entities.PartnerAccess.create({
            partner_id: created.id,
            partner_name: form.name,
            email: form.partner_email,
            password_hash: defaultPassword,
            must_change_password: true,
            active: true
          });

          // Envia e-mail com senha padrão
          setSendingEmail(true);
          await base44.integrations.Core.SendEmail({
            to: form.partner_email,
            subject: '🎉 Bem-vindo ao Portal Parceiro Sou Brasil!',
            body: `
Olá, ${form.owner_name || form.name}!

Seu cadastro como Parceiro Comercial da Sou Brasil foi aprovado! 🎊

Acesse o portal do parceiro com as credenciais abaixo:

📧 E-mail: ${form.partner_email}
🔑 Senha provisória: ${defaultPassword}

⚠️ IMPORTANTE: No seu primeiro acesso, você será solicitado a criar uma senha pessoal.

Acesse o portal em: ${window.location.origin}/PartnerPortal

Qualquer dúvida, entre em contato com nossa equipe pelo WhatsApp.

Seja bem-vindo à família Sou Brasil! 💚

— Equipe Clube Sou Brasil
            `.trim()
          });
          setSendingEmail(false);
        }
      } else {
        await base44.entities.Partner.update(partner.id, {
          name: form.name, category: form.category, description: form.description,
          discount_type: form.discount_type, discount_value: form.discount_value,
          discount_description: form.discount_description, address: form.address,
          latitude: form.latitude, longitude: form.longitude,
          phone: form.phone, image_url: form.image_url, opening_hours: form.opening_hours,
          usage_limit: form.unlimited_usage ? 9999 : (form.usage_limit || 1),
          unlimited_usage: form.unlimited_usage, active: form.active,
          instagram: form.instagram, facebook: form.facebook, tiktok: form.tiktok,
          youtube: form.youtube, website: form.website
        });
      }
    },
    onSuccess: () => {
      toast.success(partner?.id ? 'Parceiro atualizado!' : 'Parceiro criado e e-mail enviado!');
      onSaved();
    },
    onError: () => toast.error('Erro ao salvar parceiro')
  });

  const isValid = form.name && form.discount_value && form.address && form.category;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="bg-background w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="sticky top-0 bg-background px-4 py-4 border-b flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl shrink-0">
          <div>
            <h2 className="font-black text-base">{partner ? 'Editar Parceiro' : 'Cadastrar Parceiro'}</h2>
            <p className="text-xs text-muted-foreground">Cadastro completo via painel administrativo</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

          {/* Aviso */}
          {!partner &&
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
              <p className="text-xs text-green-800">
                Ao cadastrar um parceiro pelo painel, um e-mail será enviado automaticamente com a senha de acesso ao Portal Parceiro. No primeiro acesso, o parceiro precisará criar uma senha pessoal.
              </p>
            </div>
          }

          {/* 1. Dados do Comércio */}
          <SectionCard title="1. Dados do Comércio" emoji="🏪">
            <Field label="Nome do comércio (obrigatório)">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Restaurante Sabor Brasileiro" />
            </Field>
            <Field label="Nome do responsável">
              <Input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} placeholder="Nome completo do responsável" />
            </Field>
            <Field label="Segmento (obrigatório)">
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                <SelectContent className="z-[300] max-h-64 overflow-y-auto">
                  {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CPF">
                <Input value={form.cpf} onChange={(e) => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
              </Field>
              <Field label="CNPJ">
                <Input value={form.cnpj} onChange={(e) => set('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0001-00" inputMode="numeric" />
              </Field>
            </div>
            <Field label="Descrição do estabelecimento">
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Breve descrição do comércio..." />
            </Field>
          </SectionCard>

          {/* 2. Contato */}
          <SectionCard title="2. Contato" emoji="📞">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Telefone">
                <Input value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric" />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => set('whatsapp', maskPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric" />
              </Field>
            </div>
            <Field label="E-mail do parceiro (para acesso ao portal)">
              <Input type="email" value={form.partner_email} onChange={(e) => set('partner_email', e.target.value)} placeholder="parceiro@email.com" />
              {form.partner_email && !partner &&
              <p className="text-[10px] text-green-700 bg-green-50 rounded px-2 py-1 mt-1">
                  📧 Senha provisória será enviada para este e-mail
                </p>
              }
            </Field>
            <Field label="Horário de Funcionamento">
              <OpeningHoursPicker value={form.opening_hours} onChange={(v) => set('opening_hours', v)} />
            </Field>
          </SectionCard>

          {/* 3. Localização */}
          <SectionCard title="3. Localização" emoji="📍">
            <Button type="button" variant="outline" className="w-full" onClick={getCurrentLocation}>
              <MapPin className="w-4 h-4 mr-2" /> Capturar localização atual (GPS)
            </Button>
            {form.latitude &&
            <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2 text-center">
                📍 Coordenadas: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
              </p>
            }
            <div className="grid grid-cols-2 gap-2">
              <Field label="CEP">
                <Input value={form.cep} onChange={(e) => set('cep', e.target.value)}
                  onBlur={(e) => handleCEPBlur(e.target.value)}
                  placeholder="00000-000" inputMode="numeric" />
              </Field>
              <Field label="Número">
                <Input value={form.number} onChange={(e) => { const v = e.target.value; setForm(f => { const u = {...f, number: v}; u.address = buildAddress(u); return u; }); }} placeholder="123" />
              </Field>
            </div>
            <Field label="Rua / Logradouro (obrigatório)">
              <Input value={form.street} onChange={(e) => { const v = e.target.value; setForm(f => { const u = {...f, street: v}; u.address = buildAddress(u); return u; }); }} placeholder="Rua das Flores" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bairro">
                <Input value={form.neighborhood} onChange={(e) => { const v = e.target.value; setForm(f => { const u = {...f, neighborhood: v}; u.address = buildAddress(u); return u; }); }} placeholder="Centro" />
              </Field>
              <Field label="Estado (UF)">
                <Input value={form.state} onChange={(e) => { const v = e.target.value; setForm(f => { const u = {...f, state: v}; u.address = buildAddress(u); return u; }); }} placeholder="PR" maxLength={2} />
              </Field>
            </div>
            <Field label="Cidade">
              <Input value={form.city} onChange={(e) => { const v = e.target.value; setForm(f => { const u = {...f, city: v}; u.address = buildAddress(u); return u; }); }} placeholder="Curitiba" />
            </Field>
            {form.address && <p className="text-xs text-muted-foreground bg-primary/5 rounded-lg p-2">📌 Endereço: {form.address}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude (manual)">
                <Input type="number" value={form.latitude || ''} onChange={(e) => set('latitude', parseFloat(e.target.value))} placeholder="-25.00000" />
              </Field>
              <Field label="Longitude (manual)">
                <Input type="number" value={form.longitude || ''} onChange={(e) => set('longitude', parseFloat(e.target.value))} placeholder="-49.00000" />
              </Field>
            </div>
          </SectionCard>

          {/* 4. Benefício */}
          <SectionCard title="4. Benefício Oferecido" emoji="🎁">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tipo de Desconto">
                <Select value={form.discount_type} onValueChange={(v) => set('discount_type', v)}>
                  <SelectTrigger className="bg-transparent px-3 py-2 text-sm text-left rounded-md flex h-9 w-full items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="beneficio_especial">Benefício Especial</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor do Desconto (obrigatório)">
                <Input value={form.discount_value} onChange={(e) => set('discount_value', e.target.value)} placeholder="ex: 15% ou R$20" />
              </Field>
            </div>
            <Field label="Descrição detalhada do benefício">
              <Textarea value={form.discount_description} onChange={(e) => set('discount_description', e.target.value)} rows={3}
              placeholder="Ex: 15% de desconto em toda compra acima de R$50 para clientes Sou Brasil..." />
            </Field>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quantidade de Uso Diário do Benefício (obrigatório)</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('unlimited_usage', !form.unlimited_usage)}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.unlimited_usage ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.unlimited_usage ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm">{form.unlimited_usage ? '♾️ Uso ilimitado' : 'Limitado por dia'}</span>
              </div>
              {!form.unlimited_usage &&
                <Input type="number" min={1} value={form.usage_limit} onChange={(e) => set('usage_limit', parseInt(e.target.value) || 1)} placeholder="Mínimo 1" />
              }
            </div>
          </SectionCard>

          {/* 5. Imagens */}
          <SectionCard title="5. Imagens" emoji="📸">
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              ⭐ Imagens de qualidade aumentam a confiança e atraem mais clientes.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ImageUpload label="Logo / Foto Principal *"
              url={form.image_url} uploading={uploadingLogo}
              onFile={(f) => handleImageUpload(f, 'image_url')}
              onRemove={() => set('image_url', '')} />
              <ImageUpload label="Foto da Fachada"
              url={form.business_photo_url} uploading={uploadingPhoto}
              onFile={(f) => handleImageUpload(f, 'business_photo_url')}
              onRemove={() => set('business_photo_url', '')} />
            </div>
          </SectionCard>

          {/* 6. Redes Sociais */}
          <SectionCard title="6. Redes Sociais" emoji="📲" optional>
            <div className="grid grid-cols-1 gap-2">
              <Field label="Instagram">
                <Input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/seuperfil" />
              </Field>
              <Field label="Facebook">
                <Input value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/seuperfil" />
              </Field>
              <Field label="TikTok">
                <Input value={form.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="https://tiktok.com/@seuperfil" />
              </Field>
              <Field label="YouTube">
                <Input value={form.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="https://youtube.com/@seucanal" />
              </Field>
              <Field label="Site">
                <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://seusite.com.br" />
              </Field>
            </div>
          </SectionCard>

          {/* Status */}
          <SectionCard title="7. Status" emoji="⚙️">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Parceiro ativo</p>
                <p className="text-xs text-muted-foreground">Parceiros ativos aparecem no app para os clientes</p>
              </div>
              <button type="button" onClick={() => set('active', !form.active)}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t bg-background">
          {!isValid && <p className="text-xs text-destructive text-center mb-2">Preencha: nome, segmento, desconto e endereço</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12">Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!isValid || saveMutation.isPending || sendingEmail}
              className="flex-1 h-12 font-bold bg-green-600 hover:bg-green-700">
              {saveMutation.isPending || sendingEmail ?
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />{sendingEmail ? 'Enviando e-mail...' : 'Salvando...'}</> :
              <><CheckCircle2 className="w-4 h-4 mr-2" />{partner ? 'Salvar Alterações' : 'Cadastrar Parceiro'}</>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>);

}