import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Copy, CheckCircle2, Loader2, RefreshCw, ExternalLink, QrCode, CreditCard, FileText, PartyPopper, Star, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ACTIVATION_INFO = {
  wallet_activation: { label: 'Ativação de Carteira Asaas', price: 'R$ 14,99', color: 'from-blue-600 to-blue-700' },
};

const BILLING_METHODS = [
  { id: 'PIX', label: 'Pix', icon: QrCode, desc: 'Aprovação imediata' },
  { id: 'BOLETO', label: 'Boleto', icon: FileText, desc: 'Vence em 3 dias' },
  { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard, desc: 'Via link seguro' },
];

function SuccessScreen({ onClose }) {
  const info = ACTIVATION_INFO.wallet_activation;
  return (
    <div className="flex flex-col items-center text-center px-5 pb-6 pt-2 space-y-4">
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg`}>
        <PartyPopper className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-800">Pagamento Confirmado! 🎉</h2>
        <p className="text-sm text-slate-500 mt-1">Agora você pode cadastrar sua carteira Asaas</p>
      </div>
      <div className={`w-full rounded-2xl bg-gradient-to-r ${info.color} p-4 text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-yellow-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">Taxa de Ativação</span>
        </div>
        <p className="text-2xl font-black">{info.label}</p>
        <p className="text-white/80 text-sm">{info.price}</p>
      </div>
      <div className="w-full">
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
          <Shield className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 font-medium text-left">Você está pronto para criar sua subconta Asaas e começar a receber comissões!</p>
        </div>
      </div>
      <Button onClick={() => onClose(true)} className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-base h-12">
        Continuar
      </Button>
    </div>
  );
}

