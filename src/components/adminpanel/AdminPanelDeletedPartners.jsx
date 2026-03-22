import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Archive, RotateCcw, MapPin, Phone, Calendar, Store, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DeletePermanentlyConfirmModal from '@/components/common/DeletePermanentlyConfirmModal';

const categoryLabels = {
  restaurante: 'Restaurante', lanchonete: 'Lanchonete', pizzaria: 'Pizzaria',
  mercado: 'Mercado', farmacia: 'Farmácia', servicos: 'Serviços', outro: 'Outro',
};

export default function AdminPanelDeletedPartners({ session }) {
  const [search, setSearch] = useState('');
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const qc = useQueryClient();

  const { data: deletedPartners = [], isLoading } = useQuery({
    queryKey: ['deleted-partners'],
    queryFn: () => base44.entities.DeletedPartner.list('-created_date', 200),
  });

  const restoreMutation = useMutation({
    mutationFn: async (dp) => {
      // Recreate partner
      await base44.entities.Partner.create({
        name: dp.name,
        category: dp.category,
        description: dp.description,
        discount_type: dp.discount_type,
        discount_value: dp.discount_value,
        discount_description: dp.discount_description,
        address: dp.address,
        latitude: dp.latitude,
        longitude: dp.longitude,
        phone: dp.phone,
        image_url: dp.image_url,
        opening_hours: dp.opening_hours,
        instagram: dp.instagram,
        facebook: dp.facebook,
        tiktok: dp.tiktok,
        youtube: dp.youtube,
        website: dp.website,
        active: false, // Start inactive until reviewed
      });
      // Remove from deleted
      await base44.entities.DeletedPartner.delete(dp.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['deleted-partners']);
      qc.invalidateQueries(['ap-partners-list']);
      toast.success('Parceiro restaurado com sucesso! Revise e ative no menu Parceiros.');
    },
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: async (dp) => {
      await base44.entities.DeletedPartner.delete(dp.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['deleted-partners']);
      toast.success('Parceiro excluído permanentemente do sistema.');
    },
  });

  const filtered = deletedPartners.filter(dp =>
    dp.name?.toLowerCase().includes(search.toLowerCase()) ||
    dp.category?.toLowerCase().includes(search.toLowerCase()) ||
    dp.address?.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = ['master', 'administrador'].includes(session?.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Archive className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">Arquivo de Parceiros Excluídos</p>
          <p className="text-xs text-amber-600">Todos os dados dos parceiros removidos da plataforma são mantidos aqui para histórico e possível recuperação.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar parceiro excluído..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <p className="text-xs text-slate-500">{filtered.length} parceiro(s) no arquivo</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum parceiro excluído encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(dp => (
            <Card key={dp.id} className="border-amber-100 bg-amber-50/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {dp.image_url ? (
                    <img src={dp.image_url} alt={dp.name} className="w-14 h-14 rounded-xl object-cover shrink-0 grayscale opacity-70" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-slate-700">{dp.name}</p>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[dp.category] || dp.category}</Badge>
                      <Badge className="text-[10px] bg-red-100 text-red-600">Excluído</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      {dp.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{dp.address}</span>}
                      {dp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{dp.phone}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                      <span>Excluído por: {dp.deleted_by || 'sistema'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                        {dp.deleted_at ? new Date(dp.deleted_at).toLocaleDateString('pt-BR') : '—'}
                      </span>
                      {dp.deletion_reason && <span>Motivo: {dp.deletion_reason}</span>}
                    </div>
                    {dp.discount_value && (
                      <p className="text-xs font-semibold text-green-700 mt-1">Desconto: {dp.discount_value}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8 text-xs shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => restoreMutation.mutate(dp)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8 text-xs shrink-0 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => setPartnerToDelete(dp)}
                        disabled={deletePermanentlyMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir Permanentemente
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {partnerToDelete && (
        <DeletePermanentlyConfirmModal
          partnerName={partnerToDelete.name}
          isLoading={deletePermanentlyMutation.isPending}
          onConfirm={() => {
            deletePermanentlyMutation.mutate(partnerToDelete);
            setPartnerToDelete(null);
          }}
          onCancel={() => setPartnerToDelete(null)}
        />
      )}
    </div>
  );
}