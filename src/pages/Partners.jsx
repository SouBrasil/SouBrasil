import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal } from 'lucide-react';
import PartnerCard from '@/components/partners/PartnerCard';

const categories = [
  { value: 'all', label: 'Todos' },
  { value: 'restaurante', label: '🍽️ Restaurantes' },
  { value: 'loja', label: '🛍️ Lojas' },
  { value: 'servicos', label: '🔧 Serviços' },
  { value: 'saude', label: '💊 Saúde' },
  { value: 'beleza', label: '💇 Beleza' },
  { value: 'educacao', label: '📚 Educação' },
  { value: 'entretenimento', label: '🎭 Entretenimento' },
  { value: 'mercado', label: '🛒 Mercado' },
  { value: 'oficina', label: '🔩 Oficina' },
  { value: 'outro', label: '📌 Outros' },
];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Partners() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState(null);

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
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Parceiros</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar parceiros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <Badge
            key={cat.value}
            variant={category === cat.value ? 'default' : 'outline'}
            className={`whitespace-nowrap cursor-pointer shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === cat.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
            onClick={() => setCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <PartnerCard key={p.id} partner={p} distance={p.distance} />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum parceiro encontrado.</p>
        </div>
      )}
    </div>
  );
}