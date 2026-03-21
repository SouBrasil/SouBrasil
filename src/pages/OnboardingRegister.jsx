import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, MapPin, Phone, Shield, Mail, ChevronRight, CheckCircle2, LocateFixed } from 'lucide-react';
import { maskCPF, maskPhone } from '@/utils/masks';
import { motion, AnimatePresence } from 'framer-motion';
import { getDeviceInfo } from '@/lib/deviceFingerprint';
import DuplicateRegisterModal from '@/components/common/DuplicateRegisterModal';

const REQUIRED_FIELDS = [
  { key: 'full_name', label: 'Nome completo' },
  { key: 'email', label: 'E-mail' },
  { key: 'cpf', label: 'CPF' },
  { key: 'birth_date', label: 'Data de Nascimento' },
  { key: 'gender', label: 'Gênero' },
  { key: 'phone', label: 'WhatsApp' },
  { key: 'cep', label: 'CEP' },
  { key: 'street', label: 'Rua / Logradouro' },
  { key: 'number', label: 'Número' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'UF' },
];

function getMissingFields(form) {
  return REQUIRED_FIELDS.filter(f => !String(form[f.key] ?? '').trim()).map(f => f.label);
}

function isComplete(form) {
  return getMissingFields(form).length === 0;
}

export default function OnboardingRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [step, setStep] = useState('welcome'); // welcome | form
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null); // { type, value }

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    cpf: '',
    email: '',
    birth_date: '',
    gender: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({
        ...f,
        full_name: u?.full_name || '',
        email: u?.email || '',
        phone: u?.phone || '',
        cpf: u?.cpf || '',
        birth_date: u?.birth_date || '',
        gender: u?.gender || '',
        cep: u?.cep || '',
        street: u?.street || u?.address || '',
        number: u?.number || '',
        neighborhood: u?.neighborhood || '',
        city: u?.city || '',
        state: u?.state || '',
      }));
    }).catch(() => {});
  }, []);

  const [geoLoading, setGeoLoading] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
        ).then(r => r.json()).catch(() => null);

        if (!res?.address) return;

        const addr = res.address;
        const uf = addr.state_code?.replace('BR-', '') || '';
        const cepRaw = addr.postcode?.replace(/\D/g, '') || '';
        const cepFormatted = cepRaw.length === 8 ? cepRaw.replace(/(\d{5})(\d{3})/, '$1-$2') : '';

        // Preenche o que o Nominatim retorna
        setForm(f => ({
          ...f,
          street: addr.road || addr.pedestrian || f.street,
          neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || f.neighborhood,
          city: addr.city || addr.town || addr.village || f.city,
          state: uf || f.state,
          cep: cepFormatted || f.cep,
        }));

        // Se tiver CEP, complementa via ViaCEP
        if (cepRaw.length === 8) {
          const viacep = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`).then(r => r.json()).catch(() => null);
          if (viacep && !viacep.erro) {
            setForm(f => ({
              ...f,
              street: viacep.logradouro || f.street,
              neighborhood: viacep.bairro || f.neighborhood,
              city: viacep.localidade || f.city,
              state: viacep.uf || f.state,
            }));
          }
        }
      } finally {
        setGeoLoading(false);
      }
    }, () => setGeoLoading(false));
  };

  const handleCEPBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json()).catch(() => null);
    if (res && !res.erro) {
      setForm(f => ({
        ...f,
        street: res.logradouro || f.street,
        neighborhood: res.bairro || f.neighborhood,
        city: res.localidade || f.city,
        state: res.uf || f.state,
      }));
    }
  };

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    if (!isComplete(form)) return;
    setLoading(true);
    setSubmitError('');

    try {
      // Verificação de CPF duplicado (apenas se CPF foi alterado)
      const cpfClean = form.cpf.replace(/\D/g, '');
      if (cpfClean && user?.cpf?.replace(/\D/g, '') !== cpfClean) {
        try {
          const existing = await base44.entities.User.filter({ cpf: form.cpf });
          const others = (existing || []).filter(u => u.id !== user?.id);
          if (others.length > 0) {
            setDuplicateInfo({ type: 'cpf', value: form.cpf });
            setLoading(false);
            return;
          }
        } catch {
          // Se falhar a verificação, continua normalmente
        }
      }

      const address = [form.street, form.number, form.neighborhood, form.city, form.state, form.cep].filter(Boolean).join(', ');

      let deviceInfo = {};
      try { deviceInfo = await getDeviceInfo(); } catch { /* ignora */ }

      await base44.auth.updateMe({
        full_name: form.full_name,
        phone: form.phone,
        cpf: form.cpf,
        birth_date: form.birth_date,
        gender: form.gender,
        cep: form.cep,
        street: form.street,
        number: form.number,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        address,
        profile_completed: true,
        ...(referralCode ? { referral_code_used: referralCode } : {}),
        ...deviceInfo,
      });

      navigate('/Home');
    } catch (err) {
      console.error('Erro ao salvar cadastro:', err);
      setSubmitError('Ocorreu um erro ao salvar os dados. Tente novamente.');
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
        name={form.full_name}
        email={form.email}
        onClose={() => setDuplicateInfo(null)}
      />
    );
  }

  // --- WELCOME SCREEN ---
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #0d3320, #145a32)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <img
            src="https://media.base44.com/images/public/69b853fcf2849363360f797c/f1e283268_LogoSouBrasil-Oficial2-PNG.png"
            alt="Sou Brasil"
            className="h-16 mx-auto mb-6"
          />
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-3">
            Bem-vindo ao Clube Sou Brasil! 🎉
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Antes de utilizar o aplicativo ou qualquer benefício, é necessário preencher seu <strong>cadastro pessoal completo</strong>. Isso garante acesso a todos os recursos e promoções exclusivas.
          </p>
          <Button
            className="w-full h-12 text-base font-bold rounded-2xl justify-center"
            style={{
              background: 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)',
              color: '#fff',
              boxShadow: '0 6px 0 #15803d, 0 8px 16px rgba(22,163,74,0.4)',
              border: 'none',
            }}
            onClick={() => setStep('form')}
          >
            Preencher Cadastro
          </Button>
        </motion.div>
      </div>
    );
  }

  // --- FORM SCREEN ---
  const complete = isComplete(form);
  const missingFields = getMissingFields(form);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <img
          src="https://media.base44.com/images/public/69b853fcf2849363360f797c/f1e283268_LogoSouBrasil-Oficial2-PNG.png"
          alt="Sou Brasil"
          className="h-9"
        />
        <div>
          <h1 className="font-black text-base">Complete seu Cadastro</h1>
          <p className="text-xs text-muted-foreground">Todos os campos são obrigatórios</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-10 space-y-6">

        {/* Dados Pessoais */}
        <Section title="Dados Pessoais" icon={<User className="w-4 h-4 text-primary" />}>
          <Field label="Nome completo (Obrigatório)">
            <Input
              placeholder="Seu nome completo"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="E-mail (Obrigatório)">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="rounded-xl"
              disabled={!!user?.email}
            />
            {user?.email && <p className="text-xs text-muted-foreground mt-1">E-mail da conta (não editável)</p>}
          </Field>
          <Field label="CPF (Obrigatório)">
            <Input
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={e => set('cpf', maskCPF(e.target.value))}
              inputMode="numeric"
              className="rounded-xl"
            />
          </Field>
          <Field label="Data de Nascimento (Obrigatório)">
            <Input
              type="date"
              value={form.birth_date}
              onChange={e => set('birth_date', e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="Gênero (Obrigatório)">
            <select
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Outro">Outro</option>
              <option value="Prefiro não informar">Prefiro não informar</option>
            </select>
          </Field>
        </Section>

        {/* Contato */}
        <Section title="Contato" icon={<Phone className="w-4 h-4 text-primary" />}>
          <Field label="WhatsApp (Obrigatório)">
            <Input
              placeholder="(41) 9 9999-9999"
              value={form.phone}
              onChange={e => set('phone', maskPhone(e.target.value))}
              inputMode="numeric"
              className="rounded-xl"
            />
          </Field>
        </Section>

        {/* Endereço */}
        <Section
          title="Endereço"
          icon={<MapPin className="w-4 h-4 text-primary" />}
          action={
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-60"
            >
              {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
              {geoLoading ? 'Detectando...' : 'Usar minha localização'}
            </button>
          }
        >
          <Field label="CEP (Obrigatório)">
            <Input
              placeholder="00000-000"
              value={form.cep}
              onChange={e => set('cep', e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'))}
              onBlur={handleCEPBlur}
              inputMode="numeric"
              maxLength={9}
              className="rounded-xl"
            />
          </Field>
          <Field label="Rua / Logradouro (Obrigatório)">
            <Input
              placeholder="Rua das Flores"
              value={form.street}
              onChange={e => set('street', e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número (Obrigatório)">
              <Input
                placeholder="123"
                value={form.number}
                onChange={e => set('number', e.target.value)}
                className="rounded-xl"
              />
            </Field>
            <Field label="Bairro (Obrigatório)">
              <Input
                placeholder="Centro"
                value={form.neighborhood}
                onChange={e => set('neighborhood', e.target.value)}
                className="rounded-xl"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Cidade (Obrigatório)">
                <Input
                  placeholder="Curitiba"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  className="rounded-xl"
                />
              </Field>
            </div>
            <Field label="UF (Obrigatório)">
              <select
                value={form.state}
                onChange={e => set('state', e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione...</option>
                <option value="AC">AC – Acre</option>
                <option value="AL">AL – Alagoas</option>
                <option value="AP">AP – Amapá</option>
                <option value="AM">AM – Amazonas</option>
                <option value="BA">BA – Bahia</option>
                <option value="CE">CE – Ceará</option>
                <option value="DF">DF – Distrito Federal</option>
                <option value="ES">ES – Espírito Santo</option>
                <option value="GO">GO – Goiás</option>
                <option value="MA">MA – Maranhão</option>
                <option value="MT">MT – Mato Grosso</option>
                <option value="MS">MS – Mato Grosso do Sul</option>
                <option value="MG">MG – Minas Gerais</option>
                <option value="PA">PA – Pará</option>
                <option value="PB">PB – Paraíba</option>
                <option value="PR">PR – Paraná</option>
                <option value="PE">PE – Pernambuco</option>
                <option value="PI">PI – Piauí</option>
                <option value="RJ">RJ – Rio de Janeiro</option>
                <option value="RN">RN – Rio Grande do Norte</option>
                <option value="RS">RS – Rio Grande do Sul</option>
                <option value="RO">RO – Rondônia</option>
                <option value="RR">RR – Roraima</option>
                <option value="SC">SC – Santa Catarina</option>
                <option value="SP">SP – São Paulo</option>
                <option value="SE">SE – Sergipe</option>
                <option value="TO">TO – Tocantins</option>
              </select>
            </Field>
          </div>
        </Section>

        {referralCode && (
          <div className="bg-accent/20 border border-accent rounded-xl p-4 text-sm text-center">
            🎉 Você foi indicado! Código: <strong>{referralCode}</strong>
          </div>
        )}

        {showMissing && missingFields.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-destructive">Campos obrigatórios pendentes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {missingFields.map(f => (
                <li key={f} className="text-xs text-destructive">{f}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="w-full h-14 text-base font-black rounded-2xl"
          disabled={loading}
          onClick={() => {
            if (!complete) {
              setShowMissing(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
            setShowMissing(false);
            handleSubmit();
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Concluir Cadastro e Entrar no App'}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, icon, action, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-bold text-sm text-foreground">
          {icon}
          {title}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}