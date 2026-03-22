import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getDeviceInfo } from '@/lib/deviceFingerprint';
import DuplicateRegisterModal from '@/components/common/DuplicateRegisterModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Store, Upload, Loader2, MapPin, X, CheckCircle2,
  Instagram, Youtube, Globe, AlertCircle, MessageCircle } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PartnerServiceButtons from '@/components/partners/PartnerServiceButtons';
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
{ value: 'loja', label: '🛍️ Loja' },
{ value: 'conveniencia', label: '🏪 Loja de Conveniência' },
{ value: 'papelaria', label: '📝 Papelaria' },
{ value: 'mercado', label: '🛒 Mercado / Supermercado' },
{ value: 'hortifruti', label: '🥦 Hortifruti' },
{ value: 'farmacia', label: '💉 Farmácia' },
{ value: 'distribuidora_bebidas', label: '🍺 Distribuidora de Bebidas' },
{ value: 'materiais_construcao', label: '🧱 Materiais de Construção' },
{ value: 'automoveis', label: '🚗 Automóveis' },
{ value: 'loja_automoveis', label: '🏎️ Loja de Automóveis' },
{ value: 'oficina', label: '🔧 Oficina Mecânica' },
{ value: 'funilaria', label: '🔨 Funilaria' },
{ value: 'borracharia', label: '🛞 Borracharia' },
{ value: 'assistencia_tecnica', label: '🔌 Assistência Técnica' },
{ value: 'servicos', label: '⚙️ Serviços Gerais' },
{ value: 'lavanderia', label: '👕 Lavanderia' },
{ value: 'educacao', label: '📚 Educação' },
{ value: 'cursos', label: '🎓 Cursos Profissionalizantes' },
{ value: 'idiomas', label: '🌐 Escola de Idiomas' },
{ value: 'entretenimento', label: '🎭 Entretenimento' },
{ value: 'lazer', label: '🎡 Lazer' },
{ value: 'viagens', label: '✈️ Viagens e Turismo' },
{ value: 'cinema', label: '🎬 Cinema' },
{ value: 'eventos', label: '🎉 Eventos' },
{ value: 'fotografia', label: '📷 Fotografia' },
{ value: 'outro', label: '📦 Outro' }];


const WHATSAPP_NUMBER = '5541996179617';

const EMPTY_FORM = {
  business_name: '', owner_name: '', owner_email: '', cpf: '', cnpj: '',
  phone: '', whatsapp: '', category: '', address: '', latitude: null, longitude: null,
  cep: '', street: '', number: '', neighborhood: '', city: '', state: '',
  benefit_description: '', discount_value: '', discount_type: 'percentual',
  usage_limit: 1, unlimited_usage: false,
  logo_url: '', business_photo_url: '',
  instagram: '', facebook: '', tiktok: '', youtube: '', website: '',
  opening_hours: '', notes: ''
};

function buildAddress(f) {
  return [f.street, f.number, f.neighborhood, f.city, f.state, f.cep].filter(Boolean).join(', ');
}

function isFormValid(f) {
  return (
    f.business_name.trim() && f.owner_name.trim() && f.owner_email.trim() &&
    f.cpf.trim() && f.cnpj.trim() && f.phone.trim() && f.whatsapp.trim() &&
    f.category && f.street.trim() && f.city.trim() && f.benefit_description.trim() &&
    f.discount_value.trim() && f.discount_type && (
    f.logo_url || f.business_photo_url));
}

