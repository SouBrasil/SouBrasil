import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Smartphone, TrendingUp, Share2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WHATSAPP_NUMBER = '5541996179617';

const services = [
  { id: 'site', label: 'Construa seu Site com a Sou Brasil', icon: Globe, color: 'from-blue-500 to-blue-700' },
  { id: 'app', label: 'Construa o App da sua Empresa', icon: Smartphone, color: 'from-purple-500 to-purple-700' },
  { id: 'traffic', label: 'Tráfego Pago com a Sou Brasil', icon: TrendingUp, color: 'from-orange-500 to-orange-700' },
  { id: 'social', label: 'Gestão de Redes Sociais', icon: Share2, color: 'from-pink-500 to-pink-700' },
];

export default function PartnerServiceButtons({ formData, isValid }) {
  const [showAlert, setShowAlert] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const handleService = (service) => {
    if (!isValid) {
      setShowAlert(true);
      return;
    }
    setSelectedService(service);
    setCountdown(10);
    let c = 10;
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(interval);
        const msg = encodeURIComponent(
          `Olá, vim pelo App Clube Sou Brasil e estou me tornando um novo Parceiro Comercial da Sou Brasil e gostaria de mais informações sobre: ${service.label}.`
        );
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
        setSelectedService(null);
        setCountdown(null);
      }
    }, 1000);
  };

  return (
    <>
      <div className="rounded-2xl border-2 border-dashed border-primary/30 p-4 space-y-3 bg-primary/5">
        <p className="text-sm font-bold text-center text-primary">💼 Serviços Disponíveis para Parceiros</p>
        <p className="text-xs text-muted-foreground text-center">Complete os dados obrigatórios para acessar</p>
        <div className="grid grid-cols-2 gap-2">
          {services.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => handleService(s)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl text-white text-xs font-bold text-center transition-all active:scale-95 bg-gradient-to-br ${s.color}`}
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-tight">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert modal */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="font-black text-lg mb-2">Dados incompletos</h3>
              <p className="text-muted-foreground text-sm mb-5">
                Preencha os dados obrigatórios antes de acessar este serviço.
              </p>
              <Button className="w-full" onClick={() => setShowAlert(false)}>
                Entendido
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown modal */}
      <AnimatePresence>
        {selectedService && countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #145a32, #1a7a42)' }}
          >
            <div className="text-center text-white max-w-sm">
              <motion.div
                key={countdown}
                initial={{ scale: 1.5, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-black mb-6 tabular-nums"
              >
                {countdown}
              </motion.div>
              <p className="font-bold text-xl mb-3">{selectedService.label}</p>
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                Seu cadastro será analisado em até 30 dias pelo time da Sou Brasil e se aprovado, sua empresa fará parte do Clube de Benefícios Sou Brasil. Seja Bem Vindo! Você será redirecionado para o WhatsApp para mais informações.
              </p>
              <p className="text-white/50 text-xs">Abrindo WhatsApp em {countdown}s...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}