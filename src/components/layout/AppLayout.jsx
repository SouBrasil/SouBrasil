import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MapPin, Tag, User, Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WhatsAppButton from '@/components/common/WhatsAppButton';
import NotificationBell from '@/components/notifications/NotificationBell';

const navItems = [
  { path: '/Home', icon: Home, label: 'Início' },
  { path: '/Map', icon: MapPin, label: 'Mapa' },
  { path: '/Partners', icon: Tag, label: 'Parceiros' },
  { path: '/Profile', icon: User, label: 'Perfil' },
];

export default function AppLayout() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: 'hsl(var(--background))',
        backgroundImage: `url('https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/9b196ae71_FaixasSouBrasil.png')`,
        backgroundRepeat: 'repeat',
        backgroundSize: '600px auto',
        backgroundBlendMode: 'overlay',
      }}
    >
      {/* Overlay para 90% de transparência (10% opacidade da imagem) */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: `url('https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/9b196ae71_FaixasSouBrasil.png')`, backgroundRepeat: 'repeat', backgroundSize: '600px auto', opacity: 0.07 }} />
      {/* Top header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f4f0 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)' }}>
        {/* User avatar */}
        <Link to="/Profile">
          {user?.profile_photo ? (
            <img
              src={user.profile_photo}
              alt="Perfil"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          )}
        </Link>

        {/* Logo centered */}
        <Link to="/Home" className="flex items-center">
          <img
            src="https://media.base44.com/images/public/69b853fcf2849363360f797c/f1e283268_LogoSouBrasil-Oficial2-PNG.png"
            alt="Sou Brasil"
            className="h-12 w-auto"
          />
        </Link>

        {/* Notifications */}
        <NotificationBell userEmail={user?.email} />
      </header>

      {/* Page content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <WhatsAppButton />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}