import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Copy, CheckCircle2, Loader2, RefreshCw, ExternalLink, QrCode, CreditCard, FileText, PartyPopper, Star, Calendar, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PLAN_INFO = {
  monthly: { label: 'Mensal', price: 'R$ 19,90', period: '/mês', days: 30, color: 'from-green-600 to-green-700' },
  annual:  { label: 'Anual',  price: 'R$ 179,88', period: '/ano', days: 365, savings: 'Economia de R$ 58,92!', color: 'from-emerald-600 to-teal-700' },
  partner_monthly: { label: 'Parceiro Mensal', price: 'R$ 299,90', period: '/mês', days: 30, color: 'from-blue-600 to-blue-700' },
  partner_annual:  { label: 'Parceiro Anual',  price: 'R$ 2.500,00', period: '/ano', days: 365, color: 'from-indigo-600 to-purple-700' },
};

const BILLING_METHODS = [
  { id: 'PIX',         label: 'Pix',    icon: QrCode,      desc: 'Aprovação imediata' },
  { id: 'BOLETO',      label: 'Boleto', icon: FileText,    desc: 'Vence em 3 dias'    },
  { id: 'CREDIT_CARD', label: 'Cartão', icon: CreditCard,  desc: 'Via link seguro'    },
];

// ── Tela de sucesso ──────────────────────────────────────────
function SuccessScreen({ plan, planType, onClose }) {
  const key = planType === 'partner'
    ? (plan === 'annual' ? 'partner_annual' : 'partner_monthly')
    : plan;
  const info = PLAN_INFO[key] || PLAN_INFO[plan] || { label: plan, color: 'from-green-600 to-green-700', days: 30 };
  const isPartner = planType === 'partner';

  return (
    <div className="flex flex-col items-center text-center px-5 pb-6 pt-2 space-y-4">
      {/* Ícone animado */}
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg`}>
        <PartyPopper className="w-10 h-10 text-white" />
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-800">Parabéns! 🎉</h2>
        <p className="text-sm text-slate-500 mt-1">
          {isPartner ? 'Bem-vindo ao programa de parceiros!' : 'Sua assinatura foi ativada com sucesso!'}
        </p>
      </div>

      {/* Card do plano */}
      <div className={`w-full rounded-2xl bg-gradient-to-r ${info.color} p-4 text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-yellow-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">Plano Contratado</span>
        </div>
        <p className="text-2xl font-black">{info.label}</p>
        <p className="text-white/80 text-sm">{info.price}{info.period}</p>
        {info.savings && <p className="text-yellow-300 text-xs font-bold mt-1">{info.savings}</p>}
      </div>

      {/* Detalhes */}
      <div className="w-full space-y-2">
        <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
          <Shield className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium text-left">
            {isPartner
              ? 'Acesso ao portal de parceiros liberado'
              : 'Acesso premium a todos os benefícios liberado'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
          <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 font-medium text-left">
            {info.days === 365
              ? '365 dias de acesso somados ao seu saldo'
              : '30 dias de acesso somados ao seu saldo'}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Aproveite todos os benefícios exclusivos do Clube Sou Brasil! 🇧🇷
      </p>

      <Button onClick={() => onClose(true)} className="w-full bg-green-600 hover:bg-green-700 font-bold text-base h-12">
        Começar a aproveitar!
      </Button>
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────
export default function CheckoutModal({ plan, planType = 'client', onClose, user }) {
  const [step, setStep] = useState('form'); // form | processing | result | checking | success
  const [billingType, setBillingType] = useState('PIX');
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [paymentData, setPaymentData] = useState(null);
  const [copied, setCopied] = useState(false);
  const autoCheckRef = useRef(null);
  const pollCountRef = useRef(0);

  const planKey = planType === 'partner'
    ? (plan === 'annual' ? 'partner_annual' : 'partner_monthly')
    : plan;
  const planInfo = PLAN_INFO[planKey] || PLAN_INFO[plan] || { label: plan, color: 'from-green-600 to-green-700' };

  // Limpa polling e subscription ao desmontar
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
        return 'confirmed';
      }
      return status;
    } catch {
      return null;
    }
  };

  // Inicia detecção automática após gerar pagamento:
  // 1) Subscribe em tempo real no Payment (mesmo mecanismo do AdminPanelPayments)
  // 2) Polling a cada 15s como fallback
  const startAutoPolling = (paymentId) => {
    pollCountRef.current = 0;

    // ── Subscribe em tempo real via WebSocket ──
    const unsubscribe = base44.entities.Payment.subscribe((event) => {
      if (
        (event.type === 'update' || event.type === 'create') &&
        (event.data?.asaas_payment_id === paymentId) &&
        ['RECEIVED', 'CONFIRMED'].includes(event.data?.status)
      ) {
        unsubscribe();
        if (autoCheckRef.current) clearInterval(autoCheckRef.current);
        // Chama check_status para garantir ativação do plano no backend
        doCheckStatus(paymentId);
      }
    });

    // Guarda unsubscribe para limpeza
    autoCheckRef.current = { clear: () => { unsubscribe(); } };

    // ── Polling como fallback ──
    const interval = setInterval(async () => {
      pollCountRef.current += 1;
      const result = await doCheckStatus(paymentId);
      if (result === 'confirmed') {
        unsubscribe();
        clearInterval(interval);
        return;
      }
      if (pollCountRef.current >= 40) clearInterval(interval);
    }, 15000); // a cada 15 seg

    autoCheckRef.current = { clear: () => { unsubscribe(); clearInterval(interval); } };

    // Primeira checagem após 5 seg
    setTimeout(() => doCheckStatus(paymentId), 5000);
  };

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
        plan_type: planType,
      });
      if (res.data?.success) {
        const pd = res.data.payment;
        setPaymentData(pd);
        setStep('result');
        // Marca que o usuário chegou na tela de pagamento
        try {
          const payments = await base44.entities.Payment.filter({ asaas_payment_id: pd.asaas_payment_id });
          if (payments.length > 0) {
            await base44.entities.Payment.update(payments[0].id, { payment_viewed: true });
          }
        } catch { /* ignora erros de marcação */ }
        // Inicia verificação automática
        startAutoPolling(pd.asaas_payment_id);
      } else {
        toast.error(res.data?.error || 'Erro ao gerar pagamento');
        setStep('form');
      }
    } catch (e) {
      toast.error('Erro ao processar pagamento');
      setStep('form');
    }
  };

  // Verificação manual pelo botão
  const handleCheckStatus = async () => {
    if (!paymentData?.asaas_payment_id) return;
    setStep('checking');
    const result = await doCheckStatus(paymentData.asaas_payment_id);
    if (result !== 'confirmed') {
      setStep('result');
      if (result === 'PENDING') toast.info('Pagamento ainda pendente. Aguarde ou tente novamente.');
      else toast.warning(`Status: ${result}`);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCpf = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header — não mostra no sucesso */}
        {step !== 'success' && (
          <div className={`bg-gradient-to-r ${planInfo.color} p-4 flex items-center justify-between`}>
            <div>
              <p className="text-white font-bold text-base">Assinar Plano {planInfo.label}</p>
              <p className="text-white/80 text-sm">{planInfo.price}{planInfo.period}</p>
              {planInfo.savings && <p className="text-yellow-300 text-xs font-bold">{planInfo.savings}</p>}
            </div>
            <button onClick={() => onClose(false)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5">
          {/* FORM */}
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Seu CPF</label>
                <Input value={cpf} onChange={e => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00" inputMode="numeric" />
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
              <Button onClick={handleCreatePayment} className="w-full bg-green-600 hover:bg-green-700 font-bold">
                Gerar Pagamento
              </Button>
              <p className="text-center text-[11px] text-slate-400">Pagamento seguro via ASAAS</p>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-green-600" />
              <p className="text-sm font-semibold text-slate-700">Gerando pagamento...</p>
              <p className="text-xs text-slate-400">Aguarde um momento</p>
            </div>
          )}

          {/* CHECKING (verificação automática em andamento) */}
          {step === 'checking' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-green-600" />
              <p className="text-sm font-semibold text-slate-700">Verificando pagamento...</p>
              <p className="text-xs text-slate-400">Aguardando confirmação do banco</p>
            </div>
          )}

          {/* RESULT */}
          {step === 'result' && paymentData && (
            <div className="space-y-4">
              {/* Indicador de verificação automática */}
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-2.5 text-xs text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                Aguardando confirmação automática do banco...
              </div>

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
                    ⚡ Após pagar, a confirmação é automática!
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
              {billingType === 'CREDIT_CARD' && (
                <>
                  <p className="text-sm text-center text-slate-600">
                    Clique abaixo para pagar com cartão de crédito em ambiente seguro. Após o pagamento, a confirmação é automática!
                  </p>
                  {paymentData.asaas_invoice_url ? (
                    <a href={paymentData.asaas_invoice_url} target="_blank" rel="noreferrer">
                      <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                        <CreditCard className="w-4 h-4" /> Pagar com Cartão
                      </Button>
                    </a>
                  ) : (
                    <Button disabled className="w-full gap-2 bg-slate-400">
                      <CreditCard className="w-4 h-4" /> Gerando link de pagamento...
                    </Button>
                  )}
                </>
              )}

              {/* Verificar manualmente se demorar */}
              <Button variant="outline" onClick={handleCheckStatus} className="w-full gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                Já paguei, verificar agora
              </Button>

              {paymentData.asaas_invoice_url && (
                <a href={paymentData.asaas_invoice_url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                  <ExternalLink className="w-3 h-3" /> Ver fatura completa
                </a>
              )}
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <SuccessScreen plan={plan} planType={planType} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}