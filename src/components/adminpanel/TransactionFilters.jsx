import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DEFAULT_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function TransactionFilters({ selectedTypes, onTypeChange }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const qc = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TransactionType.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transaction-types'] });
      setNewName('');
      setNewColor(DEFAULT_COLORS[0]);
      setShowForm(false);
      toast.success('✅ Tipo criado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TransactionType.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transaction-types'] });
      toast.success('✅ Tipo removido');
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Nome obrigatório');
      return;
    }
    createMutation.mutate({
      name: newName,
      color: newColor,
      icon_name: 'Tag',
      display_order: types.length,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-slate-600 font-semibold">Filtrar por tipo:</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-all shadow-sm"
        >
          <Plus className="w-3 h-3" /> Novo tipo
        </button>
      </div>

      {showForm && (
        <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 flex-wrap">
          <Input
            placeholder="Nome do tipo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            className="text-xs flex-1 min-w-[120px] h-8"
          />
          <div className="flex gap-1">
            {DEFAULT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-md border-2 transition-all ${newColor === c ? 'border-slate-800 scale-110' : 'border-slate-300'}`}
                style={{ backgroundColor: c }}
                title="Selecionar cor"
              />
            ))}
          </div>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="h-8 text-xs"
            size="sm"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => setShowForm(false)}
            variant="outline"
            className="h-8 text-xs"
            size="sm"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {types.map(type => (
          <div key={type.id} className="flex items-center gap-1">
            <button
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
            <button
              onClick={() => deleteMutation.mutate(type.id)}
              disabled={deleteMutation.isPending}
              className="p-1 text-slate-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50"
              title="Remover tipo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
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