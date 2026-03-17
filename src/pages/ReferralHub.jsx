import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Store, Copy, Gift, DollarSign, Check } from 'lucide-react';
import { toast } from 'sonner';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReferrals'] });
    },
  });

  const clientReferral = referrals.find(r => r.referral_type === 'cliente');
  const partnerReferral = referrals.find(r => r.referral_type === 'parceiro');

  const clientLink = clientReferral ? `${window.location.origin}/OnboardingRegister?ref=${clientReferral.referral_code}` : null;
  const partnerLink = partnerReferral ? `${window.location.origin}/OnboardingRegister?ref=${partnerReferral.referral_code}` : null;

  const totalEarnings = conversions.reduce((sum, c) => sum + (c.earnings || 0), 0);
  const pendingEarnings = conversions.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.earnings || 0), 0);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'client') {
      setCopiedClient(true);
      setTimeout(() => setCopiedClient(false), 2000);
    } else {
      setCopiedPartner(true);
      setTimeout(() => setCopiedPartner(false), 2000);
    }
    toast.success('Link copiado!');
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Indique e Ganhe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ganhe R$ 10 por cada indicação que se tornar cliente premium
        </p>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Ganho</p>
                <p className="text-2xl font-bold text-primary">R$ {totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-accent">R$ {pendingEarnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Referral */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Indique Clientes</CardTitle>
              <CardDescription>Compartilhe com amigos e influenciadores</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!clientReferral ? (
            <Button 
              onClick={() => createReferralMutation.mutate('cliente')}
              className="w-full"
              disabled={createReferralMutation.isPending}
            >
              Gerar Meu Link de Indicação
            </Button>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Seu link:</p>
                <p className="text-sm font-mono break-all">{clientLink}</p>
              </div>
              <Button 
                onClick={() => copyToClipboard(clientLink, 'client')}
                variant="outline"
                className="w-full"
              >
                {copiedClient ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>
              <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientReferral.total_referrals || 0}</p>
                  <p className="text-xs text-muted-foreground">Indicações</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">R$ {(clientReferral.total_earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Ganho</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Partner Referral */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-accent" />
            </div>
            <div>
              <CardTitle>Indique Parceiros</CardTitle>
              <CardDescription>Traga novos comércios para a rede</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!partnerReferral ? (
            <Button 
              onClick={() => createReferralMutation.mutate('parceiro')}
              className="w-full"
              variant="secondary"
              disabled={createReferralMutation.isPending}
            >
              Gerar Meu Link de Parceiros
            </Button>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Seu link:</p>
                <p className="text-sm font-mono break-all">{partnerLink}</p>
              </div>
              <Button 
                onClick={() => copyToClipboard(partnerLink, 'partner')}
                variant="outline"
                className="w-full"
              >
                {copiedPartner ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>
              <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <div>
                  <p className="text-2xl font-bold text-foreground">{partnerReferral.total_referrals || 0}</p>
                  <p className="text-xs text-muted-foreground">Indicações</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">R$ {(partnerReferral.total_earnings || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Ganho</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
            <p className="text-muted-foreground">Gere seu link exclusivo de indicação</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
            <p className="text-muted-foreground">Compartilhe nas redes sociais, WhatsApp ou com amigos</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
            <p className="text-muted-foreground">Quando alguém se cadastrar e assinar o Premium, você ganha R$ 10!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}