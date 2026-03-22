import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function DeletePermanentlyConfirmModal({ partnerName, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-red-500 p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Excluir Permanentemente?</h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-center text-slate-700">
            Tem certeza que deseja excluir permanentemente <strong>"{partnerName}"</strong> do sistema?
          </p>
          <p className="text-center text-xs text-red-600 font-semibold">
            ⚠️ Esta ação não pode ser desfeita.
          </p>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}