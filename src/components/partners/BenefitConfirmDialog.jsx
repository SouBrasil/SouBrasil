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
        className="fixed z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center"
        style={{ top: '72px', left: 0, right: 0, bottom: '64px' }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-card w-full max-w-sm rounded-3xl shadow-2xl mx-4 overflow-y-auto"
          style={{ maxHeight: '100%' }}
        >
          <div className="p-5 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-black text-foreground">Usar Benefício?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você está prestes a utilizar o benefício de{' '}
              <span className="font-semibold text-foreground">{partner?.name}</span>.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Atenção:</span> Após utilizar este benefício, você só poderá utilizá-lo novamente após{' '}
              <span className="font-bold">{partner?.unlimited_usage ? '5 minutos' : '24 horas'}</span>.
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
              Sou Brasil, Quero Meu Desconto!
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Não utilizar o benefício
            </Button>
          </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}