import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User, FileText, CheckCircle, XCircle, Clock, Eye, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusMap = {
  recebido: { label: 'Recebido', color: 'bg-blue-100 text-blue-700', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminPanelJobApplications({ session }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['job-applications'],
    queryFn: () => base44.entities.JobApplication.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobApplication.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-applications'] }); toast.success('Status atualizado!'); },
  });

  const filtered = applications.filter(a =>
    !search || a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por nome, e-mail, especialidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <p className="text-xs text-slate-500">{filtered.length} candidaturas recebidas</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => {
            const st = statusMap[app.status] || statusMap.recebido;
            const Icon = st.icon;
            return (
              <Card key={app.id} className="border-slate-200 cursor-pointer hover:border-slate-300 transition-colors" onClick={() => setSelected(app)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                      {app.profile_photo_url
                        ? <img src={app.profile_photo_url} alt={app.full_name} className="w-full h-full object-cover" />
                        : <User className="w-5 h-5 text-slate-400 m-auto mt-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-slate-800">{app.full_name}</p>
                        <Badge className={`text-[10px] ${st.color} flex items-center gap-1`}><Icon className="w-3 h-3" />{st.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{app.email} • {app.specialty || 'Sem especialidade'}</p>
                      <p className="text-xs text-slate-400">{app.city}{app.state ? '/' + app.state : ''} • {new Date(app.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl my-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold">Candidatura — {selected.full_name}</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {selected.profile_photo_url && (
                <img src={selected.profile_photo_url} alt="Foto" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-primary/20" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Nome</p><p className="font-medium">{selected.full_name}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">E-mail</p><p className="font-medium text-xs">{selected.email}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Telefone</p><p className="font-medium">{selected.phone || '—'}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">WhatsApp</p><p className="font-medium">{selected.whatsapp || '—'}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Cidade/UF</p><p className="font-medium">{selected.city || '—'}{selected.state ? '/' + selected.state : ''}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-400 uppercase mb-1">Especialidade</p><p className="font-medium">{selected.specialty || '—'}</p></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">Objetivo Profissional:</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{selected.objective}</p>
              </div>
              {selected.resume_url && (
                <a href={selected.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary text-sm font-medium hover:underline">
                  <FileText className="w-4 h-4" /> Ver Currículo
                </a>
              )}
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">Atualizar Status:</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(statusMap).map(([key, { label, color }]) => (
                    <button key={key} onClick={() => { updateMutation.mutate({ id: selected.id, data: { status: key } }); setSelected(s => ({ ...s, status: key })); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected.status === key ? color + ' border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}