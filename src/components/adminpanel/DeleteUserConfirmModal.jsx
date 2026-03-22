import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeleteUserConfirmModal({ user, onConfirm, onCancel }) {
  if (!user) return null;

  const hasPaidPlan = ['annual', 'monthly', 'premium_anual', 'premium_mensal', 'partner_monthly', 'partner_annual'].includes(user.subscription_type);
  const planLabel = {
    annual: 'Anual (cliente)',
    monthly: 'Mensal (cliente)',
    premium_anual: 'Premium Anual',
    premium_mensal: 'Premium Mensal',
    partner_monthly: 'Parceiro Mensal',
    partner_annual: 'Parceiro Anual',
  }[user.subscription_type] || user.subscription_type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`rounded-t-2xl p-5 ${hasPaidPlan ? 'bg-orange-50 border-b border-orange-200' : 'bg-red-50 border-b border-red-200'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasPaidPlan ? 'bg-orange-100' : 'bg-red-100'}`}>
              {hasPaidPlan ? <ShieldAlert className="w-5 h-5 text-orange-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            </div>
            <div className="flex-1">
              <h2 className={`font-bold text-base ${hasPaidPlan ? 'text-orange-800' : 'text-red-800'}`}>
                {hasPaidPlan ? '⚠️ Atenção — Cliente com Plano Pago!' : 'Confirmar Exclusão'}
              </h2>
              <p className={`text-sm mt-0.5 ${hasPaidPlan ? 'text-orange-700' : 'text-red-600'}`}>
                {hasPaidPlan
                  ? `Este cliente possui o plano "${planLabel}" ativo. Tem certeza que deseja excluir?`
                  : 'Tem certeza que deseja excluir este cliente?'}
              </p>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">
            <p className="font-semibold">{user.full_name || 'Sem nome'}</p>
            <p className="text-slate-500 text-xs">{user.email}</p>
          </div>

          {hasPaidPlan && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 space-y-1">
              <p className="font-bold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> O que será excluído:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Conta e todos os dados pessoais</li>
                <li>Histórico de pagamentos e assinatura</li>
                <li>Usos de benefícios e favoritos</li>
                <li>Participações em sorteios</li>
              </ul>
              <p className="font-semibold mt-1 text-orange-800">Esta ação é irreversível e o cliente perderá acesso imediato ao plano pago.</p>
            </div>
          )}

          {!hasPaidPlan && (
            <p className="text-xs text-slate-500 text-center">
              Todos os dados do usuário serão excluídos permanentemente. Esta ação é irreversível.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            className={`flex-1 gap-2 ${hasPaidPlan ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
            onClick={onConfirm}
          >
            <Trash2 className="w-4 h-4" />
            {hasPaidPlan ? 'Excluir mesmo assim' : 'Confirmar Exclusão'}
          </Button>
        </div>
      </div>
    </div>
  );
}