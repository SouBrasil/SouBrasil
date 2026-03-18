import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navigation, Percent, Gift } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import CategoryStories from '@/components/partners/CategoryStories';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="width:20px;height:20px;background:#1b7a3d;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function makePartnerIcon(name, imageUrl) {
  if (imageUrl) {
    return new L.DivIcon({
      className: '',
      html: `<div style="width:44px;height:44px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);overflow:hidden;background:#fff;">
        <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;" />
      </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }
  const short = name.slice(0, 2).toUpperCase();
  return new L.DivIcon({
    className: '',
    html: `<div style="min-width:44px;padding:0 6px;height:28px;background:#1b7a3d;color:white;border-radius:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;white-space:nowrap;">${short}</div>`,
    iconSize: [44, 28],
    iconAnchor: [22, 14],
  });
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function MapPage() {
  const [userPos, setUserPos] = useState(null);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos([-23.5505, -46.6333])
    );
  }, []);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners-map'],
    queryFn: () => base44.entities.Partner.filter({ active: true }),
  });

  const filtered = category === 'all' ? partners : partners.filter(p => p.category === category);

  if (!userPos) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 8rem)' }}>
        <div className="text-center space-y-3">
          <Navigation className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground text-sm">Carregando localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Category stories */}
      <div className="bg-white border-b border-border px-3 py-3 z-10 shrink-0">
        <CategoryStories selected={category} onSelect={setCategory} partners={partners} userLocation={userPos ? { lat: userPos[0], lng: userPos[1] } : null} />
      </div>

      {/* Map */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapContainer center={userPos} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={userPos} />

          <Marker position={userPos} icon={userIcon}>
            <Popup>
              <span className="font-semibold text-sm">Você está aqui</span>
            </Popup>
          </Marker>

          {filtered.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={makePartnerIcon(p.name, p.image_url)}
            >
              <Popup>
                <div className="min-w-[180px]">
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                  )}
                  <p className="font-bold text-sm mb-1">{p.name}</p>
                  <Badge className="bg-amber-100 text-amber-800 text-xs mb-2">
                    {p.discount_type === 'percentual' ? <Percent className="w-3 h-3 mr-1" /> : <Gift className="w-3 h-3 mr-1" />}
                    {p.discount_value}
                  </Badge>
                  <p className="text-xs text-gray-600 mb-2">{p.address}</p>
                  {p.opening_hours && <p className="text-xs text-gray-500 mb-2">⏰ {p.opening_hours}</p>}
                  <Link to={`/PartnerDetail?id=${p.id}`}>
                    <Button size="sm" className="w-full text-xs h-7">Ver detalhes</Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}