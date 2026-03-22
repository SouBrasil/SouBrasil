import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const DEFAULT_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const DEFAULT_ICONS = ['DollarSign', 'TrendingUp', 'TrendingDown', 'CreditCard', 'Wallet', 'PiggyBank', 'Zap', 'Flag'];

export default function AdminPanelTransactionTypes() {
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [newIcon, setNewIcon] = useState(DEFAULT_ICONS[0]);
  const qc = useQueryClient();

  const { data: types = [] } = useQuery({
    queryKey: ['transaction-types'],
    queryFn: () => base44.entities.TransactionType.list('display_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TransactionType.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transaction-types'] });
      setNewName('');
      setNewColor(DEFAULT_COLORS[0]);
      setNewIcon(DEFAULT_ICONS[0]);
      toast.success('✅ Tipo criado com sucesso');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransactionType.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transaction-types'] });
      setEditing(null);
      toast.success('✅ Tipo atualizado');
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
      toast.error('Nome é obrigatório');
      return;
    }
    createMutation.mutate({
      name: newName,
      color: newColor,
      icon_name: newIcon,
      display_order: types.length,
    });
  };

  const handleUpdate = (type) => {
    if (!editing.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    updateMutation.mutate({
      id: type.id,
      data: editing,
    });
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover este tipo?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Novo tipo */}
        <Card className="shadow-md">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold mb-3">Novo Tipo de Lançamento</h3>
            <div className="space-y-3">
              <Input
                placeholder="Nome do tipo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                className="text-sm"
              />
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Cor</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {DEFAULT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-slate-800' : 'border-slate-300'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Ícone</label>
                <select
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2 mt-1"
                >
                  {DEFAULT_ICONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Criar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de tipos */}
        <div className="lg:col-span-2 space-y-2">
          {types.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Nenhum tipo criado</div>
          ) : (
            types.map(type => (
              <Card key={type.id} className="shadow-md">
                <CardContent className="p-3">
                  {editing?.id === type.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdate(type)}
                          disabled={updateMutation.isPending}
                          className="flex-1 h-8 text-xs"
                        >
                          Salvar
                        </Button>
                        <Button
                          onClick={() => setEditing(null)}
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-sm font-medium">{type.name}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          onClick={() => setEditing(type)}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(type.id)}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}