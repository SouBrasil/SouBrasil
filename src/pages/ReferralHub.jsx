import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Copy, Gift, DollarSign, Check, Share2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

// Valores de comissão
const COMMISSION_CLIENT = 10;       // R$10 por cliente que contratar plano
const COMMISSION_PARTNER_MONTHLY = 100; // R$100 parceiro que contratar plano mensal
const COMMISSION_PARTNER_ANNUAL = 200;  // R$200 parceiro que contratar plano anual

export default function ReferralHub() {
  const queryClient = useQueryClient();
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedPartner, setCopiedPartner] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['myReferrals'],
    queryFn: () => base44.entities.Referral.filter({ referrer_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ['myConversions'],
    queryFn: () => base44.entities.ReferralConversion.filter({ referrer_email: user?.email }),
    enabled: !!user?.email,
  });

  const createReferralMutation = useMutation({
    mutationFn: async (type) => {
      const code = `${user.email.split('@')[0]}-${type}-${Date.now().toString(36)}`;
      return base44.entities.Referral.create({
        referrer_email: user.email,
        referral_code: code,
        referral_type: type,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myReferrals'] }),
  });

  const clientReferral = referrals.find(r => r.referral_type === 'cliente');
  const partnerReferral = referrals.find(r => r.referral_type === 'parceiro');

  const clientLink = clientReferral ? `${window.location.origin}/OnboardingRegister?ref=${clientReferral.referral_code}` : null;
  const partnerLink = partnerReferral ? `${window.location.origin}/BecomePartner?ref=${partnerReferral.referral_code}` : null;

  const totalEarnings = conversions.reduce((sum, c) => sum + (c.earnings || 0), 0);
  const pendingEarnings = conversions.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.earnings || 0), 0);

  const copyLink = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'client') { setCopiedClient(true); setTimeout(() => setCopiedClient(false), 2000); }
    else { setCopiedPartner(true); setTimeout(() => setCopiedPartner(false), 2000); }
    toast.success('Link copiado!');
  };

  const shareLink = (link, title) => {
    if (navigator.share) {
      navigator.share({ title, text: `Conheça o Clube Sou Brasil! ${title}`, url: link });
    } else {
      navigator.clipboard.writeText(link);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const shareWhatsApp = (link, msg) => {
    const text = encodeURIComponent(`${msg}\n\n${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">💰 Indique e Ganhe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ganhe comissão por cada indicação convertida!
        </p>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-green-700 font-medium mb-1">Total Ganho</p>
            <p className="text-2xl font-bold text-green-700">R$ {totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-0.5">{conversions.filter(c => c.status !== 'pendente').length} conversões pagas</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Pendente</p>
            <p className="text-2xl font-bold text-amber-700">R$ {pendingEarnings.toFixed(2)}</p>
            <p className="text-xs text-amber-600 mt-0.5">{conversions.filter(c => c.status === 'pendente').length} em análise</p>
          </CardContent>
        </Card>
      </div>

      {/* Comissões */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="font-bold text-sm text-primary mb-3">💡 Tabela de Comissões</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Indicar cliente — plano Mensal Pró ou Anual Premium</span>
              <Badge className="bg-green-100 text-green-700 font-bold">R$ {COMMISSION_CLIENT},00</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Store className="w-4 h-4 text-amber-600" /> Indicar parceiro — plano Mensal</span>
              <Badge className="bg-amber-100 text-amber-700 font-bold">R$ {COMMISSION_PARTNER_MONTHLY},00</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Store className="w-4 h-4 text-yellow-600" /> Indicar parceiro — plano Anual</span>
              <Badge className="bg-yellow-100 text-yellow-700 font-bold">R$ {COMMISSION_PARTNER_ANNUAL},00</Badge>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">* Comissão creditada somente após o pagamento ser compensado para a Sou Brasil. Válida apenas na 1ª mensalidade/anuidade.</p>
        </CardContent>
      </Card>

      {/* Client Referral */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Indique Clientes</CardTitle>
              <CardDescription className="text-xs">Ganhe R$ {COMMISSION_CLIENT} por cada assinante</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!clientReferral ? (
            <Button onClick={() => createReferralMutation.mutate('cliente')} className="w-full" disabled={createReferralMutation.isPending}>
              {createReferralMutation.isPending ? 'Gerando...' : 'Gerar Meu Link de Indicação'}
            </Button>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Seu link de indicação:</p>
                <p className="text-xs font-mono break-all text-slate-700">{clientLink}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => copyLink(clientLink, 'client')} variant="outline" className="gap-1 text-xs h-9">
                  {copiedClient ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedClient ? 'Copiado' : 'Copiar'}
                </Button>
                <Button onClick={() => shareLink(clientLink, 'Conheça o Clube Sou Brasil!')} variant="outline" className="gap-1 text-xs h-9">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar
                </Button>
                <Button onClick={() => shareWhatsApp(clientLink, '🎉 Conheça o Clube Sou Brasil e aproveite descontos exclusivos!')} className="gap-1 text-xs h-9 bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-100">
                <div>
                  <p className="text-xl font-bold">{clientReferral.total_referrals || 0}</p>
                  <p className="text-xs text-muted-foreground">Indicações</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">R$ {(clientReferral.total_earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Ganho</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Partner Referral */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Store className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Indique Parceiros Comerciais</CardTitle>
              <CardDescription className="text-xs">Ganhe R$ {COMMISSION_PARTNER} por comércio aprovado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!partnerReferral ? (
            <Button onClick={() => createReferralMutation.mutate('parceiro')} className="w-full bg-amber-500 hover:bg-amber-600" disabled={createReferralMutation.isPending}>
              {createReferralMutation.isPending ? 'Gerando...' : 'Gerar Meu Link de Parceiros'}
            </Button>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Seu link para parceiros:</p>
                <p className="text-xs font-mono break-all text-slate-700">{partnerLink}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => copyLink(partnerLink, 'partner')} variant="outline" className="gap-1 text-xs h-9">
                  {copiedPartner ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPartner ? 'Copiado' : 'Copiar'}
                </Button>
                <Button onClick={() => shareLink(partnerLink, 'Seja um parceiro Sou Brasil!')} variant="outline" className="gap-1 text-xs h-9">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar
                </Button>
                <Button onClick={() => shareWhatsApp(partnerLink, '🏪 Quer colocar seu comércio no Clube Sou Brasil? Cadastre-se!')} className="gap-1 text-xs h-9 bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-100">
                <div>
                  <p className="text-xl font-bold">{partnerReferral.total_referrals || 0}</p>
                  <p className="text-xs text-muted-foreground">Indicações</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-600">R$ {(partnerReferral.total_earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Ganho</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Como Funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ['1', 'Gere seu link exclusivo de indicação acima'],
            ['2', 'Compartilhe no WhatsApp, redes sociais ou com amigos'],
            ['3', `Cliente assinar → você ganha R$${COMMISSION_CLIENT}`],
            ['4', `Parceiro ser aprovado → você ganha R$${COMMISSION_PARTNER}`],
            ['5', 'Pagamentos acumulados e realizados pelo time Sou Brasil'],
          ].map(([num, text]) => (
            <div key={num} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">{num}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}