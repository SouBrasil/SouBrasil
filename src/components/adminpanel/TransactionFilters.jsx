import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function TransactionFilters({ selectedTypes, onTypeChange }) {
  const { data: types = [] } = useQuery({
    queryKey: ['transaction-types'],
    queryFn: () => base44.entities.TransactionType.list('display_order'),
  });

  // Tipos padrão (legado) + tipos dinâmicos
  const defaultTypes = [
    { name: 'receita', color: '#16a34a', id: 'default-receita' },
    { name: 'despesa', color: '#ef4444', id: 'default-despesa' },
    { name: 'comissao', color: '#3b82f6', id: 'default-comissao' },
    { name: 'mensalidade', color: '#8b5cf6', id: 'default-mensalidade' },
    { name: 'estorno', color: '#f59e0b', id: 'default-estorno' },
  ];

  // Combina tipos padrão + dinâmicos, removendo duplicatas
  const allTypes = [
    ...defaultTypes.filter(dt => !types.find(t => t.name === dt.name)),
    ...types,
  ];

  const toggleType = (typeName) => {
    if (selectedTypes.includes(typeName)) {
      onTypeChange(selectedTypes.filter(t => t !== typeName));
    } else {
      onTypeChange([...selectedTypes, typeName]);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-600 font-semibold block">Filtrar por tipo:</span>
      <div className="flex flex-wrap gap-2">
         {allTypes.map(type => (
           <button
             key={type.id}
             onClick={() => toggleType(type.name)}
             className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all shadow-sm flex items-center gap-1 ${
               selectedTypes.includes(type.name)
                 ? 'text-white shadow-md'
                 : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
             }`}
             style={selectedTypes.includes(type.name) ? { backgroundColor: type.color } : {}}
           >
             <div
               className="w-2 h-2 rounded-full"
               style={{ backgroundColor: type.color }}
             />
             {type.name}
             {selectedTypes.includes(type.name) && (
               <X className="w-3 h-3" />
             )}
           </button>
         ))}
        {selectedTypes.length > 0 && (
          <button
            onClick={() => onTypeChange([])}
            className="text-xs text-slate-400 hover:text-slate-600 underline px-2"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}