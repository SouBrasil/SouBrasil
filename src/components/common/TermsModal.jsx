import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';
import { TermsContent } from '@/pages/TermsOfUse';

export default function TermsModal({ onConfirm, onCancel }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-black text-base">Termos de Uso e Privacidade</h2>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 text-sm"
          onScroll={handleScroll}
        >
          {!scrolledToBottom && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 text-center">
              📜 Role até o final para habilitar a confirmação
            </div>
          )}
          <TermsContent />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0">
          {!scrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground">Role o documento para aceitar</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl font-bold"
              disabled={!scrolledToBottom}
              onClick={onConfirm}
            >
              ✅ Li e Aceito
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}