import { Link } from 'react-router-dom';
import { Gift, Trophy, Store, Star, Zap, Heart, Crown, Percent, Tag, Bell, Flame } from 'lucide-react';

const ICON_MAP = { Gift, Trophy, Store, Star, Zap, Heart, Crown, Percent, Tag, Bell, Flame };

const defaultButtons = [
  {
    id: 'plans',
    to: '/Pricing',
    icon: Crown,
    label: 'Planos',
    sub: 'Assine e aproveite',
    from: '#145a32',
    to_color: '#1a7a42',
  },
  {
    id: 'referral',
    to: '/ReferralHub',
    icon: Gift,
    label: 'Indique e Ganhe',
    sub: 'R$10 por indicação',
    from: '#16a34a',
    to_color: '#4ade80',
  },
  {
    id: 'raffles',
    to: '/Raffles',
    icon: Trophy,
    label: 'Sorteios',
    sub: 'Prêmios exclusivos',
    from: '#f59e0b',
    to_color: '#fde68a',
  },
  {
    id: 'partner',
    to: '/BecomePartner',
    icon: Store,
    label: 'Seja Parceiro',
    sub: 'Cadastre seu comércio',
    from: '#2563eb',
    to_color: '#60a5fa',
  },
];

function ActionButton({ label, sub, icon: Icon, from, to_color, to, open_external }) {
  const content = (
    <div
      className="text-white rounded-2xl p-4 w-36 min-h-[100px] flex flex-col justify-between active:scale-95 transition-transform"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to_color})`,
        boxShadow: '0 8px 20px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
    >
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div>
        <p className="text-xs font-bold leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-white/80 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );

  if (open_external && to) {
    return <a href={to} target="_blank" rel="noopener noreferrer" className="shrink-0">{content}</a>;
  }
  return <Link to={to || '/'} className="shrink-0">{content}</Link>;
}

export default function ActionCarousel({ customButtons = [] }) {
  // Se há botões customizados, usá-los; senão usa os padrão
  const buttons = customButtons.length > 0
    ? customButtons.map(b => ({
        id: b.id,
        label: b.title,
        sub: b.subtitle,
        icon: ICON_MAP[b.icon_name] || Gift,
        from: b.gradient_from || '#16a34a',
        to_color: b.gradient_to || '#4ade80',
        to: b.link_url || '/',
        open_external: b.open_external || false,
      }))
    : defaultButtons;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      {buttons.map((btn, idx) => (
        <ActionButton key={btn.id || idx} {...btn} />
      ))}
    </div>
  );
}