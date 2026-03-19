import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trophy, Users, Calendar, Pencil, Trash2, Eye, Share2, Gift, CheckCircle2, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import RaffleFormModal from './raffles/RaffleFormModal';
import RaffleParticipantsModal from './raffles/RaffleParticipantsModal';
import RaffleDrawModal from './raffles/RaffleDrawModal';
import RaffleRequestsPanel from './raffles/RaffleRequestsPanel';
import CompletedRaffles from './raffles/CompletedRaffles';

const statusBadge = {
  rascunho: 'bg-slate-100 text-slate-600',
  ativo: 'bg-green-100 text-green-700',
  realizado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-red-100 text-red-600',
};
const statusLabel = { rascunho: 'Rascunho', ativo: 'Ativo', realizado: 'Realizado', cancelado: 'Cancelado' };
const audienceLabel = { todos: 'Todos', premium: 'Premium', premium_anual: 'Premium Anual', premium_mensal: 'Premium Mensal', trial: 'Trial', parceiros: 'Parceiros' };

export default function AdminPanelRaffles({ session }) {
  const [subMenu, setSubMenu] = useState('active'); // active | completed | requests
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState(null);
  const [viewParticipants, setViewParticipants] = useState(null);
  const [drawRaffle, setDrawRaffle] = useState(null);
  const qc = useQueryClient();

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['ap-raffles'],
    queryFn: () => base44.entities.Raffle.list('-created_date', 200),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['ap-raffle-participants'],
    queryFn: () => base44.entities.RaffleParticipant.list('-created_date', 2000),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Raffle.delete(id),
    onSuccess: () => { qc.invalidateQueries(['ap-raffles']); toast.success('Sorteio excluído!'); },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, display_order }) => base44.entities.Raffle.update(id, { display_order }),
    onSuccess: () => qc.invalidateQueries(['ap-raffles']),
  });

  const shareRaffle = (raffle) => {
    const text = `🎁 Sorteio: ${raffle.title}\n🏆 Prêmio: ${raffle.prize}\n📅 Data: ${new Date(raffle.draw_date).toLocaleDateString('pt-BR')}\n\nParticipe pelo Clube Sou Brasil!`;
    if (navigator.share) navigator.share({ title: raffle.title, text });
    else { navigator.clipboard.writeText(text); toast.success('Texto copiado!'); }
  };

  const activeRaffles = raffles.filter(r => r.status !== 'realizado' && r.status !== 'cancelado');
  const completedRaffles = raffles.filter(r => r.status === 'realizado');

  const filtered = activeRaffles
    .filter(r => {
      const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase()) || r.prize?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (a.display_order !== b.display_order) return (a.display_order || 0) - (b.display_order || 0);
      return new Date(a.draw_date) - new Date(b.draw_date);
    });

  const getParticipantCount = (raffleId) => participants.filter(p => p.raffle_id === raffleId).length;

  const canManage = ['master', 'administrador', 'supervisor'].includes(session?.role);

  return (
    <div className="space-y-4">
      {/* Sub navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[['active', 'Sorteios Ativos'], ['completed', 'Realizados'], ['requests', 'Requisições']].map(([id, label]) => (
          <button key={id} onClick={() => setSubMenu(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${subMenu === id ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {subMenu === 'requests' && <RaffleRequestsPanel session={session} />}
      {subMenu === 'completed' && <CompletedRaffles raffles={completedRaffles} participants={participants} />}

      {subMenu === 'active' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar sorteio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              {[['all','Todos'],['rascunho','Rascunho'],['ativo','Ativo']].map(([v,l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${filterStatus === v ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {l}
                </button>
              ))}
              {canManage && (
                <Button onClick={() => { setEditingRaffle(null); setShowForm(true); }} className="gap-2 bg-green-600 hover:bg-green-700 shrink-0">
                  <Plus className="w-4 h-4" /> Novo Sorteio
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">{filtered.length} sorteios</p>

          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum sorteio encontrado.</p>
              {canManage && <Button onClick={() => setShowForm(true)} className="mt-4 gap-2 bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4" />Criar Sorteio</Button>}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((raffle, index) => {
                const pCount = getParticipantCount(raffle.id);
                const daysLeft = Math.ceil((new Date(raffle.draw_date) - Date.now()) / 86400000);
                const isOverdue = daysLeft < 0 && raffle.status === 'ativo';

                return (
                  <Card key={raffle.id} className="border-slate-200 hover:border-slate-300 transition-all">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {raffle.image_url ? (
                          <img src={raffle.image_url} alt={raffle.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
                            <Trophy className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-bold text-slate-800">{raffle.title}</p>
                            <Badge className={`text-[10px] ${statusBadge[raffle.status]}`}>{statusLabel[raffle.status]}</Badge>
                            <Badge variant="outline" className="text-[10px]">{audienceLabel[raffle.target_audience] || 'Todos'}</Badge>
                            {raffle.automatic_draw && <Badge className="text-[10px] bg-purple-100 text-purple-700">Auto</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 mb-2">{raffle.prize}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />{pCount} participantes
                            </span>
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(raffle.draw_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {daysLeft >= 0 ? ` (${daysLeft}d)` : ' (atrasado)'}
                            </span>
                            {raffle.filter_city && <span>{raffle.filter_city}</span>}
                          </div>
                          {/* Order controls */}
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-[10px] text-slate-400">Ordem:</span>
                            <input
                              type="number"
                              value={raffle.display_order || 0}
                              onChange={e => updateOrderMutation.mutate({ id: raffle.id, display_order: parseInt(e.target.value) || 0 })}
                              className="w-16 h-6 text-xs border border-slate-200 rounded px-1"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="w-8 h-8" title="Ver participantes" onClick={() => setViewParticipants(raffle)}>
                            <Eye className="w-4 h-4 text-blue-500" />
                          </Button>
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditingRaffle(raffle); setShowForm(true); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => shareRaffle(raffle)}>
                                <Share2 className="w-3.5 h-3.5 text-green-600" />
                              </Button>
                              {!raffle.automatic_draw && raffle.status === 'ativo' && (
                                <Button variant="ghost" size="icon" className="w-8 h-8" title="Realizar sorteio" onClick={() => setDrawRaffle(raffle)}>
                                  <Play className="w-3.5 h-3.5 text-orange-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(raffle.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {showForm && (
        <RaffleFormModal
          raffle={editingRaffle}
          onClose={() => { setShowForm(false); setEditingRaffle(null); }}
          onSaved={() => { setShowForm(false); setEditingRaffle(null); qc.invalidateQueries(['ap-raffles']); }}
        />
      )}

      {viewParticipants && (
        <RaffleParticipantsModal
          raffle={viewParticipants}
          participants={participants.filter(p => p.raffle_id === viewParticipants.id)}
          onClose={() => setViewParticipants(null)}
        />
      )}

      {drawRaffle && (
        <RaffleDrawModal
          raffle={drawRaffle}
          participants={participants.filter(p => p.raffle_id === drawRaffle.id)}
          onClose={() => setDrawRaffle(null)}
          onDrawn={() => { setDrawRaffle(null); qc.invalidateQueries(['ap-raffles']); }}
        />
      )}
    </div>
  );
}