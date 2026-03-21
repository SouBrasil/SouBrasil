import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Copy, CheckCircle2, Loader2, RefreshCw, ExternalLink, QrCode, CreditCard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PLAN_INFO = {
  monthly: { label: 'Mensal', price: 'R$ 19,90', period: '/mês' },
  annual: { label: 'Anual', price: 'R$ 179,88', period: '/ano', savings: 'Economia de R$ 58,92!' },
};

const BILLING_METHODS = [
  { id: 'PIX', label: 'Pix', icon: QrCode, desc: 'Aprovação imediata' },
  { id: 'BOLETO', label: 'Boleto', icon: FileText, desc: 'Vence em 3 dias' },
  { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard, desc: 'Via link seguro' },
];

export default function CheckoutModal({ plan, onClose, user }) {
  const [step, setStep] = useState('form'); // form | processing | result
  const [billingType, setBillingType] = useState('PIX');
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [paymentData, setPaymentData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);

  const planInfo = PLAN_INFO[plan];

  const handleCreatePayment = async () => {
    if (!cpf.replace(/\D/g, '') && billingType !== 'CREDIT_CARD') {
      toast.error('Informe seu CPF para continuar');
      return;
    }
    setStep('processing');
    try {
      const res = await base44.functions.invoke('asaasPayment', {
        action: 'create_payment',
        plan,
        billing_type: billingType,
        cpf: cpf.replace(/\D/g, ''),
      });
      if (res.data?.success) {
        setPaymentData(res.data.payment);
        setStep('result');
      } else {
        toast.error(res.data?.error || 'Erro ao gerar pagamento');
        setStep('form');
      }
    } catch (e) {
      toast.error('Erro ao processar pagamento');
      setStep('form');
    }
  };

  const handleCheckStatus = async () => {
    if (!paymentData?.asaas_payment_id) return;
    setCheckingStatus(true);
    try {
      const res = await base44.functions.invoke('asaasPayment', {
        action: 'check_status',
        asaas_payment_id: paymentData.asaas_payment_id,
      });
      const status = res.data?.status;
      if (['RECEIVED', 'CONFIRMED'].includes(status)) {
        toast.success('Pagamento confirmado! Sua assinatura foi ativada 🎉');
        setTimeout(() => { onClose(true); }, 2000);
      } else if (status === 'PENDING') {
        toast.info('Pagamento ainda pendente. Aguarde ou tente novamente.');
      } else {
        toast.warning(`Status: ${status}`);
      }
    } catch {
      toast.error('Erro ao verificar status');
    }
    setCheckingStatus(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCpf = (v) => {
    const n = v.replace(/\D/g, '').slice(0, 11);
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            .replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
            .replace(/(\d{3})(\d{0,3})/, '$1.$2');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">Assinar Plano {planInfo.label}</p>
            <p className="text-white/80 text-sm">{planInfo.price}{planInfo.period}</p>
            {planInfo.savings && <p className="text-yellow-300 text-xs font-bold">{planInfo.savings}</p>}
          </div>
          <button onClick={() => onClose(false)} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              {/* CPF */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Seu CPF</label>
                <Input
                  value={cpf}
                  onChange={e => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>

              {/* Billing method */}
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

              <Button onClick={handleCreatePayment} className="w-full bg-green-600 hover:bg-green-700 font-bold">
                Gerar Pagamento
              </Button>
              <p className="text-center text-[11px] text-slate-400">Pagamento seguro via ASAAS</p>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-green-600" />
              <p className="text-sm font-semibold text-slate-700">Gerando pagamento...</p>
              <p className="text-xs text-slate-400">Aguarde um momento</p>
            </div>
          )}

          {step === 'result' && paymentData && (
            <div className="space-y-4">
              {/* PIX */}
              {billingType === 'PIX' && (
                <>
                  {paymentData.pix_qr_code && (
                    <div className="flex justify-center">
                      <img src={`data:image/png;base64,${paymentData.pix_qr_code}`}
                        alt="QR Code PIX" className="w-48 h-48 border rounded-xl p-2" />
                    </div>
                  )}
                  {paymentData.pix_copy_paste && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Pix Copia e Cola</label>
                      <div className="flex gap-2">
                        <Input value={paymentData.pix_copy_paste} readOnly className="text-xs" />
                        <Button variant="outline" size="icon" onClick={() => handleCopy(paymentData.pix_copy_paste)}>
                          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-center text-xs text-green-700 font-semibold bg-green-50 rounded-xl p-2">
                    ⚡ Aprovação imediata após pagamento
                  </p>
                </>
              )}

              {/* BOLETO */}
              {billingType === 'BOLETO' && (
                <>
                  <p className="text-sm text-center text-slate-600">Boleto gerado com sucesso! Vence em 3 dias úteis.</p>
                  {paymentData.boleto_url && (
                    <a href={paymentData.boleto_url} target="_blank" rel="noreferrer">
                      <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                        <ExternalLink className="w-4 h-4" /> Abrir Boleto
                      </Button>
                    </a>
                  )}
                </>
              )}

              {/* CREDIT_CARD */}
              {billingType === 'CREDIT_CARD' && paymentData.asaas_invoice_url && (
                <>
                  <p className="text-sm text-center text-slate-600">Clique abaixo para pagar com cartão de crédito em ambiente seguro.</p>
                  <a href={paymentData.asaas_invoice_url} target="_blank" rel="noreferrer">
                    <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                      <CreditCard className="w-4 h-4" /> Pagar com Cartão
                    </Button>
                  </a>
                </>
              )}

              {/* Check status */}
              <Button variant="outline" onClick={handleCheckStatus} disabled={checkingStatus} className="w-full gap-2">
                {checkingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Verificar Pagamento
              </Button>

              {paymentData.asaas_invoice_url && (
                <a href={paymentData.asaas_invoice_url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                  <ExternalLink className="w-3 h-3" /> Ver fatura completa
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}