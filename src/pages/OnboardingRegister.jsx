import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, MapPin, Phone, Shield, Mail, ChevronRight, CheckCircle2 } from 'lucide-react';
import { maskCPF, maskPhone } from '@/utils/masks';
import { motion, AnimatePresence } from 'framer-motion';
import { getDeviceInfo } from '@/lib/deviceFingerprint';
import DuplicateRegisterModal from '@/components/common/DuplicateRegisterModal';

const REQUIRED_FIELDS = ['full_name', 'phone', 'cpf', 'email', 'birth_date', 'gender', 'cep', 'street', 'number', 'neighborhood', 'city', 'state'];

function isComplete(form) {
  return REQUIRED_FIELDS.every(k => form[k]?.trim?.());
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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

  const handleSubmit = async () => {
    if (!isComplete(form)) return;
    setLoading(true);

    try {
      // Verificação de CPF duplicado
      const cpfClean = form.cpf.replace(/\D/g, '');
      if (cpfClean && user?.cpf?.replace(/\D/g, '') !== cpfClean) {
        const existing = await base44.entities.User.filter({ cpf: form.cpf });
        const others = existing.filter(u => u.id !== user?.id);
        if (others.length > 0) {
          setDuplicateInfo({ type: 'cpf', value: form.cpf });
          return;
        }
      }

      const address = [form.street, form.number, form.neighborhood, form.city, form.state, form.cep].filter(Boolean).join(', ');
      const deviceInfo = await getDeviceInfo();

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
          <Field label="Nome completo *">
            <Input
              placeholder="Seu nome completo"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="E-mail *">
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
          <Field label="CPF *">
            <Input
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={e => set('cpf', maskCPF(e.target.value))}
              inputMode="numeric"
              className="rounded-xl"
            />
          </Field>
          <Field label="Data de Nascimento *">
            <Input
              type="date"
              value={form.birth_date}
              onChange={e => set('birth_date', e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <Field label="Gênero *">
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
          <Field label="WhatsApp *">
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
        <Section title="Endereço" icon={<MapPin className="w-4 h-4 text-primary" />}>
          <Field label="CEP *">
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
          <Field label="Rua / Logradouro *">
            <Input
              placeholder="Rua das Flores"
              value={form.street}
              onChange={e => set('street', e.target.value)}
              className="rounded-xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número *">
              <Input
                placeholder="123"
                value={form.number}
                onChange={e => set('number', e.target.value)}
                className="rounded-xl"
              />
            </Field>
            <Field label="Bairro *">
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
              <Field label="Cidade *">
                <Input
                  placeholder="Curitiba"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  className="rounded-xl"
                />
              </Field>
            </div>
            <Field label="UF *">
              <Input
                placeholder="PR"
                value={form.state}
                onChange={e => set('state', e.target.value.toUpperCase())}
                maxLength={2}
                className="rounded-xl"
              />
            </Field>
          </div>
        </Section>

        {referralCode && (
          <div className="bg-accent/20 border border-accent rounded-xl p-4 text-sm text-center">
            🎉 Você foi indicado! Código: <strong>{referralCode}</strong>
          </div>
        )}

        {!complete && (
          <p className="text-xs text-destructive text-center">Preencha todos os campos para continuar.</p>
        )}

        <Button
          className="w-full h-14 text-base font-black rounded-2xl"
          disabled={!complete || loading}
          onClick={handleSubmit}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Concluir Cadastro e Entrar no App'}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
        {icon}
        {title}
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