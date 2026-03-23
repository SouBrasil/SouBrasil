import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Check, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { maskCPF, maskPhone, maskCEP } from '@/utils/masks';

export default function AsaasSetupModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cep, setCep] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState('email');
  const [error, setError] = useState('');

  // Pré-preenche com dados do perfil do usuário
  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.cpf) setCpf(maskCPF(u.cpf));
      if (u?.birth_date) setBirthDate(u.birth_date.slice(0, 10));
      if (u?.cep) setCep(maskCEP(u.cep));
      if (u?.email) {
        setPixKey(u.email);
        setPixType('email');
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setError('');

    const cpfClean = cpf.replace(/\D/g, '');
    if (!cpfClean || cpfClean.length !== 11) {
      setError('CPF inválido. Verifique e tente novamente.');
      return;
    }

    if (!birthDate) {
      setError('Data de nascimento é obrigatória.');
      return;
    }

    if (!cep.replace(/\D/g, '') || cep.replace(/\D/g, '').length < 8) {
      setError('CEP inválido. Informe seu CEP para continuarmos.');
      return;
    }

    if (!pixKey.trim()) {
      setError('Informe uma chave PIX válida.');
      return;
    }

    setLoading(true);

    // Salva dados no perfil antes de criar a wallet
    try {
      await base44.auth.updateMe({
        birth_date: birthDate,
        cpf: cpfClean,
        cep: cep.replace(/\D/g, ''),
        asaas_pix_key: pixKey.trim(),
      });
    } catch (_) { /* continua mesmo se falhar */ }

    try {
      const res = await base44.functions.invoke('affiliateSystem', {
        action: 'setup_asaas_wallet',
        cpf: cpfClean,
        pix_key: pixKey,
        birth_date: birthDate,
        cep: cep.replace(/\D/g, ''),
      });

      if (res.data?.success) {
        await base44.auth.updateMe({
          wallet_activation_paid: true,
          asaas_wallet_id: res.data.wallet_id || `WALLET_${Date.now()}`,
        });

        await base44.functions.invoke('affiliateSystem', {
          action: 'generate_referral_code',
        });

        setSuccess(true);
        toast.success('✓ Carteira ativada com sucesso!');

        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 2000);
      } else {
        setError(res.data?.error || 'Erro ao ativar carteira. Verifique seus dados e tente novamente.');
      }
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message || 'Erro ao processar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-600 mb-2">Carteira Ativada!</h2>
          <p className="text-sm text-slate-600">
            Seus dados foram cadastrados com sucesso. Agora você pode gerar links de indicação e receber comissões automaticamente.
          </p>
        </div>
      </div>
    );
  }

  const isFormValid = cpf.replace(/\D/g, '').length === 11
    && !!birthDate
    && cep.replace(/\D/g, '').length === 8
    && !!pixKey.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Ativar Carteira Digital</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              ℹ️ Cadastre seus dados para criar uma subconta Asaas segura e receber comissões automaticamente via PIX.
            </p>
          </div>

          {/* CPF */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">CPF *</label>
            <Input
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              disabled={loading}
              inputMode="numeric"
              className="h-10"
            />
          </div>

          {/* Data de Nascimento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Data de Nascimento *</label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={loading}
              className="h-10"
            />
          </div>

          {/* CEP */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">CEP *</label>
            <Input
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(maskCEP(e.target.value))}
              disabled={loading}
              inputMode="numeric"
              className="h-10"
            />
          </div>

          {/* Tipo de Chave PIX */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Tipo de Chave PIX</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'email', label: 'E-mail' },
                { val: 'cpf', label: 'CPF' },
                { val: 'phone', label: 'Telefone' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => {
                    setPixType(opt.val);
                    if (opt.val === 'cpf') setPixKey(cpf.replace(/\D/g, ''));
                  }}
                  disabled={loading}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition-all ${
                    pixType === opt.val
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chave PIX */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Chave PIX ({pixType === 'cpf' ? 'CPF' : pixType === 'email' ? 'E-mail' : 'Telefone'}) *
            </label>
            <Input
              placeholder={
                pixType === 'cpf' ? '00000000000' :
                pixType === 'email' ? 'seu@email.com' :
                '11999999999'
              }
              value={pixKey}
              onChange={(e) => {
                setPixKey(pixType === 'phone' ? maskPhone(e.target.value) : e.target.value);
              }}
              disabled={loading}
              inputMode={pixType === 'phone' ? 'numeric' : 'text'}
              className="h-10"
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Botão */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !isFormValid}
            className="w-full h-11 font-bold bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processando...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Ativar Carteira</>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Seus dados estão 100% protegidos e criptografados.
          </p>
        </div>
      </div>
    </div>
  );
}