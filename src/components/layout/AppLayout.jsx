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
{ path: '/Profile', icon: User, label: 'Perfil' }];


export default function AppLayout() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundColor: 'hsl(var(--background))' }}>
      
      {/* Sou Brasil wallpaper — uma imagem centralizada ao fundo */}
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center"
        style={{ zIndex: 0 }}
      >
        <img
          src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/9b196ae71_FaixasSouBrasil.png"
          alt=""
          style={{ opacity: 0.10, maxWidth: '160vw', maxHeight: '160vh', objectFit: 'contain' }}
        />
      </div>
      
      {/* Top header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f4f0 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)' }}>
        {/* User avatar */}
        <Link to="/Profile">
          {user?.profile_photo ?
          <img
            src={user.profile_photo}
            alt="Perfil"
            className="w-10 h-10 rounded-full object-cover border-2 border-primary" /> :


          <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          }
        </Link>

        {/* Logo centered */}
        <Link to="/Home" className="flex items-center">
          <img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/fd13a61a0_LogoSouBrasilOficial.png"

          alt="Sou Brasil" className="h-12 w-auto" />

          
        </Link>

        {/* Notifications */}
        <NotificationBell userEmail={user?.email} />
      </header>

      {/* Page content — ocupa o espaço entre header e nav inferior */}
      <main className="flex-1 overflow-y-auto relative z-10" style={{ paddingBottom: '5rem' }}>
        <Outlet />
      </main>

      <WhatsAppButton />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom" style={{ background: 'linear-gradient(180deg, #2d3a2d 0%, #1a2a1a 100%)', boxShadow: '0 -4px 16px rgba(0,0,0,0.3), 0 -2px 6px rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ?
                'text-yellow-400' :
                'text-white/50 hover:text-white/80'}`
                }
                style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.6))' } : {}}>
                
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>);

          })}
        </div>
      </nav>
    </div>);

}