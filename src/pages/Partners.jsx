import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '@/components/common/PullToRefresh';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import PartnerCard from '@/components/partners/PartnerCard';
import CategoryStories from '@/components/partners/CategoryStories';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const radiusOptions = [
  { value: 9999, label: 'Todos' },
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 20, label: '20 km' },
];

export default function Partners() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [radius, setRadius] = useState(9999);
  const [showRadiusFilter, setShowRadiusFilter] = useState(false);
  const [location, setLocation] = useState(null);
  const userLocation = location ? { lat: location.lat, lng: location.lng } : null;

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners-list'],
    queryFn: () => base44.entities.Partner.filter({ active: true }),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['all-reviews'],
    queryFn: () => base44.entities.PartnerReview.list('-created_date', 200),
  });

  const ratingMap = {};
  reviews.forEach((r) => {
    if (!ratingMap[r.partner_id]) ratingMap[r.partner_id] = { sum: 0, count: 0 };
    ratingMap[r.partner_id].sum += r.rating || 0;
    ratingMap[r.partner_id].count += 1;
  });

  const filtered = partners
    .filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || p.category === category;
      return matchSearch && matchCategory;
    })
    .map((p) => ({
      ...p,
      distance: location ? getDistance(location.lat, location.lng, p.latitude, p.longitude) : null,
    }))
    .filter((p) => p.distance === null || p.distance <= radius)
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const queryClient = useQueryClient();
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['partners-list'] });
    await queryClient.invalidateQueries({ queryKey: ['all-reviews'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="px-4 pt-4 pb-2 space-y-3 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Parceiros</h1>
          <button
            onClick={() => setShowRadiusFilter(!showRadiusFilter)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition-all font-semibold ${
              radius !== 9999
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground bg-white'
            }`}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.18), 0 2px 5px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
              transform: 'translateY(0)',
              transition: 'box-shadow 0.15s, transform 0.1s',
            }}
          >
            📍 {radius === 9999 ? 'Raio' : `${radius} km`}
          </button>
        </div>

        {showRadiusFilter && (
          <div className="bg-muted/50 rounded-2xl p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Filtrar por distância</p>
            <div className="flex gap-2 flex-wrap">
              {radiusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRadius(opt.value); setShowRadiusFilter(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    radius === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar parceiros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Stories de categorias */}
        <CategoryStories selected={category} onSelect={setCategory} partners={partners} userLocation={userLocation} />
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!isLoading && (
          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length} parceiro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            {location && radius !== 9999 ? ` em até ${radius} km` : ''}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <span className="text-4xl block mb-2">🔍</span>
            <p className="text-sm">Nenhum parceiro encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const r = ratingMap[p.id];
              return (
                <PartnerCard
                  key={p.id}
                  partner={p}
                  distance={p.distance}
                  avgRating={r ? (r.sum / r.count).toFixed(1) : null}
                  reviewCount={r?.count}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}