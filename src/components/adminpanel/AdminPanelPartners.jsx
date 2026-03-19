import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Star, MapPin, Phone, AlertTriangle, X, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import PartnerFormModal from '@/components/admin/PartnerFormModal';
import AdminPanelDeletedPartners from './AdminPanelDeletedPartners';

function DeleteConfirmDialog({ partner, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Excluir parceiro</h3>
            <p className="text-xs text-slate-500">Esta ação não pode ser desfeita</p>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          Tem certeza que deseja excluir <span className="font-semibold">"{partner.name}"</span>? Todos os dados deste parceiro serão removidos permanentemente.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

const categoryLabels = {
  restaurante: 'Restaurante', lanchonete: 'Lanchonete', pizzaria: 'Pizzaria',
  sorveteria: 'Sorveteria', padaria: 'Padaria', loja: 'Loja',
  conveniencia: 'Conveniência', mercado: 'Mercado', farmacia: 'Farmácia',
  petshop: 'Pet Shop', saude: 'Saúde', clinica_estetica: 'Estética',
  odontologia: 'Dentista', academia: 'Academia', beleza: 'Beleza',
  barbearia: 'Barbearia', salao_beleza: 'Salão', educacao: 'Educação',
  cursos: 'Cursos', servicos: 'Serviços', oficina: 'Oficina',
  automoveis: 'Automóveis', entretenimento: 'Entretenimento', outro: 'Outro',
};

export default function AdminPanelPartners({ session }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingPartner, setEditingPartner] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingPartner, setDeletingPartner] = useState(null);
  const qc = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['ap-partners-list'],
    queryFn: () => base44.entities.Partner.list('-created_date', 500),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['ap-usages-count'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 1000),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['ap-reviews-list'],
    queryFn: () => base44.entities.PartnerReview.list('-created_date', 1000),
  });

  const canEdit = ['master', 'administrador', 'supervisor'].includes(session?.role);

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Partner.update(id, { active: !active }),
    onSuccess: () => { qc.invalidateQueries(['ap-partners-list']); toast.success('Status atualizado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => { qc.invalidateQueries(['ap-partners-list']); toast.success('Parceiro excluído!'); setDeletingPartner(null); },
  });

  const filtered = partners.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.active : !p.active);
    return matchSearch && matchStatus;
  });

  const getUsageCount = (id) => usages.filter(u => u.partner_id === id).length;
  const getAvgRating = (id) => {
    const r = reviews.filter(rv => rv.partner_id === id);
    return r.length ? (r.reduce((s, rv) => s + (rv.rating || 0), 0) / r.length).toFixed(1) : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar parceiro, categoria, endereço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
          {canEdit && (
            <Button onClick={() => { setEditingPartner(null); setShowForm(true); }} className="gap-2 shrink-0 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" /> Novo
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} parceiros encontrados</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id} className={`border-slate-200 transition-opacity ${p.active ? '' : 'opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Star className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[p.category] || p.category}</Badge>
                      <Badge className={`text-[10px] ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      {p.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.address}</span>}
                      {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                      <span className="font-semibold text-green-700">{p.discount_value}</span>
                      <span className="text-slate-500">{getUsageCount(p.id)} usos</span>
                      {getAvgRating(p.id) && <span className="flex items-center gap-1 text-yellow-600"><Star className="w-3 h-3 fill-yellow-400" />{getAvgRating(p.id)}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => toggleMutation.mutate({ id: p.id, active: p.active })}>
                        {p.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditingPartner(p); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeletingPartner(p)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
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
          onSaved={() => { setShowForm(false); setEditingPartner(null); qc.invalidateQueries(['ap-partners-list']); }}
        />
      )}

      {deletingPartner && (
        <DeleteConfirmDialog
          partner={deletingPartner}
          onConfirm={() => deleteMutation.mutate(deletingPartner.id)}
          onCancel={() => setDeletingPartner(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}