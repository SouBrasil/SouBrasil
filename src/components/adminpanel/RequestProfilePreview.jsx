import { MapPin, Phone, Globe, Instagram, Star, Gift, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const categoryLabels = {
  restaurante: 'Restaurante', lanchonete: 'Lanchonete', pizzaria: 'Pizzaria',
  sorveteria: 'Sorveteria', padaria: 'Padaria', loja: 'Loja', conveniencia: 'Conveniência',
  mercado: 'Mercado', farmacia: 'Farmácia', petshop: 'Pet Shop', saude: 'Saúde',
  barbearia: 'Barbearia', salao_beleza: 'Salão de Beleza', academia: 'Academia',
  clinica_estetica: 'Estética', odontologia: 'Dentista', servicos: 'Serviços',
  oficina: 'Oficina', automoveis: 'Automóveis', outro: 'Outro',
};

export default function RequestProfilePreview({ request, onBack, onApprove, onReject, approving }) {
  const r = request;

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Voltar à Solicitação
        </button>
        <p className="text-xs text-slate-500 font-medium">Visualização do Perfil (como o cliente verá)</p>
      </div>

      {/* Preview — mobile-sized */}
      <div className="max-w-sm mx-auto py-6 px-4 space-y-4">
        {/* Cover photo */}
        <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-green-500 to-green-700">
          {r.business_photo_url || r.logo_url ? (
            <img src={r.business_photo_url || r.logo_url} alt={r.business_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white text-4xl font-black opacity-30">{r.business_name?.[0]}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-white font-black text-xl">{r.business_name}</h1>
            <Badge className="mt-1 bg-white/20 text-white border-0 text-xs">{categoryLabels[r.category] || r.category}</Badge>
          </div>
          {r.logo_url && (
            <div className="absolute top-4 right-4 w-14 h-14 rounded-xl overflow-hidden border-2 border-white/50">
              <img src={r.logo_url} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Discount highlight */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Benefício exclusivo Sou Brasil</p>
              <p className="font-black text-green-800 text-lg">{r.discount_value || r.benefit_description}</p>
              {r.discount_value && r.benefit_description && (
                <p className="text-xs text-green-700 mt-0.5">{r.benefit_description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {r.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-600">{r.address}</span>
              </div>
            )}
            {r.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600">{r.phone}</span>
              </div>
            )}
            {r.whatsapp && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">📱</span>
                <span className="text-slate-600">WhatsApp: {r.whatsapp}</span>
              </div>
            )}
            {r.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-blue-600">{r.website}</span>
              </div>
            )}
            {r.instagram && (
              <div className="flex items-center gap-2 text-sm">
                <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
                <span className="text-slate-600">{r.instagram}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fake ratings */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-lg">★</span>)}
            </div>
            <div>
              <p className="font-bold text-sm">Avaliação do Comércio</p>
              <p className="text-xs text-slate-400">As avaliações aparecerão após os primeiros clientes</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2 pt-2 pb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 text-center">
            📱 Esta é uma prévia de como o perfil aparecerá para os usuários do app
          </div>
          <Button onClick={onApprove} disabled={approving}
            className="w-full bg-green-600 hover:bg-green-700 gap-2">
            <CheckCircle className="w-4 h-4" />
            {approving ? 'Aprovando...' : 'Confirmar e Aprovar Cadastro'}
          </Button>
          <Button onClick={onReject} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
            Recusar / Devolver para Edição
          </Button>
          <Button onClick={onBack} variant="ghost" className="w-full text-slate-500">
            Voltar e Continuar Revisando
          </Button>
        </div>
      </div>
    </div>
  );
}