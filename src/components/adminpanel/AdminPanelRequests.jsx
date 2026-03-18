import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Store, Phone, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const statusMap = {
  pendente: { label: 'Pendente', color: 'bg-orange-100 text-orange-700', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminPanelRequests({ session }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pendente');
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes] = useState({});
  const [approving, setApproving] = useState(null);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['ap-requests-list'],
    queryFn: () => base44.entities.PartnerRequest.list('-created_date', 500),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.PartnerRequest.update(id, { status: 'recusado', notes }),
    onSuccess: () => { qc.invalidateQueries(['ap-requests-list']); toast.success('Solicitação recusada!'); },
  });

  const handleApprove = async (r) => {
    setApproving(r.id);
    try {
      const defaultPassword = generatePassword();

      // 1. Criar o parceiro
      const created = await base44.entities.Partner.create({
        name: r.business_name,
        category: r.category || 'outro',
        description: r.benefit_description || '',
        discount_type: 'beneficio_especial',
        discount_value: r.discount_value || r.benefit_description || '',
        discount_description: r.benefit_description || '',
        address: r.address || '',
        latitude: r.latitude || -15.7801,
        longitude: r.longitude || -47.9292,
        phone: r.phone || r.whatsapp || '',
        image_url: r.logo_url || r.business_photo_url || '',
        usage_limit: 1,
        unlimited_usage: false,
        active: true,
        instagram: r.instagram || '',
        facebook: r.facebook || '',
        tiktok: r.tiktok || '',
        youtube: r.youtube || '',
        website: r.website || '',
      });

      // 2. Criar acesso ao portal
      if (r.owner_email) {
        await base44.entities.PartnerAccess.create({
          partner_id: created.id,
          partner_name: r.business_name,
          email: r.owner_email,
          password_hash: defaultPassword,
          must_change_password: true,
          active: true,
        });

        // 3. Enviar e-mail com credenciais
        await base44.integrations.Core.SendEmail({
          to: r.owner_email,
          subject: '🎉 Parabéns! Seu cadastro foi aprovado — Portal Parceiro Sou Brasil',
          body: `Olá, ${r.owner_name || r.business_name}!\n\nSua solicitação para participar do Clube Sou Brasil foi APROVADA! 🎊\n\nAgora você pode acessar o Portal do Parceiro com as credenciais abaixo:\n\n📧 E-mail: ${r.owner_email}\n🔑 Senha provisória: ${defaultPassword}\n\n⚠️ No primeiro acesso, você será solicitado a criar uma senha pessoal.\n\nAcesse o portal em: ${window.location.origin}/PartnerPortal\n\nSeja bem-vindo à família Sou Brasil! 💚\n\n— Equipe Clube Sou Brasil`.trim(),
        });
      }

      // 4. Atualizar status da solicitação
      await base44.entities.PartnerRequest.update(r.id, { status: 'aprovado', notes: notes[r.id] || '' });

      qc.invalidateQueries(['ap-requests-list']);
      toast.success('Solicitação aprovada! Parceiro cadastrado e e-mail enviado.');
    } catch (err) {
      toast.error('Erro ao aprovar solicitação: ' + err.message);
    }
    setApproving(null);
  };

  const updateMutation = { isPending: false }; // kept for compat

  const canReview = ['master', 'administrador', 'supervisor'].includes(session?.role);

  const filtered = requests.filter(r => {
    const matchSearch = r.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pendente').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar solicitação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {[['pendente', `Pendentes (${pendingCount})`], ['aprovado', 'Aprovadas'], ['recusado', 'Recusadas'], ['all', 'Todas']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} solicitações</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const st = statusMap[r.status] || statusMap.pendente;
            const StatusIcon = st.icon;
            const isOpen = expanded === r.id;
            return (
              <Card key={r.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {r.logo_url ? <img src={r.logo_url} alt={r.business_name} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{r.business_name}</p>
                        <Badge className={`text-[10px] ${st.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />{st.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{r.owner_name} • {r.owner_email}</p>
                      <p className="text-xs text-slate-500">{r.category} • {new Date(r.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button onClick={() => setExpanded(isOpen ? null : r.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {r.phone && <span className="flex items-center gap-1 text-slate-600"><Phone className="w-3 h-3" />{r.phone}</span>}
                        {r.whatsapp && <span className="text-slate-600">WhatsApp: {r.whatsapp}</span>}
                        {r.address && <span className="col-span-2 text-slate-600">{r.address}</span>}
                        {r.benefit_description && <span className="col-span-2 text-slate-700 font-medium">{r.benefit_description}</span>}
                        {r.discount_value && <span className="text-green-700 font-semibold">Desconto: {r.discount_value}</span>}
                        {r.cpf && <span className="text-slate-500">CPF: {r.cpf}</span>}
                        {r.cnpj && <span className="text-slate-500">CNPJ: {r.cnpj}</span>}
                      </div>

                      {r.business_photo_url && (
                        <img src={r.business_photo_url} alt="Estabelecimento" className="w-full h-32 object-cover rounded-xl" />
                      )}

                      {canReview && r.status === 'pendente' && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações (opcional)</label>
                            <Input
                              value={notes[r.id] || ''}
                              onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                              placeholder="Motivo da aprovação ou recusa..."
                              className="text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => updateMutation.mutate({ id: r.id, status: 'aprovado', notes: notes[r.id] || '' })}
                              className="flex-1 bg-green-600 hover:bg-green-700 gap-2 text-xs">
                              <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                            </Button>
                            <Button onClick={() => updateMutation.mutate({ id: r.id, status: 'recusado', notes: notes[r.id] || '' })}
                              variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2 text-xs">
                              <XCircle className="w-3.5 h-3.5" /> Recusar
                            </Button>
                          </div>
                        </div>
                      )}

                      {r.notes && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-600">Observações:</p>
                          <p className="text-xs text-slate-500 mt-1">{r.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}