// Shared category stories component used by Partners and Map pages
// Pass `partners` and optionally `userLocation` to get dynamic ordering

export const ALL_CATEGORIES = [
  { value: 'all',                  label: 'Todos',              emoji: '⭐', color: '#6366f1' },
  { value: 'restaurante',          label: 'Restaurante',        emoji: '🍽️', color: '#ef4444' },
  { value: 'lanchonete',           label: 'Lanchonete',         emoji: '🍔', color: '#f97316' },
  { value: 'pizzaria',             label: 'Pizzaria',           emoji: '🍕', color: '#dc2626' },
  { value: 'sorveteria',           label: 'Sorveteria',         emoji: '🍦', color: '#ec4899' },
  { value: 'padaria',              label: 'Padaria',            emoji: '🥐', color: '#d97706' },
  { value: 'barbearia',            label: 'Barbearia',          emoji: '💈', color: '#7c3aed' },
  { value: 'salao_beleza',         label: 'Salão',              emoji: '💇', color: '#db2777' },
  { value: 'manicure',             label: 'Manicure',           emoji: '💅', color: '#e11d48' },
  { value: 'spa',                  label: 'Spa',                emoji: '🧖', color: '#059669' },
  { value: 'clinica_estetica',     label: 'Estética',           emoji: '✨', color: '#8b5cf6' },
  { value: 'academia',             label: 'Academia',           emoji: '🏋️', color: '#16a34a' },
  { value: 'saude',                label: 'Saúde',              emoji: '💊', color: '#0ea5e9' },
  { value: 'odontologia',          label: 'Dentista',           emoji: '🦷', color: '#0284c7' },
  { value: 'psicologia',           label: 'Psicologia',         emoji: '🧠', color: '#7c3aed' },
  { value: 'petshop',              label: 'Pet Shop',           emoji: '🐾', color: '#92400e' },
  { value: 'aviario',              label: 'Aviário',            emoji: '🐦', color: '#065f46' },
  { value: 'loja',                 label: 'Loja',               emoji: '🛍️', color: '#1d4ed8' },
  { value: 'conveniencia',         label: 'Conveniência',       emoji: '🏪', color: '#0f766e' },
  { value: 'papelaria',            label: 'Papelaria',          emoji: '📝', color: '#b45309' },
  { value: 'mercado',              label: 'Mercado',            emoji: '🛒', color: '#15803d' },
  { value: 'hortifruti',           label: 'Hortifruti',         emoji: '🥦', color: '#16a34a' },
  { value: 'farmacia',             label: 'Farmácia',           emoji: '💉', color: '#2563eb' },
  { value: 'distribuidora_bebidas',label: 'Bebidas',            emoji: '🍺', color: '#b45309' },
  { value: 'materiais_construcao', label: 'Construção',         emoji: '🧱', color: '#78350f' },
  { value: 'automoveis',           label: 'Automóveis',         emoji: '🚗', color: '#374151' },
  { value: 'loja_automoveis',      label: 'Loja Autos',         emoji: '🏎️', color: '#1f2937' },
  { value: 'oficina',              label: 'Oficina',            emoji: '🔧', color: '#4b5563' },
  { value: 'funilaria',            label: 'Funilaria',          emoji: '🔨', color: '#6b7280' },
  { value: 'borracharia',          label: 'Borracharia',        emoji: '🛞', color: '#374151' },
  { value: 'assistencia_tecnica',  label: 'Assistência Téc.',   emoji: '🔌', color: '#0369a1' },
  { value: 'servicos',             label: 'Serviços',           emoji: '⚙️', color: '#4b5563' },
  { value: 'lavanderia',           label: 'Lavanderia',         emoji: '👕', color: '#0891b2' },
  { value: 'educacao',             label: 'Educação',           emoji: '📚', color: '#7c3aed' },
  { value: 'cursos',               label: 'Cursos',             emoji: '🎓', color: '#6d28d9' },
  { value: 'idiomas',              label: 'Idiomas',            emoji: '🌐', color: '#2563eb' },
  { value: 'entretenimento',       label: 'Entretenimento',     emoji: '🎭', color: '#dc2626' },
  { value: 'lazer',                label: 'Lazer',              emoji: '🎡', color: '#0891b2' },
  { value: 'viagens',              label: 'Viagens',            emoji: '✈️', color: '#0369a1' },
  { value: 'cinema',               label: 'Cinema',             emoji: '🎬', color: '#7c3aed' },
  { value: 'eventos',              label: 'Eventos',            emoji: '🎉', color: '#be185d' },
  { value: 'fotografia',           label: 'Fotografia',         emoji: '📷', color: '#374151' },
  { value: 'outro',                label: 'Outros',             emoji: '📦', color: '#6b7280' },
];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CategoryStories({ selected, onSelect, partners = [], userLocation = null }) {
  // Build counts: nearby (< 10km) first, then total
  const countMap = {};
  const nearbyMap = {};
  ALL_CATEGORIES.forEach(c => { countMap[c.value] = 0; nearbyMap[c.value] = 0; });
  partners.forEach(p => {
    if (p.category && countMap[p.category] !== undefined) {
      countMap[p.category]++;
      if (userLocation) {
        const dist = getDistance(userLocation.lat, userLocation.lng, p.latitude, p.longitude);
        if (dist <= 10) nearbyMap[p.category]++;
      }
    }
  });

  const sortedCategories = [
    ALL_CATEGORIES[0], // "Todos" always first
    ...ALL_CATEGORIES.slice(1).sort((a, b) => {
      const nearbyDiff = (nearbyMap[b.value] || 0) - (nearbyMap[a.value] || 0);
      if (nearbyDiff !== 0) return nearbyDiff;
      return (countMap[b.value] || 0) - (countMap[a.value] || 0);
    }),
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      {sortedCategories.map((cat) => {
        const isActive = selected === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className="flex flex-col items-center gap-1 shrink-0 transition-all"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all"
              style={{
                background: isActive
                  ? `${cat.color}`
                  : `${cat.color}22`,
                border: isActive ? `3px solid ${cat.color}` : '3px solid transparent',
                boxShadow: isActive
                  ? `0 6px 18px ${cat.color}66, 0 3px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)`
                  : '0 4px 10px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {cat.emoji}
            </div>
            <span
              className="text-[10px] font-semibold max-w-[56px] text-center leading-tight"
              style={{ color: isActive ? cat.color : '#6b7280' }}
            >
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}