export default function BecomePartner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  const referralType = searchParams.get('type') || 'partner';
  const [step, setStep] = useState('tip'); // tip | form | confirm | countdown | done
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleCEPBlur = async (cep) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`).then((r) => r.json()).catch(() => null);
    if (res && !res.erro) {
      setFormData((f) => {
        const updated = {
          ...f,
          street: res.logradouro || f.street,
          neighborhood: res.bairro || f.neighborhood,
          city: res.localidade || f.city,
          state: res.uf || f.state
        };
        updated.address = buildAddress(updated);
        return updated;
      });
    }
  };

  const handleFileUpload = async (file, field) => {
    const setUploading = field === 'logo_url' ? setUploadingLogo : setUploadingPhoto;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      set(field, result.file_url);
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const getCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData((f) => ({ ...f, latitude: lat, longitude: lng }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`).then((r) => r.json());
          const addr = res.address || {};
          setFormData((f) => {
            const updated = {
              ...f,
              latitude: lat, longitude: lng,
              street: addr.road || addr.pedestrian || f.street,
              number: addr.house_number || f.number,
              neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || f.neighborhood,
              city: addr.city || addr.town || addr.village || f.city,
              state: addr.state_code || (addr.state ? addr.state.slice(0, 2).toUpperCase() : f.state),
              cep: (addr.postcode || f.cep).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')
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

  const handleConfirm = async () => {
    setLoading(true);

    // Verificação de CPF duplicado
    const cpfClean = formData.cpf.replace(/\D/g, '');
    if (cpfClean) {
      const byCpf = await base44.entities.PartnerRequest.filter({ cpf: formData.cpf });
      if (byCpf.length > 0) {
        setLoading(false);
        setDuplicateInfo({ type: 'cpf', value: formData.cpf });
        return;
      }
    }

    // Verificação de CNPJ duplicado
    const cnpjClean = formData.cnpj.replace(/\D/g, '');
    if (cnpjClean) {
      const byCnpj = await base44.entities.PartnerRequest.filter({ cnpj: formData.cnpj });
      if (byCnpj.length > 0) {
        setLoading(false);
        setDuplicateInfo({ type: 'cnpj', value: formData.cnpj });
        return;
      }
    }

    const deviceInfo = await getDeviceInfo();

    try {
      await base44.entities.PartnerRequest.create({
        business_name: formData.business_name,
        owner_name: formData.owner_name,
        owner_email: formData.owner_email,
        whatsapp: formData.whatsapp,
        category: formData.category,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        benefit_description: formData.benefit_description,
        discount_value: formData.discount_value,
        usage_limit: formData.unlimited_usage ? 9999 : formData.usage_limit || 1,
        logo_url: formData.logo_url,
        business_photo_url: formData.business_photo_url,
        opening_hours: formData.opening_hours,
        cpf: formData.cpf,
        cnpj: formData.cnpj,
        notes: [
        formData.phone ? `Tel: ${formData.phone}` : '',
        formData.instagram ? `Instagram: ${formData.instagram}` : '',
        formData.facebook ? `Facebook: ${formData.facebook}` : '',
        formData.tiktok ? `TikTok: ${formData.tiktok}` : '',
        formData.youtube ? `YouTube: ${formData.youtube}` : '',
        formData.website ? `Site: ${formData.website}` : '',
        formData.notes,
        `[Dispositivo] IP: ${deviceInfo.reg_ip || 'N/A'} | ${deviceInfo.reg_city_ip || ''}, ${deviceInfo.reg_region || ''} | ${deviceInfo.reg_platform || ''} | ${deviceInfo.reg_user_agent?.slice(0,80) || ''}`,
        referralCode ? `[Indicação] ref=${referralCode} type=${referralType}` : '',
        ].filter(Boolean).join('\n'),
        status: 'pendente',
      });
      setStep('countdown');
      let c = 30;
      setCountdown(c);
      const interval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(interval);
          setStep('done');
        }
      }, 1000);
    } catch {
      toast.error('Erro ao enviar cadastro');
    } finally {
      setLoading(false);
    }
  };

  // --- DUPLICATE MODAL ---
  if (duplicateInfo) {
    return (
      <DuplicateRegisterModal
        type={duplicateInfo.type}
        value={duplicateInfo.value}
        name={formData.owner_name}
        email={formData.owner_email}
        onClose={() => setDuplicateInfo(null)}
      />
    );
  }

  // --- TIP SCREEN ---
  if (step === 'tip') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #0d3320, #145a32)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <AlertCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-3">Dica importante!</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Quanto mais completo for o seu cadastro, maiores são as chances de atrair clientes e aumentar suas vendas dentro da Sou Brasil.
          </p>
          <Button onClick={() => setStep('form')} className="w-full h-12 text-base font-bold">
            Entendi — Vamos lá!
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            
            Voltar
          </button>
        </motion.div>
      </div>);

  }

  // --- CONFIRM SCREEN ---
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-background p-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6 mt-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('form')}>
              <X className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-black">Revisão dos Dados</h1>
          </div>
          <Card className="mb-4">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Comércio:</span><span className="font-semibold">{formData.business_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Responsável:</span><span className="font-semibold">{formData.owner_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">E-mail:</span><span className="font-semibold">{formData.owner_email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">WhatsApp:</span><span className="font-semibold">{formData.whatsapp}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Segmento:</span><span className="font-semibold">{formData.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Endereço:</span><span className="font-semibold text-right max-w-[60%]">{formData.address}</span></div>
            </CardContent>
          </Card>
          <Card className="mb-4">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">BENEFÍCIO OFERECIDO</p>
              <p className="text-sm font-semibold">{formData.benefit_description}</p>
            </CardContent>
          </Card>
          {(formData.logo_url || formData.business_photo_url) &&
          <div className="flex gap-3 mb-4">
              {formData.logo_url && <img src={formData.logo_url} className="w-20 h-20 rounded-xl object-cover border" alt="Logo" />}
              {formData.business_photo_url && <img src={formData.business_photo_url} className="flex-1 h-20 rounded-xl object-cover border" alt="Fachada" />}
            </div>
          }
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setStep('form')}>
              Editar
            </Button>
            <Button className="flex-1 h-12 font-bold" onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>);

  }

  // --- COUNTDOWN SCREEN ---
  if (step === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #145a32, #1a7a42)' }}>
         <div className="absolute top-6 right-6">
           <button onClick={() => setStep('done')} className="text-white/60 hover:text-white transition-colors">
             <X className="w-6 h-6" />
           </button>
         </div>
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="text-center text-white max-w-sm">

           <motion.div
             key={countdown}
             initial={{ scale: 1.4, opacity: 0.5 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-9xl font-black mb-6 tabular-nums"
             style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>

             {countdown}
           </motion.div>
           <p className="text-lg font-bold mb-3">Cadastro enviado com sucesso!</p>
           <p className="text-white/80 text-sm leading-relaxed mb-6">
             Seu cadastro será analisado em até 30 dias pelo time da Sou Brasil e, se aprovado, sua empresa fará parte do Clube de Benefícios Sou Brasil. Seja Bem-Vindo!
           </p>
           <p className="text-white/60 text-xs">
             Fechando em {countdown}s...
           </p>
         </motion.div>
       </div>);

  }

  // --- DONE SCREEN ---
  if (step === 'done') {
    const msg = encodeURIComponent(`Olá! Vim pelo App Clube Sou Brasil e acabei de me cadastrar como novo Parceiro Comercial. Meu comércio é ${formData.business_name} e gostaria de mais informações sobre os próximos passos!`);
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm w-full">
          
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-black mb-3">Parabéns!</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Seu cadastro foi realizado com sucesso. Seu perfil será analisado pela equipe da Sou Brasil em até 30 dias. Seja Bem-Vindo!
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`}
            target="_blank"
            rel="noreferrer"
            className="block mb-3">
            
            <Button className="w-full h-12 font-bold text-base bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-5 h-5 mr-2" /> Falar no WhatsApp
            </Button>
          </a>
          <Button variant="outline" className="w-full h-12" onClick={() => navigate('/Home')}>
            Ir para o App
          </Button>
        </motion.div>
      </div>);

  }

  // --- MAIN FORM ---
  const valid = isFormValid(formData);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-black text-base">Seja um Parceiro Comercial</h1>
          <p className="text-xs text-muted-foreground">Cadastre seu comércio na rede Sou Brasil</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">

        {/* SEÇÃO 1 – Dados do comércio */}
        <SectionCard title="1. Dados do Comércio" emoji="🏪">
          <Field label="Nome do comércio (obrigatório)">
            <Input value={formData.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="Ex: Restaurante Sabor Brasileiro" />
          </Field>
          <Field label="Nome do responsável (obrigatório)">
            <Input value={formData.owner_name} onChange={(e) => set('owner_name', e.target.value)} placeholder="Seu nome completo" />
          </Field>
          <Field label="Segmento (obrigatório)">
            <Select value={formData.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <p className="text-xs font-medium text-muted-foreground mt-3 mb-2">Informações Fiscais</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="CPF (obrigatório)">
              <Input value={formData.cpf} onChange={(e) => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
            </Field>
            <Field label="CNPJ (obrigatório)">
              <Input value={formData.cnpj} onChange={(e) => set('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0001-00" inputMode="numeric" />
            </Field>
          </div>
          </SectionCard>

        {/* SEÇÃO 2 – Contato */}
        <SectionCard title="2. Contato" emoji="📞">
          <Field label="Telefone pessoal (obrigatório)">
            <Input value={formData.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric" />
          </Field>
          <Field label="WhatsApp (obrigatório)">
            <Input value={formData.whatsapp} onChange={(e) => set('whatsapp', maskPhone(e.target.value))} placeholder="(41) 99999-9999" inputMode="numeric" />
          </Field>
          <Field label="E-mail (obrigatório)">
            <Input type="email" value={formData.owner_email} onChange={(e) => set('owner_email', e.target.value)} placeholder="seuemail@exemplo.com" />
          </Field>
          <Field label="Horário de Funcionamento">
            <OpeningHoursPicker value={formData.opening_hours} onChange={(v) => set('opening_hours', v)} />
          </Field>
        </SectionCard>

        {/* SEÇÃO 3 – Localização */}
        <SectionCard title="3. Localização" emoji="📍">
          <Button type="button" variant="outline" className="w-full" onClick={getCurrentLocation}>
            <MapPin className="w-4 h-4 mr-2" /> Capturar localização atual (GPS)
          </Button>
          {formData.latitude &&
          <p className="text-xs text-green-700 bg-green-50 rounded-lg p-2 text-center">
              📍 Coordenadas: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
            </p>
          }
          <div className="grid grid-cols-2 gap-2">
            <Field label="CEP">
              <Input value={formData.cep} onChange={(e) => set('cep', e.target.value)}
              onBlur={(e) => handleCEPBlur(e.target.value)}
              placeholder="00000-000" inputMode="numeric" />
            </Field>
            <Field label="Número">
              <Input value={formData.number} onChange={(e) => {const v = e.target.value;setFormData((f) => {const u = { ...f, number: v };u.address = buildAddress(u);return u;});}} placeholder="123" />
            </Field>
          </div>
          <Field label="Rua / Logradouro (obrigatório)">
            <Input value={formData.street} onChange={(e) => {const v = e.target.value;setFormData((f) => {const u = { ...f, street: v };u.address = buildAddress(u);return u;});}} placeholder="Rua das Flores" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bairro">
              <Input value={formData.neighborhood} onChange={(e) => {const v = e.target.value;setFormData((f) => {const u = { ...f, neighborhood: v };u.address = buildAddress(u);return u;});}} placeholder="Centro" />
            </Field>
            <Field label="Estado (UF)">
              <Input value={formData.state} onChange={(e) => {const v = e.target.value;setFormData((f) => {const u = { ...f, state: v };u.address = buildAddress(u);return u;});}} placeholder="PR" maxLength={2} />
            </Field>
          </div>
          <Field label="Cidade">
            <Input value={formData.city} onChange={(e) => {const v = e.target.value;setFormData((f) => {const u = { ...f, city: v };u.address = buildAddress(u);return u;});}} placeholder="Curitiba" />
          </Field>
          {formData.address && <p className="text-xs text-muted-foreground bg-primary/5 rounded-lg p-2">📌 Endereço: {formData.address}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude (manual)">
              <Input type="number" value={formData.latitude || ''} onChange={(e) => set('latitude', parseFloat(e.target.value))} placeholder="-25.00000" />
            </Field>
            <Field label="Longitude (manual)">
              <Input type="number" value={formData.longitude || ''} onChange={(e) => set('longitude', parseFloat(e.target.value))} placeholder="-49.00000" />
            </Field>
          </div>
        </SectionCard>

        {/* SEÇÃO 4 – Benefício */}
        <SectionCard title="4. Benefício Oferecido *" emoji="🎁">
          <p className="text-xs text-muted-foreground">
            Sugestões: desconto percentual (ex: 15% off), valor fixo (ex: R$10 de desconto), brindes (ex: sobremesa grátis), ou qualquer benefício exclusivo que desejar oferecer.
          </p>
          <Field label="Tipo de Desconto (obrigatório)">
            <Select value={formData.discount_type} onValueChange={(v) => set('discount_type', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                <SelectItem value="beneficio_especial">Benefício Especial</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor do Desconto (obrigatório)">
            <Input value={formData.discount_value} onChange={(e) => set('discount_value', e.target.value)} placeholder="ex: 15% ou R$20" />
          </Field>
          <Field label="Descreva o benefício em detalhes (obrigatório)">
            <Textarea
              value={formData.benefit_description}
              onChange={(e) => set('benefit_description', e.target.value)}
              placeholder="Ex: 15% de desconto em toda compra acima de R$50 para clientes Sou Brasil..."
              rows={4} />
          </Field>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quantidade de Uso Diário do Benefício (obrigatório)</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('unlimited_usage', !formData.unlimited_usage)}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${formData.unlimited_usage ? 'bg-green-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.unlimited_usage ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm">{formData.unlimited_usage ? '♾️ Uso ilimitado' : 'Limitado por dia'}</span>
            </div>
            {!formData.unlimited_usage &&
            <Input type="number" min={1} value={formData.usage_limit} onChange={(e) => set('usage_limit', parseInt(e.target.value) || 1)} placeholder="Mínimo 1 uso por dia" />
            }
          </div>
        </SectionCard>

        {/* SEÇÃO 5 – Imagens */}
        <SectionCard title="5. Imagens" emoji="📸">
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            ⭐ Imagens de qualidade aumentam a confiança e atraem mais clientes. Envie ao menos uma.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ImageUpload
              label="Logo do Comércio *"
              url={formData.logo_url}
              uploading={uploadingLogo}
              onFile={(f) => handleFileUpload(f, 'logo_url')}
              onRemove={() => set('logo_url', '')} />
            
            <ImageUpload
              label="Foto da Fachada *"
              url={formData.business_photo_url}
              uploading={uploadingPhoto}
              onFile={(f) => handleFileUpload(f, 'business_photo_url')}
              onRemove={() => set('business_photo_url', '')} />
            
          </div>
          {!formData.logo_url && !formData.business_photo_url &&
          <p className="text-xs text-destructive text-center">Envie ao menos uma imagem (logo ou fachada)</p>
          }
        </SectionCard>

        {/* SEÇÃO 6 – Redes sociais */}
        <SectionCard title="6. Redes Sociais" emoji="📲" optional>
          <p className="text-xs text-muted-foreground">
            Adicionar redes sociais aumenta o engajamento do seu perfil. (Opcional)
          </p>
          <Field label="Instagram">
            <Input value={formData.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/seuperfil" />
          </Field>
          <Field label="Facebook">
            <Input value={formData.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/seuperfil" />
          </Field>
          <Field label="TikTok">
            <Input value={formData.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="https://tiktok.com/@seuperfil" />
          </Field>
          <Field label="YouTube">
            <Input value={formData.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="https://youtube.com/@seucanal" />
          </Field>
          <Field label="Site">
            <Input value={formData.website} onChange={(e) => set('website', e.target.value)} placeholder="https://seusite.com.br" />
          </Field>
        </SectionCard>

        {/* Botões de serviços */}
        <PartnerServiceButtons formData={formData} isValid={valid} />

        {/* SALVAR */}
        <div className="pt-2 pb-8">
          {!valid &&
          <p className="text-xs text-destructive text-center mb-3">Preencha todos os campos (Obrigatório) para continuar.

          </p>
          }
          <Button
            className="w-full h-14 text-base font-black"
            disabled={!valid}
            onClick={() => setStep('confirm')}>
            
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Salvar Cadastro
          </Button>
        </div>
      </div>
    </div>);

}

function SectionCard({ title, emoji, optional, children }) {
  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>{emoji}</span>
          <span>{title}</span>
          {optional && <span className="text-xs font-normal text-muted-foreground">(opcional)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">{children}</CardContent>
    </Card>);

}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
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
          <button
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center">
          
            <X className="w-3 h-3" />
          </button>
        </div> :

      <>
          <input type="file" accept="image/*" className="hidden" id={`img-${label}`}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} disabled={uploading} />
          <label htmlFor={`img-${label}`}
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