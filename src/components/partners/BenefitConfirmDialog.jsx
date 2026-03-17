import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BenefitConfirmDialog({ partner, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end justify-center p-0 sm:items-center sm:p-4"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-foreground">Usar Benefício?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você está prestes a utilizar o benefício de{' '}
              <span className="font-semibold text-foreground">{partner?.name}</span>.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Atenção:</span> Após utilizar este benefício, você só poderá utilizá-lo novamente após{' '}
              <span className="font-bold">24 horas</span>.
            </p>
          </div>

          {/* Partner benefit summary */}
          {partner?.discount_value && (
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Benefício a utilizar</p>
              <p className="font-bold text-primary text-lg mt-0.5">{partner.discount_value}</p>
              {partner.discount_description && (
                <p className="text-xs text-muted-foreground mt-0.5">{partner.discount_description}</p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2">
            <Button
              onClick={onConfirm}
              className="w-full h-12 font-bold rounded-xl gap-2 bg-primary hover:bg-primary/90"
            >
              <Shield className="w-4 h-4" />
              Utilizar Benefício
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}