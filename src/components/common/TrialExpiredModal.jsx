import { useNavigate } from 'react-router-dom';
import { Lock, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function TrialExpiredModal({ onClose }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-green-700 p-6 relative text-center">
          {onClose && (
            <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-white">Período gratuito encerrado</h2>
          <p className="text-white/80 text-sm mt-1">Seu trial de 7 dias expirou</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-center text-slate-600 text-sm leading-relaxed">
            Para continuar resgatando benefícios e participando de sorteios exclusivos, escolha um dos nossos planos.
          </p>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-primary">Plano Mensal</p>
                <p className="text-xs text-slate-500">Acesso completo por 30 dias</p>
              </div>
              <p className="font-black text-primary text-lg">R$ 19,90</p>
            </div>
            <div className="border-t border-primary/10 pt-2 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-green-700">Plano Anual 🔥</p>
                <p className="text-xs text-slate-500">Melhor custo-benefício</p>
              </div>
              <div className="text-right">
                <p className="font-black text-green-700 text-lg">R$ 179,88</p>
                <p className="text-xs text-green-600">menos de R$ 15/mês</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => { navigate('/Pricing'); onClose?.(); }}
            className="w-full h-12 font-bold text-base bg-primary hover:bg-primary/90 rounded-2xl"
          >
            <Crown className="w-5 h-5 mr-2" />
            Ver Planos e Assinar
          </Button>

          {onClose && (
            <button onClick={onClose} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1">
              Agora não
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}