export default function WalletActivationPaymentModal({ user, onClose, onSuccess }) {
  const [step, setStep] = useState('form');
  const [billingType, setBillingType] = useState('PIX');
  const [docValue, setDocValue] = useState(user?.cpf || '');
  const [paymentData, setPaymentData] = useState(null);
  const [copied, setCopied] = useState(false);
  const autoCheckRef = useRef(null);
  const pollCountRef = useRef(0);

  const info = ACTIVATION_INFO.wallet_activation;

  useEffect(() => {
    return () => {
      if (autoCheckRef.current?.clear) autoCheckRef.current.clear();
    };
  }, []);

  const doCheckStatus = async (paymentId) => {
    if (!paymentId) return null;
    try {
      const res = await base44.functions.invoke('asaasPayment', {
        action: 'check_status',
        asaas_payment_id: paymentId,
      });
      const status = res.data?.status;
      if (['RECEIVED', 'CONFIRMED'].includes(status)) {
        if (autoCheckRef.current) clearInterval(autoCheckRef.current);
        setStep('success');
        onSuccess();
        return 'confirmed';
      }
      return status;
    } catch {
      return null;
    }
  };

  const startAutoPolling = (paymentId) => {
    pollCountRef.current = 0;
    const unsubscribe = base44.entities.Payment.subscribe((event) => {
      if (
        (event.type === 'update' || event.type === 'create') &&
        (event.data?.asaas_payment_id === paymentId) &&
        ['RECEIVED', 'CONFIRMED'].includes(event.data?.status)
      ) {
        unsubscribe();
        if (autoCheckRef.current) clearInterval(autoCheckRef.current);
        doCheckStatus(paymentId);
      }
    });

    autoCheckRef.current = { clear: () => { unsubscribe(); } };
    const interval = setInterval(async () => {
      pollCountRef.current += 1;
      const result = await doCheckStatus(paymentId);
      if (result === 'confirmed') {
        unsubscribe();
        clearInterval(interval);
        return;
      }
      if (pollCountRef.current >= 40) clearInterval(interval);
    }, 15000);

    autoCheckRef.current = { clear: () => { unsubscribe(); clearInterval(interval); } };
    setTimeout(() => doCheckStatus(paymentId), 5000);
  };

  const handleCreatePayment = async () => {
    if (!docValue.replace(/\D/g, '') && billingType !== 'CREDIT_CARD') {
      toast.error('Informe seu CPF para continuar');
      return;
    }
    setStep('processing');
    try {
      const res = await base44.functions.invoke('asaasPayment', {
        action: 'create_wallet_activation_payment',
        billing_type: billingType,
        cpf: docValue.replace(/\D/g, ''),
      });

      if (res?.data?.success && res.data.payment) {
        const pd = res.data.payment;
        setPaymentData(pd);
        setStep('result');
        try {
          const payments = await base44.entities.Payment.filter({ asaas_payment_id: pd.asaas_payment_id });
          if (payments.length > 0) {
            await base44.entities.Payment.update(payments[0].id, { payment_viewed: true });
          }
        } catch (e) { 
          console.warn('Erro ao marcar payment_viewed:', e.message);
        }
        startAutoPolling(pd.asaas_payment_id);
      } else {
        const errorMsg = res?.data?.error || res?.error || 'Erro ao gerar pagamento';
        toast.error(errorMsg);
        setStep('form');
      }
    } catch (e) {
      toast.error(e?.message || 'Erro ao processar pagamento');
      setStep('form');
    }
  };

  const handleCheckStatus = async () => {
    if (!paymentData?.asaas_payment_id) {
      toast.error('ID de pagamento não encontrado');
      return;
    }
    setStep('checking');
    try {
      const result = await doCheckStatus(paymentData.asaas_payment_id);
      if (result === 'confirmed') {
        setStep('success');
      } else {
        setStep('result');
        if (result === 'PENDING') {
          toast.info('⏳ Pagamento ainda pendente. Aguarde alguns segundos e tente novamente.');
        } else {
          toast.warning(`⚠️ Status: ${result}. Verifique se o pagamento foi realizado.`);
        }
      }
    } catch (e) {
      toast.error('Erro ao verificar pagamento');
      setStep('result');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCPF = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.replace(/(\d{3})(\d+)/, '$1.$2');
    if (digits.length <= 9) return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {step !== 'success' && (
          <div className={`bg-gradient-to-r ${info.color} p-4 flex items-center justify-between`}>
            <div>
              <p className="text-white font-bold text-base">Ativar Carteira Asaas</p>
              <p className="text-white/80 text-sm">{info.price}</p>
            </div>
            <button onClick={() => onClose(false)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5">
          {step === 'form' && (
           <div className="space-y-4">
             <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                    <p className="font-semibold mb-1">Taxa de Ativação</p>
                    <p>Para cobrir os custos de criação da carteira na plataforma Asaas, um valor de R$14,99 é cobrado.</p>
                </div>
            </div>
             <div>
               <label className="text-xs font-semibold text-slate-600 mb-1 block">Seu CPF</label>
               <Input 
                 value={docValue} 
                 onChange={e => setDocValue(formatCPF(e.target.value))}
                 placeholder="000.000.000-00" 
                 inputMode="numeric" 
               />
             </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {BILLING_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button key={m.id} onClick={() => setBillingType(m.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${billingType === m.id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${billingType === m.id ? 'text-green-600' : 'text-slate-400'}`} />
                        <p className={`text-xs font-bold ${billingType === m.id ? 'text-green-700' : 'text-slate-600'}`}>{m.label}</p>
                        <p className="text-[10px] text-slate-400">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={handleCreatePayment} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                Pagar R$ 14,99
              </Button>
              <p className="text-center text-[11px] text-slate-400">Pagamento seguro via ASAAS</p>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Gerando pagamento...</p>
              <p className="text-xs text-slate-400">Aguarde um momento</p>
            </div>
          )}

          {step === 'checking' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Verificando pagamento...</p>
              <p className="text-xs text-slate-400">Aguardando confirmação do banco</p>
            </div>
          )}

          {step === 'result' && paymentData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-2.5 text-xs text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                Aguardando confirmação automática...
              </div>

              {billingType === 'PIX' && paymentData.pix_qr_code && (
                <>
                  <div className="flex justify-center">
                    <img src={`data:image/png;base64,${paymentData.pix_qr_code}`} alt="QR PIX" className="w-48 h-48 border rounded-xl p-2" />
                  </div>
                  {paymentData.pix_copy_paste && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Copia e Cola</label>
                      <div className="flex gap-2">
                        <Input value={paymentData.pix_copy_paste} readOnly className="text-xs" />
                        <Button variant="outline" size="icon" onClick={() => handleCopy(paymentData.pix_copy_paste)}>
                          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {billingType === 'BOLETO' && paymentData.boleto_url && (
                <a href={paymentData.boleto_url} target="_blank" rel="noreferrer">
                  <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="w-4 h-4" /> Abrir Boleto
                  </Button>
                </a>
              )}

              {billingType === 'CREDIT_CARD' && paymentData.asaas_invoice_url && (
                <a href={paymentData.asaas_invoice_url} target="_blank" rel="noreferrer">
                  <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                    <CreditCard className="w-4 h-4" /> Pagar com Cartão
                  </Button>
                </a>
              )}

              <Button variant="outline" onClick={handleCheckStatus} className="w-full gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                Já paguei, verificar agora
              </Button>
            </div>
          )}

          {step === 'success' && <SuccessScreen onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}