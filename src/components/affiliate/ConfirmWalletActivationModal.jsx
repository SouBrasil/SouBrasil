import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Zap, Shield, AlertCircle } from 'lucide-react';

export default function ConfirmWalletActivationModal({ onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-white" />
            <h2 className="text-lg font-black text-white">Ativar Carteira Digital</h2>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Alert Box */}
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-red-900 mb-1">Por que pagar R$ 14,99?</p>
                <p className="text-red-700 text-xs leading-relaxed">
                  Este valor cobre os custos da plataforma Asaas para criar sua subconta segura onde você receberá automaticamente as comissões via PIX.
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  <span className="font-bold">100% Seguro:</span> Seus dados (CPF e Chave PIX) ficam criptografados na Asaas.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  <span className="font-bold">Automático:</span> Após pagamento, você seguirá para cadastrar seus dados bancários.
                </p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-700 mb-3 uppercase">Próximas Etapas:</p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex gap-2">
                <span className="font-black text-slate-400">1</span>
                <span>Confirme aqui para ir ao pagamento</span>
              </div>
              <div className="flex gap-2">
                <span className="font-black text-slate-400">2</span>
                <span>Escolha Pix, Boleto ou Cartão de Crédito</span>
              </div>
              <div className="flex gap-2">
                <span className="font-black text-slate-400">3</span>
                <span>Após confirmar pagamento, cadastre CPF e Chave PIX</span>
              </div>
              <div className="flex gap-2">
                <span className="font-black text-slate-400">4</span>
                <span>Pronto! Seu link de indicação estará disponível</span>
              </div>
            </div>
          </div>

          {/* Price highlight */}
          <div className="bg-gradient-to-r from-red-100 to-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-xs text-red-600 mb-1">Taxa de Ativação (única vez)</p>
            <p className="text-3xl font-black text-red-600">R$ 14,99</p>
            <p className="text-xs text-red-500 mt-1">Após isso, você recebe 100% das suas comissões</p>
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
            >
              <Zap className="w-4 h-4" />
              Confirmar e Pagar R$ 14,99
            </Button>
            <Button
              onClick={onCancel}
              disabled={loading}
              variant="outline"
              className="w-full h-10"
            >
              Cancelar
            </Button>
          </div>

          <p className="text-center text-[10px] text-slate-400">
            ✓ Transação 100% segura. Todos os dados protegidos.
          </p>
        </div>
      </div>
    </div>
  );
}