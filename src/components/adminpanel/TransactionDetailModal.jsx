import { useState } from 'react';
import { X, Save, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TransactionDetailModal({ transaction, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...transaction });
  const [isLoading, setIsLoading] = useState(false);

  // Tipos padrão apenas
  const allTypeOptions = [
    { name: 'receita', label: 'Receita' },
    { name: 'despesa', label: 'Despesa' },
    { name: 'comissao', label: 'Comissão' },
    { name: 'mensalidade', label: 'Mensalidade' },
    { name: 'estorno', label: 'Estorno' },
  ];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate(transaction.id, form);
      setIsEditing(false);
      toast.success('Lançamento atualizado!');
    } catch (err) {
      toast.error('Erro ao atualizar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja deletar este lançamento?')) return;
    setIsLoading(true);
    try {
      await onDelete(transaction.id);
      toast.success('Lançamento deletado!');
      onClose();
    } catch (err) {
      toast.error('Erro ao deletar');
    } finally {
      setIsLoading(false);
    }
  };

  const typeColors = {
    receita: 'bg-green-100 text-green-700',
    despesa: 'bg-red-100 text-red-700',
    comissao: 'bg-blue-100 text-blue-700',
    estorno: 'bg-orange-100 text-orange-700',
    mensalidade: 'bg-purple-100 text-purple-700',
  };

  const statusColors = {
    pago: 'bg-green-100 text-green-700',
    pendente: 'bg-yellow-100 text-yellow-700',
    cancelado: 'bg-red-100 text-red-700',
    estornado: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">Detalhes do Lançamento</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {allTypeOptions.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Valor (R$)</label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="estornado">Estornado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Vencimento</label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Observações</label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tipo</p>
                  <Badge className={typeColors[form.type] || 'bg-slate-100 text-slate-700'}>{form.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <Badge className={statusColors[form.status] || 'bg-slate-100 text-slate-700'}>{form.status}</Badge>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Valor</p>
                <p className="text-2xl font-black text-slate-700">R$ {form.amount.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Descrição</p>
                <p className="text-sm font-medium">{form.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Vencimento</p>
                  <p className="text-sm font-medium">{form.due_date ? new Date(form.due_date).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Criado em</p>
                  <p className="text-sm font-medium">{new Date(form.created_date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {form.paid_at && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Pago em</p>
                  <p className="text-sm font-medium">{new Date(form.paid_at).toLocaleDateString('pt-BR')}</p>
                </div>
              )}

              {form.notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Observações</p>
                  <p className="text-sm">{form.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Fechar
                </Button>
                <Button onClick={() => setIsEditing(true)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Editar
                </Button>
                <Button onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700 w-10 h-9">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}