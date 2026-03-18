import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, UserCog, Shield, Eye, EyeOff, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const roleBadge = { master: 'bg-red-100 text-red-700', administrador: 'bg-orange-100 text-orange-700', supervisor: 'bg-blue-100 text-blue-700', colaborador: 'bg-slate-100 text-slate-600' };
const roleLabel = { master: 'Master', administrador: 'Administrador', supervisor: 'Supervisor', colaborador: 'Colaborador' };

const emptyForm = { name: '', email: '', password_hash: '', security_key: '', role: 'colaborador', active: true };

export default function AdminPanelEmployees({ session }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPwd, setShowPwd] = useState(false);
  const qc = useQueryClient();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['ap-admins'],
    queryFn: () => base44.entities.AdminUser.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.AdminUser.update(editing.id, data) : base44.entities.AdminUser.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['ap-admins']);
      toast.success(editing ? 'Funcionário atualizado!' : 'Funcionário cadastrado!');
      setShowForm(false); setEditing(null); setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdminUser.delete(id),
    onSuccess: () => { qc.invalidateQueries(['ap-admins']); toast.success('Funcionário removido!'); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.AdminUser.update(id, { active: !active }),
    onSuccess: () => { qc.invalidateQueries(['ap-admins']); toast.success('Status atualizado!'); },
  });

  const handleEdit = (a) => { setEditing(a); setForm({ name: a.name, email: a.email, password_hash: a.password_hash, security_key: a.security_key || '', role: a.role, active: a.active }); setShowForm(true); };
  const handleNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const handleSave = (e) => { e.preventDefault(); if (!form.name || !form.email || !form.password_hash) { toast.error('Preencha nome, e-mail e senha'); return; } saveMutation.mutate(form); };

  const isMaster = session?.role === 'master';
  const filtered = admins.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isMaster && (
          <Button onClick={handleNew} className="gap-2 bg-green-600 hover:bg-green-700 shrink-0">
            <Plus className="w-4 h-4" /> Novo Funcionário
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <h3 className="font-bold text-slate-800 mb-4">{editing ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Nome Completo *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">E-mail *</label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Senha *</label>
                  <div className="relative">
                    <Input type={showPwd ? 'text' : 'password'} value={form.password_hash} onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))} placeholder="Senha de acesso" className="pr-10" />
                    <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Chave de Segurança</label>
                  <Input value={form.security_key} onChange={e => setForm(f => ({ ...f, security_key: e.target.value }))} placeholder="Chave numérica ou texto" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Nível de Acesso</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="colaborador">Colaborador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrador">Administrador</option>
                    {isMaster && <option value="master">Master</option>}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <label className="text-xs font-medium text-slate-600">Ativo</label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-500">{filtered.length} funcionários</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Card key={a.id} className={`border-slate-200 ${!a.active ? 'opacity-60' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="font-bold text-slate-600 text-sm">{a.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">{a.name}</p>
                      <Badge className={`text-[10px] ${roleBadge[a.role] || 'bg-slate-100 text-slate-500'}`}>{roleLabel[a.role] || a.role}</Badge>
                      {!a.active && <Badge className="text-[10px] bg-slate-100 text-slate-500">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{a.email}</p>
                    {a.last_login && <p className="text-[10px] text-slate-400">Último login: {new Date(a.last_login).toLocaleString('pt-BR')}</p>}
                  </div>
                  {isMaster && a.role !== 'master' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => toggleMutation.mutate({ id: a.id, active: a.active })}>
                        <Shield className={`w-3.5 h-3.5 ${a.active ? 'text-green-600' : 'text-slate-400'}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(a)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { if (confirm(`Remover ${a.name}?`)) deleteMutation.mutate(a.id); }}>
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
    </div>
  );
}