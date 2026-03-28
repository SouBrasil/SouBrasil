import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Store, Phone, Loader2, RefreshCw, Eye, SendHorizonal, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RequestProfilePreview from './RequestProfilePreview';
import RequestEditModal from './RequestEditModal';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const statusMap = {
  pendente: { label: 'Pendente', color: 'bg-orange-100 text-orange-700', icon: Clock },
  em_revisao: { label: 'Em Revisão', color: 'bg-yellow-100 text-yellow-700', icon: SendHorizonal },
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
  const [editing, setEditing] = useState(null);
  const [approvedModal, setApprovedModal] = useState(null); // { name, partnerName }
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
    if (approving === r.id) return;
    setApproving(r.id);

    try {
      // GUARD: já aprovado?
      if (r.status === 'aprovado') {
        toast.error('Esta solicitação já foi aprovada!');
        setApproving(null);
        return;
      }

      const defaultPassword = generatePassword();
      const emailClean = (r.owner_email || '').toLowerCase().trim();

      // Se é atualização de perfil existente
      if (r.is_profile_update && r.existing_partner_id) {
        const allImages = [];
        if (r.business_photo_url) allImages.push(r.business_photo_url);
        if (r.logo_url && r.logo_url !== r.business_photo_url) allImages.push(r.logo_url);
        if (Array.isArray(r.marketing_materials)) r.marketing_materials.forEach(img => { if (img && !allImages.includes(img)) allImages.push(img); });
        await base44.entities.Partner.update(r.existing_partner_id, {
          name: r.business_name, category: r.category || 'outro',
          description: r.benefit_description || '',
          discount_value: r.discount_value || r.benefit_description || '',
          discount_description: r.benefit_description || '',
          phone: r.phone || r.whatsapp || '',
          image_url: allImages[0] || r.logo_url || r.business_photo_url || '',
          images: allImages,
          opening_hours: r.opening_hours || '',
          instagram: r.instagram || '', facebook: r.facebook || '',
          tiktok: r.tiktok || '', youtube: r.youtube || '', website: r.website || '',
        });
        // Atualiza status IMEDIATAMENTE
        await base44.entities.PartnerRequest.update(r.id, { status: 'aprovado', notes: notes[r.id] || '' });
        qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
        qc.invalidateQueries({ queryKey: ['ap-pending-count'] });
        qc.invalidateQueries({ queryKey: ['ap-partners-list'] });
        setPreviewing(null);
        setApprovedModal({ name: r.business_name });
        setApproving(null);
        return;
      }

      // Monta galeria de imagens
      const allImages = [];
      if (r.business_photo_url) allImages.push(r.business_photo_url);
      if (r.logo_url && r.logo_url !== r.business_photo_url) allImages.push(r.logo_url);
      if (Array.isArray(r.marketing_materials)) r.marketing_materials.forEach(img => { if (img && !allImages.includes(img)) allImages.push(img); });

      // 1. Criar o parceiro
      const created = await base44.entities.Partner.create({
        name: r.business_name, category: r.category || 'outro',
        description: r.benefit_description || '',
        discount_type: 'beneficio_especial',
        discount_value: r.discount_value || r.benefit_description || '',
        discount_description: r.benefit_description || '',
        address: r.address || '',
        latitude: r.latitude || -15.7801, longitude: r.longitude || -47.9292,
        phone: r.phone || r.whatsapp || '',
        image_url: allImages[0] || '', images: allImages,
        opening_hours: '', usage_limit: 1, unlimited_usage: false, active: true,
        instagram: r.instagram || '', facebook: r.facebook || '',
        tiktok: r.tiktok || '', youtube: r.youtube || '', website: r.website || '',
        cpf: r.cpf || '', cnpj: r.cnpj || '',
      });

      if (!created || !created.id) throw new Error('Falha ao criar o parceiro');

      // 2. Atualizar status da solicitação IMEDIATAMENTE (antes de qualquer passo que possa falhar)
      await base44.entities.PartnerRequest.update(r.id, { status: 'aprovado', notes: notes[r.id] || '' });

      // 3. Criar acesso ao portal (não bloqueia)
      try {
        const allAccesses = await base44.entities.PartnerAccess.list('-created_date', 500);
        const provisionalAccess = allAccesses.find(a => (a.email || '').toLowerCase().trim() === emailClean && a.notes === 'provisional_correction');
        const referralCode = `ref_${created.id.slice(0, 8)}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        if (provisionalAccess) {
          await base44.entities.PartnerAccess.update(provisionalAccess.id, { partner_id: created.id, partner_name: r.business_name, password_hash: defaultPassword, must_change_password: true, active: true, referral_link: referralCode, notes: '' });
        } else if (emailClean) {
          await base44.entities.PartnerAccess.create({ partner_id: created.id, partner_name: r.business_name, email: emailClean, password_hash: defaultPassword, must_change_password: true, active: true, referral_link: referralCode });
        }
      } catch (_e) { /* acesso provisório falhou, continua */ }

      // 4. Enviar e-mail (não bloqueia)
      try {
        if (emailClean) {
          const portalUrl = `${window.location.origin}/PartnerPortal`;
          await base44.integrations.Core.SendEmail({
            to: r.owner_email,
            subject: '🎉 Seu cadastro foi aprovado — Portal Parceiro Sou Brasil!',
            body: `<p>Olá, ${r.owner_name || r.business_name}! Sua solicitação foi <strong>APROVADA! 🎊</strong><br/>E-mail: ${r.owner_email}<br/>Senha: <strong>${defaultPassword}</strong><br/><a href="${portalUrl}">Acessar Portal</a></p><p>— Equipe Sou Brasil</p>`,
          });
        }
      } catch (_e) { /* e-mail falhou, continua */ }

      // 5. Criar usuário (não bloqueia)
      try {
        const existingUser = await base44.entities.User.filter({ email: r.owner_email });
        if (existingUser.length === 0) {
          await base44.functions.invoke('createPartnerUser', { email: r.owner_email, full_name: r.owner_name || r.business_name, partner_id: created.id });
        }
      } catch (_e) { /* criação de usuário falhou, continua */ }

      // 6. Notificação (não bloqueia)
      try {
        await base44.entities.Notification.create({
          title: `🆕 Novo parceiro: ${r.business_name}!`,
          message: `${r.business_name} entrou no Clube Sou Brasil! ${r.benefit_description || r.discount_value || 'Confira os benefícios!'}`,
          type: 'benefit', target: 'all', action_url: '/Partners', sent_at: new Date().toISOString(),
        });
      } catch (_e) { /* notificação falhou, continua */ }

      qc.invalidateQueries({ queryKey: ['ap-requests-list'] });
      qc.invalidateQueries({ queryKey: ['ap-pending-count'] });
      qc.invalidateQueries({ queryKey: ['ap-partners-list'] });
      setPreviewing(null);
      setApprovedModal({ name: r.business_name });
    } catch (err) {
      toast.error('Erro ao aprovar: ' + (err.message || 'tente novamente'));
    } finally {
      setApproving(null);
    }
  };

  const sendBackMutation = useMutation({
    mutationFn: async ({ id, email, name, revisionNotes }) => {
      const emailClean = (email || '').toLowerCase().trim();
      if (!emailClean) throw new Error('E-mail do parceiro não encontrado');

      // Atualiza status para em_revisao
      await base44.entities.PartnerRequest.update(id, {
        status: 'em_revisao',
        revision_notes: revisionNotes || 'Cadastro devolvido para revisão pelo time Sou Brasil.',
      });

      // Gera senha provisória
      const tempPassword = generatePassword();

      // Verifica se já existe PartnerAccess para este email usando list+find
      const allAccesses = await base44.entities.PartnerAccess.list('-created_date', 500);
      const existingAccess = allAccesses.filter(a => (a.email || '').toLowerCase().trim() === emailClean);

      if (existingAccess.length > 0) {
        // Atualiza o acesso existente com nova senha
        await base44.entities.PartnerAccess.update(existingAccess[0].id, {
          password_hash: tempPassword,
          active: true,
          notes: 'provisional_correction',
          must_change_password: false,
        });
      } else {
        // Cria novo acesso provisório — usa o ID do PartnerRequest como partner_id temporário
        await base44.entities.PartnerAccess.create({
          partner_id: id,
          partner_name: name,
          email: emailClean,
          password_hash: tempPassword,
          must_change_password: false,
          active: true,
          referral_link: '',
          notes: 'provisional_correction',
        });
      }

      const portalUrl = `${window.location.origin}/PartnerPortal`;
      const LOGO = 'https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png';
      const emailHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f0;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);"><tr><td style="background:linear-gradient(135deg,#0d3320,#145a32,#1a7a42);padding:32px 24px;text-align:center;"><img src="${LOGO}" alt="Sou Brasil" style="height:60px;width:auto;margin-bottom:8px;" /><br/><span style="color:#f0c040;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">Portal do Parceiro</span></td></tr><tr><td style="background:linear-gradient(135deg,#e65c00,#f9d423);padding:28px 24px;text-align:center;"><div style="font-size:40px;margin-bottom:8px;">📝</div><h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 8px;">Revisão necessária no cadastro</h1><p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Acesse o portal e faça as correções solicitadas</p></td></tr><tr><td style="padding:32px 24px;"><p style="color:#1a3a1a;font-size:16px;font-weight:bold;margin:0 0 16px;">Olá, ${name}!</p><p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px;">Nossa equipe revisou seu cadastro e identificou pontos que precisam de correção. Utilize as credenciais abaixo para acessar o Portal do Parceiro, realizar as correções e reenviar para análise.</p><div style="background:#fff8e1;border:2px solid #f5c400;border-radius:12px;padding:20px;margin:0 0 24px;"><p style="margin:0 0 6px;color:#555;font-size:13px;font-weight:bold;">⚠️ Acesso Provisório — apenas para edição do cadastro</p><p style="margin:0 0 10px;color:#333;font-size:14px;">✉️ <strong>E-mail:</strong> ${emailClean}</p><p style="margin:0;color:#333;font-size:14px;">🔑 <strong>Senha provisória:</strong> <span style="font-family:monospace;background:#f0f4f0;padding:2px 8px;border-radius:4px;font-weight:bold;">${tempPassword}</span></p></div><div style="text-align:center;margin:0 0 24px;"><a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#145a32,#1a7a42);color:#ffffff;font-size:16px;font-weight:bold;padding:14px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(20,90,50,0.4);">ACESSAR PORTAL E CORRIGIR</a></div><div style="background:#f0f7f0;border-radius:8px;padding:16px;"><p style="color:#145a32;font-size:13px;margin:0;line-height:1.6;"><strong>📋 Próximos passos:</strong><br/>1️⃣ Acesse o Portal do Parceiro com suas credenciais<br/>2️⃣ Revise e corrija as informações do cadastro<br/>3️⃣ Salve as alterações e reenvie para análise<br/>4️⃣ Aguarde nossa aprovação por e-mail</p></div></td></tr><tr><td style="background:#1a5c2a;padding:20px 24px;text-align:center;"><p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 4px;">Equipe <em>Sou Brasil</em> 🇧🇷</p><p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0;">Porque todo Brasileiro merece Desconto!</p></td></tr></table></td></tr></table></body></html>`;

      await base44.integrations.Core.SendEmail({
        to: emailClean,
        subject: '📝 Ação necessária: Corrija seu cadastro — Sou Brasil',
        body: emailHTML,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-requests-list'] }); toast.info('Cadastro devolvido! Parceiro receberá e-mail com acesso provisório.'); },
    onError: (err) => toast.error('Erro ao devolver: ' + err.message),
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
  const revisionCount = requests.filter(r => r.status === 'em_revisao').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar solicitação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['pendente', `Pendentes (${pendingCount})`], ['em_revisao', `Em Revisão (${revisionCount})`], ['aprovado', 'Aprovadas'], ['recusado', 'Recusadas'], ['all', 'Todas']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterStatus === val ? (val === 'em_revisao' ? 'bg-yellow-500 text-white' : 'bg-green-600 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
                      {canReview && (
                        <button onClick={() => setEditing(r)} className="text-purple-400 hover:text-purple-600 p-1" title="Editar solicitação">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canReview && (
                        <button onClick={() => setDeleteConfirm(r.id)} className="text-red-400 hover:text-red-600 p-1" title="Excluir solicitação">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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

                      {canReview && (
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
                            {r.status !== 'em_revisao' && (
                              <Button onClick={() => {
                                const revNote = notes[r.id] || '';
                                sendBackMutation.mutate({ id: r.id, email: r.owner_email, name: r.owner_name || r.business_name, revisionNotes: revNote });
                              }}
                                disabled={sendBackMutation.isPending}
                                variant="outline" className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 gap-2 text-xs">
                                <SendHorizonal className="w-3.5 h-3.5" /> Devolver p/ Edição
                              </Button>
                            )}
                          </div>
                          {approving === r.id && (
                            <p className="text-[10px] text-green-700 bg-green-50 rounded px-2 py-1 text-center">
                              ⏳ Criando parceiro, acesso ao portal e enviando e-mail...
                            </p>
                          )}
                        </div>
                      )}

                      {r.status === 'em_revisao' && (
                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-700">📝 Aguardando correção do parceiro</p>
                          {r.revision_notes && <p className="text-xs text-yellow-600 mt-1">{r.revision_notes}</p>}
                          <p className="text-xs text-slate-500 mt-1">O parceiro recebeu e-mail com acesso provisório para corrigir o cadastro.</p>
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


                      </div>
                      )}
                      </CardContent>
                      </Card>
                      );
                      })}
        </div>
      )}
    {editing && (
      <RequestEditModal
        request={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => setEditing(null)}
      />
    )}

    {previewing && (
      <RequestProfilePreview
        request={previewing}
        onBack={() => setPreviewing(null)}
        onApprove={() => handleApprove(previewing)}
        onReject={() => { rejectMutation.mutate({ id: previewing.id, notes: '' }); setPreviewing(null); }}
        onSendBack={() => { sendBackMutation.mutate({ id: previewing.id, email: previewing.owner_email, name: previewing.owner_name || previewing.business_name, revisionNotes: '' }); setPreviewing(null); }}
        approving={approving === previewing?.id}
      />
    )}

    {approvedModal && (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h3 className="font-black text-2xl text-green-700">Parceiro Aprovado!</h3>
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
            <p className="font-bold text-green-800 text-lg">{approvedModal.name}</p>
            <p className="text-sm text-green-600 mt-1">já está publicado e visível para todos os usuários do aplicativo.</p>
          </div>
          <p className="text-xs text-slate-500">O parceiro recebeu as credenciais de acesso por e-mail.</p>
          <Button
            onClick={() => { setApprovedModal(null); setFilterStatus('aprovado'); setExpanded(null); }}
            className="w-full bg-green-600 hover:bg-green-700 font-bold h-12 text-base">
            ✅ OK
          </Button>
        </div>
      </div>
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