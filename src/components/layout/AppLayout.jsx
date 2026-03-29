import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Tag, User, Home, Crown, Gift, Ticket, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

import AIChatWidget from '@/components/chat/AIChatWidget';
import NotificationBell from '@/components/notifications/NotificationBell';

const navItems = [
{ path: '/Home', icon: Home, label: 'Início' },
{ path: '/Map', icon: MapPin, label: 'Mapa' },
{ path: '/Partners', icon: Tag, label: 'Parceiros' },
{ path: '/ReferralHub', icon: Gift, label: 'Indique' },
{ path: '/Pricing', icon: Crown, label: 'Planos' },
{ path: '/Profile', icon: User, label: 'Perfil' }];

function isProfileComplete(u) {
  if (!u) return false;
  return !!(u.profile_completed || (u.cpf && u.phone && (u.city || u.address || u.street)));
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Dark mode: apply system preference
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const applyDark = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    applyDark(mq);
    mq.addEventListener('change', applyDark);

    base44.auth.me().then(u => {
      setUser(u);
      if (!isProfileComplete(u)) {
        navigate('/OnboardingRegister', { replace: true });
      }
    }).catch(() => {});

    return () => mq.removeEventListener('change', applyDark);
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
      <main
        className="relative z-10"
        style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          bottom: '64px',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-30%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <AIChatWidget user={user} mode="user" />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom" style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2540 60%, #081829 100%)', boxShadow: '0 -4px 20px rgba(0,0,0,0.4), 0 -2px 8px rgba(0,30,80,0.4), inset 0 1px 0 rgba(255,255,255,0.08)', borderTop: '1px solid rgba(100,160,255,0.12)' }}>
        <div className="grid py-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-all ${
                isActive ?
                'text-yellow-400' :
                'text-white/50 hover:text-white/80'}`
                }
                style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.6))' } : {}}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
              </Link>);
          })}
        </div>
      </nav>
    </div>);
}