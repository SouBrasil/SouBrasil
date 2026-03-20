import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSubscriptionStatus } from '@/lib/subscription';

export default function TechIssueModal({ user, onClose }) {
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sub = getSubscriptionStatus(user);
  const getUserType = () => {
    if (user?.subscription_type === 'annual') return 'premium_anual';
    if (user?.subscription_type === 'monthly') return 'premium_mensal';
    if (sub.isTrial) return 'trial';
    return 'free';
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error('Descreva o problema encontrado.'); return; }
    setSubmitting(true);
    await base44.entities.TechIssue.create({
      user_name: user?.full_name || '',
      user_email: user?.email || '',
      user_type: getUserType(),
      whatsapp: user?.whatsapp || user?.phone || '',
      region: user?.city ? `${user.city}${user.state ? '/' + user.state : ''}` : '',
      description,
      image_url: imageUrl,
      status: 'aguardando_analise',
      reported_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => onClose(), 3000);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-bold text-lg text-slate-800">Mensagem Enviada!</h2>
          <p className="text-sm text-slate-600">Sua mensagem foi enviada para a <strong>Sou Brasil</strong> e estará sendo analisada o quanto antes. Esta janela se fechará automaticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed z-50 flex items-end sm:items-center justify-center" style={{ top: '64px', left: 0, right: 0, bottom: '64px', background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '100%' }}>

        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="font-bold text-base">Relatar Problema Técnico</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Dados pré-preenchidos */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nome:</span>
              <span className="font-medium">{user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo:</span>
              <span className="font-medium capitalize">{getUserType().replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">WhatsApp:</span>
              <span className="font-medium">{user?.whatsapp || user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Região:</span>
              <span className="font-medium">{user?.city || '—'}{user?.state ? '/' + user.state : ''}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Descreva o Problema em Detalhes *</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva de forma detalhada o erro ou problema técnico encontrado..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Print da Tela (opcional)</label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors ${uploading ? 'opacity-50' : ''}`}>
              {uploading
                ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                : imageUrl
                ? <><CheckCircle2 className="w-5 h-5 text-green-600 mb-1" /><p className="text-xs text-green-700">Imagem enviada! Clique para trocar</p></>
                : <><Upload className="w-5 h-5 text-slate-400 mb-1" /><p className="text-xs text-slate-500">Enviar captura de tela</p></>}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>

        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}