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

// Fix leaflet default icon
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

const partnerIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="width:14px;height:14px;background:#e6a817;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function MapPage() {
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos([-23.5505, -46.6333]) // fallback SP
    );
  }, []);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners-map'],
    queryFn: () => base44.entities.Partner.filter({ active: true }),
  });

  if (!userPos) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center space-y-3">
          <Navigation className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground text-sm">Carregando localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] relative">
      <MapContainer center={userPos} zoom={14} className="h-full w-full z-0" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={userPos} />

        {/* User marker */}
        <Marker position={userPos} icon={userIcon}>
          <Popup>
            <span className="font-semibold text-sm">Você está aqui</span>
          </Popup>
        </Marker>

        {/* Partner markers */}
        {partners.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={partnerIcon}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-sm mb-1">{p.name}</p>
                <Badge className="bg-amber-100 text-amber-800 text-xs mb-2">
                  {p.discount_type === 'percentual' ? <Percent className="w-3 h-3 mr-1" /> : <Gift className="w-3 h-3 mr-1" />}
                  {p.discount_value}
                </Badge>
                <p className="text-xs text-gray-600 mb-2">{p.address}</p>
                <Link to={`/PartnerDetail?id=${p.id}`}>
                  <Button size="sm" className="w-full text-xs h-7">Ver detalhes</Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}