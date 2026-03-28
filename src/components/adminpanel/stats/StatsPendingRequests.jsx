import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Store, Phone, Clock, CheckCircle, XCircle, Loader2, MapPin, Calendar, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categoryLabels = {
  restaurante: 'Restaurante', lanchonete: 'Lanchonete', pizzaria: 'Pizzaria',
  barbearia: 'Barbearia', salao_beleza: 'Salão', academia: 'Academia',
  saude: 'Saúde', farmacia: 'Farmácia', mercado: 'Mercado', loja: 'Loja', outro: 'Outro',
};

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date)) / 86400000);
}

export default function StatsPendingRequests({ onBack, session }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pendente');
  const [filterCategory, setFilterCategory] = useState('');
  const [notes, setNotes] = useState({});
  const [approving, setApproving] = useState(null);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['ap-requests-list'],
    queryFn: () => base44.entities.PartnerRequest.list('-created_date', 500),
    staleTime: 0,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, n }) => base44.entities.PartnerRequest.update(id, { status: 'recusado', notes: n }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
      qc.invalidateQueries({ queryKey: ['ap-pending-count'] });
      toast.success('Solicitação recusada!');
    },
  });

  // Usa a mesma lógica completa de aprovação do AdminPanelRequests
  const handleApprove = async (r) => {
    if (approving === r.id) return;
    setApproving(r.id);
    try {
      const defaultPassword = generatePassword();

      // Monta galeria de imagens (carrossel)
      const allImages = [];
      if (r.business_photo_url) allImages.push(r.business_photo_url);
      if (r.logo_url && r.logo_url !== r.business_photo_url) allImages.push(r.logo_url);
      if (Array.isArray(r.marketing_materials)) {
        r.marketing_materials.forEach(img => { if (img && !allImages.includes(img)) allImages.push(img); });
      }

      // Se é atualização de perfil
      if (r.is_profile_update && r.existing_partner_id) {
        await base44.entities.Partner.update(r.existing_partner_id, {
          name: r.business_name,
          category: r.category || 'outro',
          description: r.benefit_description || '',
          discount_value: r.discount_value || r.benefit_description || '',
          discount_description: r.benefit_description || '',
          phone: r.phone || r.whatsapp || '',
          image_url: allImages[0] || '',
          images: allImages,
          opening_hours: r.opening_hours || '',
          instagram: r.instagram || '',
          facebook: r.facebook || '',
          tiktok: r.tiktok || '',
          youtube: r.youtube || '',
          website: r.website || '',
        });
        await base44.entities.PartnerRequest.update(r.id, { status: 'aprovado', notes: notes[r.id] || '' });
        qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
        qc.invalidateQueries({ queryKey: ['ap-pending-count'] });
        toast.success('Alterações de perfil aprovadas!');
        setApproving(null);
        return;
      }

      const created = await base44.entities.Partner.create({
        name: r.business_name, category: r.category || 'outro',
        description: r.benefit_description || '',
        discount_type: 'beneficio_especial',
        discount_value: r.discount_value || r.benefit_description || '',
        discount_description: r.benefit_description || '',
        address: r.address || '', latitude: r.latitude || -15.7801, longitude: r.longitude || -47.9292,
        phone: r.phone || r.whatsapp || '',
        image_url: allImages[0] || '',
        images: allImages,
        usage_limit: 1, unlimited_usage: false, active: true,
        instagram: r.instagram || '', facebook: r.facebook || '', tiktok: r.tiktok || '',
        youtube: r.youtube || '', website: r.website || '',
        cpf: r.cpf || '', cnpj: r.cnpj || '',
      });

      if (!created || !created.id) throw new Error('Falha ao criar parceiro');

      if (r.owner_email) {
        const emailClean = r.owner_email.toLowerCase().trim();
        const referralCode = `ref_${created.id.slice(0, 8)}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await base44.entities.PartnerAccess.create({
          partner_id: created.id,
          partner_name: r.business_name,
          email: emailClean,
          password_hash: defaultPassword,
          must_change_password: true,
          active: true,
          referral_link: referralCode,
        });
        const portalUrl = `${window.location.origin}/PartnerPortal`;
        await base44.integrations.Core.SendEmail({
          to: r.owner_email,
          subject: '🎉 Seu cadastro foi aprovado — Portal Parceiro Sou Brasil!',
          body: `<p>Olá, ${r.owner_name || r.business_name}!</p><p>Sua solicitação foi <strong>APROVADA!</strong> 🎊</p><p>📧 E-mail: ${r.owner_email}<br/>🔑 Senha provisória: <strong>${defaultPassword}</strong></p><p><a href="${portalUrl}">Acessar Portal do Parceiro</a></p><p>— Equipe Sou Brasil</p>`,
        });
      }

      await base44.entities.PartnerRequest.update(r.id, { status: 'aprovado', notes: notes[r.id] || '' });
      qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
      qc.invalidateQueries({ queryKey: ['ap-pending-count'] });
      toast.success('Aprovado! Parceiro cadastrado e e-mail enviado.');
    } catch (err) {
      toast.error('Erro: ' + err.message);
    }
    setApproving(null);
  };

  const canReview = ['master', 'administrador', 'supervisor'].includes(session?.role);
  const categories = [...new Set(requests.map(r => r.category).filter(Boolean))];

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.business_name?.toLowerCase().includes(q) || r.owner_name?.toLowerCase().includes(q) || r.owner_email?.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchCat = !filterCategory || r.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const pendingCount = requests.filter(r => r.status === 'pendente').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Visão Geral
        </button>
        <h2 className="font-black text-lg text-slate-800">Solicitações</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar solicitação, nome, e-mail, região..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['pendente', `Pendentes (${pendingCount})`], ['em_revisao', 'Em Revisão'], ['aprovado', 'Aprovadas'], ['recusado', 'Recusadas'], ['all', 'Todas']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterStatus === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <Select value={filterCategory || '__all'} onValueChange={v => setFilterCategory(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="Todos segmentos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos segmentos</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} solicitações</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const isOpen = expanded === r.id;
            const dias = daysSince(r.created_date);
            const statusColor = r.status === 'aprovado' ? 'bg-green-100 text-green-700' : r.status === 'recusado' ? 'bg-red-100 text-red-700' : r.status === 'em_revisao' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700';
            const statusLabel = r.status === 'aprovado' ? 'Aprovado' : r.status === 'recusado' ? 'Recusado' : r.status === 'em_revisao' ? 'Em Revisão' : 'Pendente';
            return (
              <Card key={r.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {r.logo_url ? <img src={r.logo_url} alt={r.business_name} className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{r.business_name}</p>
                        <Badge className={`text-[10px] ${statusColor}`}>{statusLabel}</Badge>
                        {r.status === 'pendente' && (
                          <Badge className={`text-[10px] flex items-center gap-1 ${dias > 7 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            <Clock className="w-3 h-3" />{dias}d pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{r.owner_name} • {r.owner_email}</p>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{categoryLabels[r.category] || r.category}</span>
                        {r.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.address.slice(0, 30)}…</span>}
                      </div>
                    </div>
                    <button onClick={() => setExpanded(isOpen ? null : r.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {r.phone && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Telefone</p><p className="font-medium">{r.phone}</p></div>}
                        {r.whatsapp && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">WhatsApp</p><p className="font-medium">{r.whatsapp}</p></div>}
                        {r.cpf && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">CPF</p><p className="font-medium">{r.cpf}</p></div>}
                        {r.cnpj && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">CNPJ</p><p className="font-medium">{r.cnpj}</p></div>}
                        {r.address && <div className="col-span-2 bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Endereço</p><p className="font-medium">{r.address}</p></div>}
                        {r.benefit_description && <div className="col-span-2 bg-green-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Benefício</p><p className="font-medium text-green-800">{r.benefit_description}</p></div>}
                        {r.discount_value && <div className="bg-green-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Desconto</p><p className="font-bold text-green-700">{r.discount_value}</p></div>}
                        <div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Data</p><p className="font-medium">{new Date(r.created_date).toLocaleDateString('pt-BR')}</p></div>
                      </div>

                      {/* Imagens */}
                      {(r.logo_url || r.business_photo_url || (r.marketing_materials?.length > 0)) && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Imagens</p>
                          <div className="grid grid-cols-2 gap-2">
                            {r.logo_url && <div><p className="text-[10px] text-slate-400 mb-1">Logo</p><img src={r.logo_url} alt="Logo" className="w-full h-28 object-cover rounded-xl" /></div>}
                            {r.business_photo_url && <div><p className="text-[10px] text-slate-400 mb-1">Foto do Comércio</p><img src={r.business_photo_url} alt="Comércio" className="w-full h-28 object-cover rounded-xl" /></div>}
                            {Array.isArray(r.marketing_materials) && r.marketing_materials.map((img, i) => (
                              <div key={i}><p className="text-[10px] text-slate-400 mb-1">Material {i + 1}</p><img src={img} alt={`Material ${i + 1}`} className="w-full h-28 object-cover rounded-xl" /></div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(r.instagram || r.facebook || r.website) && (
                        <div className="flex flex-wrap gap-2">
                          {r.instagram && <a href={r.instagram} target="_blank" rel="noreferrer" className="text-[10px] text-pink-600 bg-pink-50 px-2 py-1 rounded-lg">Instagram</a>}
                          {r.facebook && <a href={r.facebook} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Facebook</a>}
                          {r.website && <a href={r.website} target="_blank" rel="noreferrer" className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">Site</a>}
                        </div>
                      )}

                      {canReview && (r.status === 'pendente' || r.status === 'em_revisao') && (
                        <div className="space-y-2">
                          <Input value={notes[r.id] || ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="Observações (opcional)..." className="text-xs" />
                          <div className="flex gap-2">
                            <Button onClick={() => handleApprove(r)} disabled={approving === r.id} className="flex-1 bg-green-600 hover:bg-green-700 gap-1 text-xs">
                              {approving === r.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aprovando...</> : <><CheckCircle className="w-3.5 h-3.5" /> Aprovar</>}
                            </Button>
                            <Button onClick={() => rejectMutation.mutate({ id: r.id, n: notes[r.id] || '' })} variant="outline" className="flex-1 text-red-600 border-red-200 text-xs gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Recusar
                            </Button>
                          </div>
                        </div>
                      )}

                      {r.status === 'aprovado' && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-semibold text-green-700">✓ Solicitação Aprovada</p>
                        </div>
                      )}

                      {r.notes && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500">Obs: {r.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma solicitação encontrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}