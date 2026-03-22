import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Store, Phone, Loader2, RefreshCw, Eye, SendHorizonal, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RequestProfilePreview from './RequestProfilePreview';

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
  const [previewing, setPreviewing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const qc = useQueryClient();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['ap-requests-list'],
    queryFn: async () => {
      const result = await base44.entities.PartnerRequest.list('-created_date', 500);
      return result || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.PartnerRequest.update(id, { status: 'recusado', notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-requests-list'] }); qc.invalidateQueries({ queryKey: ['ap-pending-count'] }); toast.success('Solicitação recusada!'); },
  });

  const handleApprove = async (r) => {
    // Evita cliques múltiplos
    if (approving === r.id) return;
    setApproving(r.id);

    try {
       // Validação robusta de duplicatas
       const checkResult = await base44.functions.invoke('preventPartnerDuplicates', {
         action: 'before_approve',
         cpf: r.cpf || null,
         cnpj: r.cnpj || null
       });

       if (!checkResult.data.can_approve) {
         const dups = checkResult.data.duplicates;
         let msg = 'Não é possível aprovar: ';
         if (dups.find(d => d.field === 'cpf')) {
           msg += `Já existe parceiro ativo com este CPF. `;
         }
         if (dups.find(d => d.field === 'cnpj')) {
           msg += `Já existe parceiro ativo com este CNPJ.`;
         }
         toast.error(msg);
         setApproving(null);
         return;
       }

       // Verifica se já foi aprovado
       const existingRequest = await base44.entities.PartnerRequest.filter({ id: r.id });
       if (existingRequest.length > 0 && existingRequest[0].status === 'aprovado') {
         toast.error('Esta solicitação já foi aprovada!');
         setApproving(null);
         return;
       }

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
         opening_hours: '',
         usage_limit: 1,
         unlimited_usage: false,
         active: true,
         instagram: r.instagram || '',
         facebook: r.facebook || '',
         tiktok: r.tiktok || '',
         youtube: r.youtube || '',
         website: r.website || '',
         cpf: r.cpf || '',
         cnpj: r.cnpj || '',
       });

       if (!created || !created.id) throw new Error('Falha ao criar o parceiro');

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
         const portalUrl = `${window.location.origin}/PartnerPortal`;
         await base44.integrations.Core.SendEmail({
           to: r.owner_email,
           subject: '🎉 Seu cadastro foi aprovado — Portal Parceiro Sou Brasil!',
           body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f0;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);"><tr><td style="background:linear-gradient(135deg,#0d3320,#145a32,#1a7a42);padding:32px 24px;text-align:center;"><img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png" alt="Sou Brasil" style="height:60px;width:auto;margin-bottom:8px;" /><br/><span style="color:#f0c040;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">Portal do Parceiro</span></td></tr><tr><td style="background:linear-gradient(135deg,#1a7a42,#22a85a);padding:28px 24px;text-align:center;"><div style="font-size:40px;margin-bottom:8px;">🎉</div><h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px;">Seu cadastro foi aprovado!</h1><p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Bem-vindo ao Portal Parceiro Sou Brasil!</p></td></tr><tr><td style="padding:32px 24px;"><p style="color:#1a3a1a;font-size:16px;font-weight:bold;margin:0 0 16px;">Olá, ${r.owner_name || r.business_name}!</p><p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 24px;">Sua solicitação foi <strong style="color:#145a32;">APROVADA! 🎊</strong><br/>Utilize as credenciais abaixo para fazer login:</p><div style="background:#f8fdf8;border:2px solid #c8e6c9;border-radius:12px;padding:20px;margin:0 0 24px;"><p style="margin:0 0 10px;color:#333;font-size:14px;">✉️ <strong>E-mail:</strong> ${r.owner_email}</p><p style="margin:0;color:#333;font-size:14px;">🔑 <strong>Senha:</strong> <span style="font-family:monospace;background:#e8f5e9;padding:2px 8px;border-radius:4px;font-weight:bold;">${defaultPassword}</span></p></div><div style="text-align:center;margin:0 0 24px;"><a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#145a32,#1a7a42);color:#ffffff;font-size:16px;font-weight:bold;padding:14px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(20,90,50,0.4);">ACESSAR PORTAL</a></div></td></tr><tr><td style="background:#f8fdf8;border-top:1px solid #e8f5e9;padding:20px 24px;text-align:center;"><p style="color:#145a32;font-size:15px;font-weight:bold;margin:0 0 4px;">Equipe <em>Sou Brasil</em></p></td></tr></table></td></tr></table></body></html>`,
         });
       }

       // 4. Atualizar status da solicitação
       await base44.entities.PartnerRequest.update(r.id, { status: 'aprovado', notes: notes[r.id] || '' });

       // 5. Notificação
       await base44.entities.Notification.create({
         title: `🆕 Novo parceiro: ${r.business_name}!`,
         message: `${r.business_name} entrou no Clube Sou Brasil! ${r.benefit_description || r.discount_value || 'Confira os benefícios!'}`,
         type: 'benefit',
         target: 'all',
         action_url: '/Partners',
         sent_at: new Date().toISOString(),
       });

       qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
       qc.invalidateQueries({ queryKey: ['ap-pending-count'] });
       qc.invalidateQueries({ queryKey: ['ap-partners-list'] });
       toast.success('Solicitação aprovada! Parceiro cadastrado.');
     } catch (err) {
       toast.error('Erro ao aprovar: ' + (err.message || 'tente novamente'));
     } finally {
      setApproving(null);
     }
  };

  const sendBackMutation = useMutation({
    mutationFn: async ({ id, email, name }) => {
      await base44.entities.PartnerRequest.update(id, { status: 'pendente', notes: 'Cadastro devolvido para revisão pelo time Sou Brasil.' });
      if (email) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: '📝 Ação necessária: Revise seu cadastro — Sou Brasil',
          body: `Olá, ${name}!\n\nSua solicitação precisa de correções. Acesse: ${window.location.origin}/PartnerPortal e faça as alterações necessárias.\n\n— Equipe Sou Brasil 💚`,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-requests-list'] }); toast.info('Cadastro devolvido ao parceiro para revisão.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PartnerRequest.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-requests-list'] }); qc.invalidateQueries({ queryKey: ['ap-pending-count'] }); toast.success('Solicitação deletada permanentemente!'); },
  });

  const canReview = ['master', 'administrador', 'supervisor'].includes(session?.role);

  const filtered = requests.filter(r => {
    const matchSearch = !search ||
      r.business_name?.toLowerCase().includes(search.toLowerCase()) ||
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
        <div className="flex gap-2 flex-wrap">
          {[['pendente', `Pendentes (${pendingCount})`], ['aprovado', 'Aprovadas'], ['recusado', 'Recusadas'], ['all', 'Todas']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
          <button onClick={() => refetch()} className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shrink-0 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} solicitações {isLoading && '(carregando...)'}</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma solicitação encontrada</p>
          <p className="text-xs mt-1">
            {filterStatus === 'pendente' ? 'Não há solicitações pendentes no momento.' : 'Tente mudar o filtro acima.'}
          </p>
          <button onClick={() => refetch()} className="mt-3 text-xs text-green-600 underline flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Recarregar dados
          </button>
        </div>
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
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setPreviewing(r)} className="text-blue-400 hover:text-blue-600 p-1" title="Visualizar perfil">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpanded(isOpen ? null : r.id)} className="text-slate-400 hover:text-slate-600 p-1">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
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
                            <Button onClick={() => setPreviewing(r)}
                              variant="outline" className="flex-1 gap-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Eye className="w-3.5 h-3.5" /> Ver Perfil
                            </Button>
                            <Button onClick={() => handleApprove(r)}
                              disabled={approving === r.id}
                              className="flex-1 bg-green-600 hover:bg-green-700 gap-2 text-xs">
                              {approving === r.id
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aprovando...</>
                                : <><CheckCircle className="w-3.5 h-3.5" /> Aprovar</>}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => rejectMutation.mutate({ id: r.id, notes: notes[r.id] || '' })}
                              disabled={rejectMutation.isPending}
                              variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2 text-xs">
                              <XCircle className="w-3.5 h-3.5" /> Recusar
                            </Button>
                            <Button onClick={() => sendBackMutation.mutate({ id: r.id, email: r.owner_email, name: r.owner_name || r.business_name })}
                              disabled={sendBackMutation.isPending}
                              variant="outline" className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 gap-2 text-xs">
                              <SendHorizonal className="w-3.5 h-3.5" /> Devolver p/ Edição
                            </Button>
                          </div>
                          {approving === r.id && (
                            <p className="text-[10px] text-green-700 bg-green-50 rounded px-2 py-1 text-center">
                              ⏳ Criando parceiro, acesso ao portal e enviando e-mail...
                            </p>
                          )}
                        </div>
                      )}

                      {r.status === 'aprovado' && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-semibold text-green-700 mb-1">✓ Solicitação Aprovada</p>
                          <p className="text-xs text-green-600">Acesso ao painel do parceiro foi criado. Para editar o perfil, acesse o menu "Parceiros Aprovados".</p>
                        </div>
                      )}

                      {r.notes && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-600">Observações:</p>
                          <p className="text-xs text-slate-500 mt-1">{r.notes}</p>
                        </div>
                      )}

                      {r.status === 'recusado' && (
                        <div className="flex gap-2">
                          <Button onClick={() => setDeleteConfirm(r.id)}
                            disabled={deleteMutation.isPending}
                            variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2 text-xs">
                            <Trash2 className="w-3.5 h-3.5" /> Deletar Permanentemente
                          </Button>
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
    {previewing && (
      <RequestProfilePreview
        request={previewing}
        onBack={() => setPreviewing(null)}
        onApprove={() => { handleApprove(previewing); setPreviewing(null); }}
        onReject={() => { rejectMutation.mutate({ id: previewing.id, notes: '' }); setPreviewing(null); }}
        approving={approving === previewing?.id}
      />
    )}

    {deleteConfirm && (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="font-black text-lg text-slate-800">Deletar Solicitação?</h3>
          <p className="text-sm text-slate-600">Tem certeza que deseja deletar permanentemente esta solicitação? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirm(null)} 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                deleteMutation.mutate(deleteConfirm);
                setDeleteConfirm(null);
              }} 
              disabled={deleteMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deletar'}
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}