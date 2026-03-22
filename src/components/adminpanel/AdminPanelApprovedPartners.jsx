import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Edit, Save, X, Trash2, RefreshCw, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminPanelApprovedPartners() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const qc = useQueryClient();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['approved-partners'],
    queryFn: async () => {
      const result = await base44.entities.PartnerRequest.filter({ status: 'aprovado' });
      return result || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PartnerRequest.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approved-partners'] });
      setEditing(null);
      toast.success('Parceiro atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const request = await base44.entities.PartnerRequest.filter({ id });
      if (request.length > 0) {
        const req = request[0];
        // Encontra o Partner relacionado e o desativa
        const partners = await base44.entities.Partner.filter({ 
          name: req.business_name 
        });
        if (partners.length > 0) {
          await base44.entities.Partner.update(partners[0].id, { active: false });
        }
        await base44.entities.PartnerRequest.update(id, { status: 'recusado' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approved-partners'] });
      toast.success('Parceiro desativado');
    },
  });

  const filtered = requests.filter(r => {
    const matchSearch = !search ||
      r.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_email?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const handleEdit = (r) => {
    setEditing(r.id);
    setEditForm({
      business_name: r.business_name,
      owner_name: r.owner_name,
      benefit_description: r.benefit_description,
      discount_value: r.discount_value,
      address: r.address,
      phone: r.phone,
      whatsapp: r.whatsapp,
      instagram: r.instagram,
      facebook: r.facebook,
      tiktok: r.tiktok,
      youtube: r.youtube,
      website: r.website,
      notes: r.notes,
    });
  };

  const handleSave = () => {
    if (!editing) return;
    updateMutation.mutate({ id: editing, data: editForm });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar parceiro aprovado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shrink-0 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} parceiros aprovados</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum parceiro aprovado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(r => (
            <Card key={r.id} className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                {editing === r.id ? (
                  // Modo edição
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Comércio</label>
                      <Input
                        value={editForm.business_name}
                        onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Responsável</label>
                      <Input
                        value={editForm.owner_name}
                        onChange={e => setEditForm(f => ({ ...f, owner_name: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Benefício</label>
                      <Textarea
                        value={editForm.benefit_description}
                        onChange={e => setEditForm(f => ({ ...f, benefit_description: e.target.value }))}
                        className="text-xs h-16"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Desconto</label>
                        <Input
                          value={editForm.discount_value}
                          onChange={e => setEditForm(f => ({ ...f, discount_value: e.target.value }))}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">WhatsApp</label>
                        <Input
                          value={editForm.whatsapp}
                          onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))}
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEditing(null)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                        size="sm"
                      >
                        <Save className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo visualização
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-800">{r.business_name}</p>
                        <p className="text-xs text-slate-500">{r.owner_name}</p>
                      </div>
                      <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        ✓ Aprovado
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">{r.benefit_description}</p>
                    <p className="text-xs font-semibold text-green-700 mb-2">Desconto: {r.discount_value}</p>
                    <p className="text-xs text-slate-500 mb-3">{r.owner_email}</p>
                    <p className="text-xs text-slate-500 mb-3">Tel: {r.phone} | WA: {r.whatsapp}</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(r)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <button
                        onClick={() => deleteMutation.mutate(r.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}