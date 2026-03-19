import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  User, Crown, CreditCard, LogOut,
  ChevronRight, History, Shield, Store, Trophy, Heart, Camera, Pencil, X, AlertCircle
} from 'lucide-react';
import { getSubscriptionStatus } from '@/lib/subscription';
import EditProfileModal from '@/components/profile/EditProfileModal';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    base44.auth.logout('/Landing');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = await base44.auth.updateMe({ profile_photo: file_url });
    setUser(updated);
    setUploading(false);
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Profile card */}
      <div className="bg-card rounded-3xl border border-border p-6 text-center">
        {/* Avatar with upload */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          {user?.profile_photo ? (
            <img
              src={user.profile_photo}
              alt="Foto de perfil"
              className="w-24 h-24 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <User className="w-12 h-12 text-primary" />
            </div>
          )}
          <label className={`absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <Camera className="w-4 h-4 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>

        <h2 className="text-xl font-bold">{user?.full_name || 'Carregando...'}</h2>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {user?.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}

        {sub.active ? (
          <div
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #f0c040, #b8960c)',
              color: '#1a1a00',
              boxShadow: '0 2px 12px rgba(212,175,55,0.5), 0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            <Crown className="w-3.5 h-3.5" />
            {sub.isTrial
              ? `Trial Gratuito · ${sub.daysLeft} dias restantes`
              : `Usuário Premium · ${sub.daysLeft} dias`}
          </div>
        ) : (
          <Link to="/Pricing">
            <Badge className="mt-3 bg-accent text-accent-foreground cursor-pointer">
              <Crown className="w-3 h-3 mr-1" />
              Assinar Premium
            </Badge>
          </Link>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-full"
          onClick={() => setShowEdit(true)}
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Editar perfil
        </Button>
      </div>

      {/* Quick actions */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        <Link to="/Pricing" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Minha Assinatura</p>
              <p className="text-xs text-muted-foreground">{sub.active ? (sub.isTrial ? 'Período gratuito' : 'Ativa') : 'Inativa'}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/Raffles" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Sorteios</p>
              <p className="text-xs text-muted-foreground">Prêmios exclusivos Premium</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/ReferralHub" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Indique e Ganhe</p>
              <p className="text-xs text-muted-foreground">R$10 por indicação Premium</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/PartnerPortal" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4af37, #b8960c)' }}>
              <Store className="w-5 h-5 text-yellow-900" />
            </div>
            <div>
              <p className="font-medium text-sm">Sou Parceiro Comercial</p>
              <p className="text-xs text-muted-foreground">Acessar Portal do Parceiro</p>
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
              <button
                key={u.id}
                onClick={() => navigate(`/PartnerDetail?id=${u.partner_id}`)}
                className="w-full bg-card rounded-xl border border-border p-3 flex items-center justify-between hover:bg-green-500/20 active:bg-green-500/30 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-sm">{u.partner_name || 'Parceiro'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.used_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Usado</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Become Partner CTA */}
      <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
            <Store className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Seja um Parceiro Sou Brasil</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Traga seu comércio para nossa rede e alcance milhares de clientes
            </p>
          </div>
          <Link to="/BecomePartner" className="block">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Store className="w-4 h-4 mr-2" />
              Quero ser Parceiro
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white"
        onClick={() => setShowLogoutConfirm(true)}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair
      </Button>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-bold">Confirmar saída</h2>
            </div>
            <p className="text-muted-foreground mb-6">Tem certeza que deseja sair da sua conta?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl"
                onClick={handleLogout}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={(data) => setUser(u => ({ ...u, ...data }))}
        />
      )}
    </div>
  );
}