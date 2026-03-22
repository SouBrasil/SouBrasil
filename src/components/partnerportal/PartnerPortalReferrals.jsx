import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Users, UserCheck, Copy, Share2, Link2, Gift, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AsaasSetupModal from '@/components/affiliate/AsaasSetupModal';
import { useState } from 'react';

export default function PartnerPortalReferrals({ partner, partnerAccess }) {
  const [user, setUser] = useState(null);
  const [showAsaasModal, setShowAsaasModal] = useState(false);

  useQuery({
    queryKey: ['user-data'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setUser(u);
      return u;
    },
  });
  const referralLink = partnerAccess
    ? `${window.location.origin}/OnboardingRegister?ref=${partnerAccess.referral_link || partnerAccess.partner_id}`
    : '';

  const { data: referrals = [] } = useQuery({
    queryKey: ['portal-referrals', partnerAccess?.partner_id],
    queryFn: () => base44.entities.ReferralSignup.filter({ partner_id: partnerAccess.partner_id }, '-created_date', 200),
    enabled: !!partnerAccess?.partner_id,
  });

  const premiumReferrals = referrals.filter(r => r.converted_to_premium);
  const earnings = premiumReferrals.length * 10;

  const copyLink = () => { navigator.clipboard.writeText(referralLink); toast.success('Link copiado!'); };
  const shareLink = () => {
    if (navigator.share) navigator.share({ title: 'Clube Sou Brasil', url: referralLink });
    else copyLink();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Indicados', value: referrals.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
          { label: 'Convertidos', value: premiumReferrals.length, color: 'text-green-600', bg: 'bg-green-50', icon: UserCheck },
          { label: 'Total Ganho', value: `R$${earnings}`, color: 'text-amber-600', bg: 'bg-amber-50', icon: Gift },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1`}>
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Explanation */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-bold text-green-800 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />Como Funciona</h3>
          <div className="space-y-1.5 text-xs text-green-700">
            <p>🔗 Compartilhe seu link de indicação com clientes e parceiros</p>
            <p>👤 <strong>Indicação de Usuário:</strong> Ganhe R$10 quando o indicado assinar um plano premium</p>
            <p>🏪 <strong>Indicação de Parceiro:</strong> Ganhe comissão especial quando uma empresa parceira se cadastrar pelo seu link</p>
            <p>💳 O pagamento das comissões é processado mensalmente via ASAAS</p>
          </div>
        </CardContent>
      </Card>

      {/* Asaas Setup Warning (igual ao usuário) */}
      {user && !user.asaas_wallet_id && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-orange-800 text-sm mb-2">⚠️ Configure sua Carteira Asaas</p>
              <p className="text-xs text-orange-700 mb-3">Para receber as comissões dos seus indicados, você precisa configurar sua carteira Asaas. Clique no botão abaixo para configurar.</p>
              <Button onClick={() => setShowAsaasModal(true)} size="sm" className="bg-orange-600 hover:bg-orange-700 gap-2">
                Configurar Carteira Asaas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <p className="font-bold text-sm">Seu Link de Indicação</p>
          </div>
          <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono break-all text-muted-foreground">
            {referralLink}
          </div>
          <div className="flex gap-2">
            <Button onClick={copyLink} className="flex-1 gap-2" variant="outline" size="sm">
              <Copy className="w-3.5 h-3.5" /> Copiar
            </Button>
            <Button onClick={shareLink} className="flex-1 gap-2" size="sm">
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAsaasModal && (
        <AsaasSetupModal 
          user={user} 
          onClose={() => {
            setShowAsaasModal(false);
            // Refresh user data
            base44.auth.me().then(u => setUser(u));
          }} 
        />
      )}

      {/* History */}
      <div>
        <h3 className="font-bold text-sm mb-2">Histórico de Indicações</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma indicação ainda. Compartilhe seu link!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map(r => (
              <Card key={r.id} className="border-slate-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.user_name || r.user_email}</p>
                    <p className="text-xs text-slate-400">{new Date(r.created_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {r.converted_to_premium
                    ? <Badge className="text-[10px] bg-green-100 text-green-700">Premium +R$10</Badge>
                    : <Badge variant="outline" className="text-[10px]">Gratuito</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}