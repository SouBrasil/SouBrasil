import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PartnerFormModal from '@/components/admin/PartnerFormModal';

const categoryLabels = {
  restaurante: 'Restaurante', loja: 'Loja', servicos: 'Serviços',
  saude: 'Saúde', beleza: 'Beleza', educacao: 'Educação',
  entretenimento: 'Entretenimento', mercado: 'Mercado', oficina: 'Oficina', outro: 'Outro',
};

export default function AdminPartners() {
  const [search, setSearch] = useState('');
  const [editingPartner, setEditingPartner] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin-partners-list'],
    queryFn: () => base44.entities.Partner.list('-created_date', 200),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['admin-usages-count'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 500),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Partner.update(id, { active: !active }),
    onSuccess: () => qc.invalidateQueries(['admin-partners-list']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => qc.invalidateQueries(['admin-partners-list']),
  });

  const filtered = partners.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getUsageCount = (partnerId) => usages.filter((u) => u.partner_id === partnerId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar parceiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setEditingPartner(null); setShowForm(true); }} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Parceiro
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} parceiros encontrados</p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className={`border-border transition-opacity ${p.active ? '' : 'opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">{categoryLabels[p.category]}</Badge>
                      {p.active ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 shrink-0">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-primary font-medium">{p.discount_value}</span>
                      <span className="text-xs text-muted-foreground">{getUsageCount(p.id)} usos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => toggleMutation.mutate({ id: p.id, active: p.active })}
                    >
                      {p.active ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => { setEditingPartner(p); setShowForm(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { if (confirm('Excluir parceiro?')) deleteMutation.mutate(p.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <PartnerFormModal
          partner={editingPartner}
          onClose={() => { setShowForm(false); setEditingPartner(null); }}
          onSaved={() => { setShowForm(false); setEditingPartner(null); qc.invalidateQueries(['admin-partners-list']); }}
        />
      )}
    </div>
  );
}