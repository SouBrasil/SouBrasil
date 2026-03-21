import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { maskCPF } from '@/utils/masks';

export default function SetupAsaasModal({ user, onClose, onSuccess }) {
  const [step, setStep] = useState('form'); // form | processing | success
  const [cpf, setCpf] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('random_key'); // random_key | cpf | email | phone
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setError('');

    if (!cpf.replace(/\D/g, '')) {
      setError('CPF é obrigatório');
      return;
    }

    if (!pixKey.trim()) {
      setError('Informe uma chave PIX válida');
      return;
    }

    setStep('processing');

    try {
      const res = await base44.functions.invoke('affiliateSystem', {
        action: 'setup_asaas_wallet',
        cpf,
        pix_key: pixKey,
      });

      if (res.data?.success) {
        setStep('success');
        toast.success('Carteira ativada com sucesso! 🎉');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(res.data?.error || 'Erro ao configurar carteira');
        setStep('form');
      }
    } catch (err) {
      setError(err.message || 'Erro ao processar');
      setStep('form');
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center text-white">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black">Carteira Ativada!</h2>
            <p className="text-sm text-green-100 mt-2">Você já pode receber comissões automaticamente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Ativar Recebimento</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-primary/80 font-medium">
              ℹ️ Seus dados serão usados apenas para criar sua carteira digital segura e receber comissões via PIX.
            </p>
          </div>

          {/* CPF */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">CPF (Obrigatório)</label>
            <Input
              value={cpf}
              onChange={e => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              disabled={step === 'processing'}
            />
          </div>

          {/* PIX Key Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Chave PIX (Obrigatório)</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'random_key', label: 'Aleatória' },
                { val: 'cpf', label: 'CPF' },
                { val: 'email', label: 'E-mail' },
                { val: 'phone', label: 'Telefone' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => {
                    setPixKeyType(opt.val);
                    if (opt.val === 'email') setPixKey(user?.email || '');
                    else if (opt.val === 'phone') setPixKey(user?.phone || '');
                    else if (opt.val === 'cpf') setPixKey(cpf);
                    else setPixKey('');
                  }}
                  className={`text-xs py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                    pixKeyType === opt.val
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* PIX Key Input */}
          {pixKeyType === 'random_key' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Cole sua chave PIX aleatória</label>
              <Input
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                placeholder="UUID da sua chave PIX"
                disabled={step === 'processing'}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Button */}
          <Button
            onClick={handleSetup}
            disabled={step === 'processing' || !cpf.replace(/\D/g, '') || !pixKey.trim()}
            className="w-full h-11 font-bold"
          >
            {step === 'processing' ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando...</>
            ) : (
              'Ativar Carteira'
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Seus dados estão protegidos e criptografados. Processamos via Asaas (instituição autorizada).
          </p>
        </div>
      </div>
    </div>
  );
}