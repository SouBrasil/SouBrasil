import { Link } from 'react-router-dom';
import { Gift, Trophy, Store } from 'lucide-react';

const defaultButtons = [
  {
    id: 'referral',
    to: '/ReferralHub',
    icon: Gift,
    label: 'Indique e Ganhe',
    sub: 'R$10 por indicação',
    gradient: 'from-primary to-emerald-500',
  },
  {
    id: 'raffles',
    to: '/Raffles',
    icon: Trophy,
    label: 'Sorteios',
    sub: 'Prêmios exclusivos',
    gradient: 'from-yellow-400 to-amber-500',
  },
  {
    id: 'partner',
    to: '/BecomePartner',
    icon: Store,
    label: 'Seja Parceiro',
    sub: 'Cadastre seu comércio',
    gradient: 'from-blue-500 to-indigo-600',
  },
];

export default function ActionCarousel({ extraButtons = [] }) {
  const buttons = [...defaultButtons, ...extraButtons];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      {buttons.map(({ id, to, icon: Icon, label, sub, gradient }) => (
        <Link key={id} to={to} className="shrink-0">
          <div className={`bg-gradient-to-br ${gradient} text-white rounded-2xl p-4 w-36 min-h-[100px] flex flex-col justify-between shadow-md active:scale-95 transition-transform`}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">{label}</p>
              <p className="text-[10px] text-white/80 mt-0.5 leading-tight">{sub}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}