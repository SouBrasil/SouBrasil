import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, Star, MapPin, Phone, Pencil, ToggleLeft, ToggleRight, Globe, Instagram } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PartnerFormModal from '@/components/admin/PartnerFormModal';

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

function PartnerDetail({ partner, usages, reviews, onBack, onEdit, canEdit, onToggle }) {
  const myUsages = usages.filter(u => u.partner_id === partner.id);
  const myReviews = reviews.filter(r => r.partner_id === partner.id);
  const avgRating = myReviews.length ? (myReviews.reduce((s, r) => s + (r.rating || 0), 0) / myReviews.length).toFixed(1) : null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
        <ArrowLeft className="w-4 h-4" /> Voltar à lista
      </button>
      <Card className="border-slate-200">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            {partner.image_url ? (
              <img src={partner.image_url} alt={partner.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                <Star className="w-8 h-8 text-green-500" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-black text-lg text-slate-800">{partner.name}</h2>
              <Badge variant="outline" className="text-[10px] mt-1">{categoryLabels[partner.category] || partner.category}</Badge>
              <Badge className={`text-[10px] ml-2 ${partner.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {partner.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => onToggle(partner)}>
                  {partner.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                  {partner.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button size="sm" className="gap-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => onEdit(partner)}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Desconto', value: partner.discount_value },
              { label: 'Tipo', value: partner.discount_type },
              { label: 'Endereço', value: partner.address, col2: true },
              { label: 'Descrição do Benefício', value: partner.discount_description, col2: true },
              { label: 'Telefone', value: partner.phone },
              { label: 'Horário', value: partner.opening_hours },
              { label: 'Uso por dia', value: partner.unlimited_usage ? 'Ilimitado (5min)' : `${partner.usage_limit || 1}x/dia` },
              { label: 'Total de usos', value: myUsages.length.toString() },
              { label: 'Avaliação média', value: avgRating ? `⭐ ${avgRating} (${myReviews.length} avaliações)` : 'Sem avaliações' },
            ].map(({ label, value, col2 }) => value ? (
              <div key={label} className={`bg-slate-50 rounded-xl p-3 ${col2 ? 'col-span-2' : ''}`}>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-slate-700 mt-0.5 text-xs">{value}</p>
              </div>
            ) : null)}
          </div>

          {(partner.instagram || partner.facebook || partner.tiktok || partner.website) && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Redes Sociais</p>
              <div className="flex flex-wrap gap-2">
                {partner.instagram && <a href={partner.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
                {partner.website && <a href={partner.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"><Globe className="w-3.5 h-3.5" /> Site</a>}
              </div>
            </div>
          )}

          {myReviews.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Avaliações Recentes</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {myReviews.slice(0, 10).map((r, i) => (
                  <div key={i} className="bg-yellow-50 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">{r.reviewer_name || 'Anônimo'}</span>
                      <span className="text-xs text-yellow-600">{'⭐'.repeat(r.rating || 0)}</span>
                    </div>
                    {r.comment && <p className="text-[10px] text-slate-500 mt-0.5">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StatsActivePartners({ onBack, session }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Partner.update(id, { active: !active }),
    onSuccess: () => { qc.invalidateQueries(['ap-partners-list']); toast.success('Status atualizado!'); },
  });

  const canEdit = ['master', 'administrador', 'supervisor'].includes(session?.role);
  const activePartners = partners.filter(p => p.active);

  const filtered = activePartners.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  const getUsageCount = (id) => usages.filter(u => u.partner_id === id).length;
  const getAvgRating = (id) => {
    const r = reviews.filter(rv => rv.partner_id === id);
    return r.length ? (r.reduce((s, rv) => s + (rv.rating || 0), 0) / r.length).toFixed(1) : null;
  };

  if (selected && !editingPartner) {
    return (
      <PartnerDetail
        partner={selected}
        usages={usages}
        reviews={reviews}
        onBack={() => setSelected(null)}
        onEdit={(p) => setEditingPartner(p)}
        canEdit={canEdit}
        onToggle={(p) => toggleMutation.mutate({ id: p.id, active: p.active })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Visão Geral
        </button>
        <h2 className="font-black text-lg text-slate-800">Parceiros Ativos</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar parceiro, categoria, endereço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <p className="text-xs text-slate-500">{filtered.length} parceiros ativos</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id} className="border-slate-200 hover:border-green-300 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[p.category] || p.category}</Badge>
                    </div>
                    <p className="text-xs text-green-700 font-semibold">{p.discount_value}</p>
                    <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                      {p.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.address.slice(0, 40)}{p.address.length > 40 ? '…' : ''}</span>}
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                      <span>{getUsageCount(p.id)} usos</span>
                      {getAvgRating(p.id) && <span>⭐ {getAvgRating(p.id)}</span>}
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingPartner && (
        <PartnerFormModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSaved={() => { setEditingPartner(null); qc.invalidateQueries(['ap-partners-list']); toast.success('Parceiro atualizado!'); }}
        />
      )}
    </div>
  );
}