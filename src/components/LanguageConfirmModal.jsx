import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

export default function LanguageConfirmModal({ selectedLang, isOpen, onClose }) {
  const { changeLanguage, availableLanguages } = useLanguage();
  const navigate = useNavigate();

  const selectedLanguage = availableLanguages.find(l => l.code === selectedLang);

  const handleConfirm = () => {
    changeLanguage(selectedLang);
    onClose();
    navigate('/Home');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Confirmar Troca de Idioma</h3>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded-full">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Você está alterando o idioma para:</p>
          <p className="text-2xl font-bold">{selectedLanguage?.name}</p>
        </div>

        <p className="text-sm text-muted-foreground text-center mb-6">
          Ao confirmar, você será redirecionado para a tela inicial com o novo idioma. Todas as páginas do app serão traduzidas automaticamente.
        </p>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-11 rounded-xl"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
            onClick={handleConfirm}
          >
            Confirmar e Ir para Home
          </Button>
        </div>
      </div>
    </div>
  );
}