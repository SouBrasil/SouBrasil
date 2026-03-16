import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User, Crown, Calendar, CreditCard, LogOut,
  ChevronRight, History, Shield
} from 'lucide-react';
import { getSubscriptionStatus } from '@/lib/subscription';

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const sub = getSubscriptionStatus(user);

  const { data: usages = [] } = useQuery({
    queryKey: ['my-usages'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 20),
  });

  const myUsages = usages.filter((u) => u.created_by === user?.email);

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Profile card */}
      <div className="bg-card rounded-3xl border border-border p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold">{user?.full_name || 'Carregando...'}</h2>
        <p className="text-sm text-muted-foreground">{user?.email}</p>

        {sub.active ? (
          <Badge className="mt-3 bg-primary text-primary-foreground">
            <Crown className="w-3 h-3 mr-1" />
            {sub.isTrial
              ? `Trial Gratuito · ${sub.daysLeft} dias restantes`
              : `Premium ${sub.type === 'annual' ? 'Anual' : 'Mensal'} · ${sub.daysLeft} dias`}
          </Badge>
        ) : (
          <Link to="/Pricing">
            <Badge className="mt-3 bg-accent text-accent-foreground cursor-pointer">
              <Crown className="w-3 h-3 mr-1" />
              Assinar Premium
            </Badge>
          </Link>
        )}
      </div>

      {/* Subscription info */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <Link
          to="/Pricing"
          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Minha Assinatura</p>
              <p className="text-xs text-muted-foreground">
                {sub.active ? (sub.isTrial ? 'Período gratuito' : 'Ativa') : 'Inativa'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Usage history */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Últimos usos</h3>
        </div>
        {myUsages.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center text-muted-foreground text-sm">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Você ainda não usou nenhum benefício.
          </div>
        ) : (
          <div className="space-y-2">
            {myUsages.map((u) => (
              <div key={u.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.partner_name || 'Parceiro'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.used_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Usado</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair
      </Button>
    </div>
  );
}