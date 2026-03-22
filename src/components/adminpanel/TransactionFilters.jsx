import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function TransactionFilters({ selectedTypes, onTypeChange }) {
  const { data: types = [] } = useQuery({
    queryKey: ['transaction-types'],
    queryFn: () => base44.entities.TransactionType.list('display_order'),
  });

  const toggleType = (typeName) => {
    if (selectedTypes.includes(typeName)) {
      onTypeChange(selectedTypes.filter(t => t !== typeName));
    } else {
      onTypeChange([...selectedTypes, typeName]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-slate-500 font-medium">Filtrar por tipo:</span>
      {types.map(type => (
        <button
          key={type.id}
          onClick={() => toggleType(type.name)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            selectedTypes.includes(type.name)
              ? 'text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          style={selectedTypes.includes(type.name) ? { backgroundColor: type.color } : {}}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: type.color }}
          />
          {type.name}
          {selectedTypes.includes(type.name) && (
            <X className="w-3 h-3 ml-1" />
          )}
        </button>
      ))}
      {selectedTypes.length > 0 && (
        <button
          onClick={() => onTypeChange([])}
          className="text-xs text-slate-400 hover:text-slate-600 underline ml-2"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}