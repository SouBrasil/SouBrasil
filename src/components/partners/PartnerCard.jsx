import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { MapPin, Percent, Gift, Star } from 'lucide-react';

const categoryLabels = {
  restaurante: 'Restaurante',
  loja: 'Loja',
  servicos: 'Serviços',
  saude: 'Saúde',
  beleza: 'Beleza',
  educacao: 'Educação',
  entretenimento: 'Entretenimento',
  mercado: 'Mercado',
  oficina: 'Oficina',
  outro: 'Outro',
};

const categoryIcons = {
  restaurante: '🍽️',
  loja: '🛍️',
  servicos: '🔧',
  saude: '💊',
  beleza: '💇',
  educacao: '📚',
  entretenimento: '🎭',
  mercado: '🛒',
  oficina: '🔩',
  outro: '📌',
};

export default function PartnerCard({ partner, distance, avgRating, reviewCount }) {
  return (
    <Link to={`/PartnerDetail?id=${partner.id}`} className="block">
      <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
        {/* Image */}
        <div className="h-36 bg-muted relative overflow-hidden">
          {partner.image_url ? (
            <img
              src={partner.image_url}
              alt={partner.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20">
              <span className="text-5xl">{categoryIcons[partner.category] || '📌'}</span>
            </div>
          )}
          {/* Discount badge */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-accent text-accent-foreground font-bold text-sm px-3 py-1 shadow-lg">
              {partner.discount_type === 'percentual' ? <Percent className="w-3 h-3 mr-1" /> : <Gift className="w-3 h-3 mr-1" />}
              {partner.discount_value}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{partner.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {categoryLabels[partner.category] || partner.category}
              </p>
              {avgRating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-700">{avgRating}</span>
                  {reviewCount && <span className="text-xs text-muted-foreground">({reviewCount})</span>}
                </div>
              )}
            </div>
          </div>
          {distance !== undefined && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
            </div>
          )}
          {partner.discount_description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{partner.discount_description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}