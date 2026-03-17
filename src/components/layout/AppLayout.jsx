import { Outlet, Link, useLocation } from 'react-router-dom';
import { MapPin, Tag, User, Home } from 'lucide-react';
import WhatsAppButton from '@/components/common/WhatsAppButton';

const navItems = [
  { path: '/Home', icon: Home, label: 'Início' },
  { path: '/Map', icon: MapPin, label: 'Mapa' },
  { path: '/Partners', icon: Tag, label: 'Parceiros' },
  { path: '/Profile', icon: User, label: 'Perfil' },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="bg-white px-4 py-4 flex items-center justify-center sticky top-0 z-50 shadow-md">
        <Link to="/Home" className="flex items-center">
          <img 
            src="https://media.base44.com/images/public/69b853fcf2849363360f797c/f1e283268_LogoSouBrasil-Oficial2-PNG.png" 
            alt="Sou Brasil" 
            className="h-14 w-auto"
          />
        </Link>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

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