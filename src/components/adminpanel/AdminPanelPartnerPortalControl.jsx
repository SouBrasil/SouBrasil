import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Pencil, Trash2, RefreshCw, X, Save, Loader2, Eye, EyeOff, Key, ToggleLeft, ToggleRight, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function AccessModal({ access, partners, onClose, onSaved, isMaster }) {
  const [form, setForm] = useState(access ? {
    partner_id: access.partner_id || '',
    partner_name: access.partner_name || '',
    email: access.email || '',
    password_hash: '',
    active: access.active !== false,
    must_change_password: access.must_change_password || false,
  } : {
    partner_id: '', partner_name: '', email: '', password_hash: generatePassword(), active: true, must_change_password: true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (!payload.password_hash) delete payload.password_hash;
      if (access?.id) {
        return base44.entities.PartnerAccess.update(access.id, payload);
      } else {
        return base44.entities.PartnerAccess.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-partner-accesses'] });
      toast.success(access ? 'Acesso atualizado!' : 'Acesso criado!');
      onSaved();
    },
  });

  const handlePartnerSelect = (e) => {
    const p = partners.find(p => p.id === e.target.value);
    setForm(f => ({ ...f, partner_id: p?.id || '', partner_name: p?.name || '' }));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">{access ? 'Editar Acesso' : 'Novo Acesso ao Portal'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Parceiro Comercial</label>
            <select
              value={form.partner_id}
              onChange={handlePartnerSelect}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione o parceiro...</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">E-mail de Acesso</label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase().trim() }))}
              placeholder="email@parceiro.com.br"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              {access ? 'Nova Senha (deixe vazio para manter)' : 'Senha de Acesso'}
            </label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                value={form.password_hash}
                onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))}
                placeholder={access ? 'Nova senha (opcional)' : 'Senha'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, password_hash: generatePassword() }))}
              className="mt-1 text-xs text-green-600 hover:underline flex items-center gap-1"
            >
              <Key className="w-3 h-3" /> Gerar senha aleatória
            </button>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              Acesso ativo
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.must_change_password} onChange={e => setForm(f => ({ ...f, must_change_password: e.target.checked }))} />
              Trocar senha no login
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.email || !form.partner_id}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" /> Salvar</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanelPartnerPortalControl({ session }) {
  const [search, setSearch] = useState('');
  const [modalAccess, setModalAccess] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const qc = useQueryClient();

  const isMaster = session?.role === 'master';
  const canEdit = ['master', 'administrador'].includes(session?.role);

  const { data: accesses = [], isLoading, refetch } = useQuery({
    queryKey: ['ap-partner-accesses'],
    queryFn: () => base44.entities.PartnerAccess.list('-created_date', 500),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['ap-partners-list'],
    queryFn: () => base44.entities.Partner.list('-created_date', 500),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.PartnerAccess.update(id, { active: !active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-partner-accesses'] }); toast.success('Status atualizado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PartnerAccess.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ap-partner-accesses'] }); toast.success('Acesso removido!'); setDeleteConfirm(null); },
  });

  const filtered = accesses.filter(a =>
    !search ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.partner_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getPartner = (id) => partners.find(p => p.id === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por e-mail ou nome do parceiro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
          {canEdit && (
            <Button onClick={() => setModalAccess(null)} className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" /> Novo Acesso
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} acessos de portal encontrados {isLoading && '(carregando...)'}</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum acesso de portal encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const partner = getPartner(a.partner_id);
            return (
              <Card key={a.id} className={`border-slate-200 ${!a.active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {partner?.image_url
                        ? <img src={partner.image_url} alt={a.partner_name} className="w-full h-full object-cover" />
                        : <Store className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{a.partner_name}</p>
                      <p className="text-xs text-slate-500">{a.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={`text-[10px] ${a.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {a.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {a.must_change_password && (
                          <Badge className="text-[10px] bg-orange-100 text-orange-700">Troca senha</Badge>
                        )}
                        {partner?.subscription_type && partner.subscription_type !== 'none' && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700">{partner.subscription_type}</Badge>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleMutation.mutate({ id: a.id, active: a.active })}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title={a.active ? 'Desativar' : 'Ativar'}
                        >
                          {a.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setModalAccess(a)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isMaster && (
                          <button
                            onClick={() => setDeleteConfirm(a)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modalAccess !== undefined && (
        <AccessModal
          access={modalAccess}
          partners={partners}
          onClose={() => setModalAccess(undefined)}
          onSaved={() => setModalAccess(undefined)}
          isMaster={isMaster}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Remover Acesso?</h3>
            <p className="text-sm text-slate-600">
              Remover acesso de <strong>{deleteConfirm.email}</strong> ao portal de <strong>{deleteConfirm.partner_name}</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancelar</Button>
              <Button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}