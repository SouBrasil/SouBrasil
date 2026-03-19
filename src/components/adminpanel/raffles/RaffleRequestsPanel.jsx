import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gift, Check, X, Eye, Pencil, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const statusBadge = {
  pendente: 'bg-yellow-100 text-yellow-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-600',
  em_edicao: 'bg-blue-100 text-blue-700',
};

export default function RaffleRequestsPanel({ session }) {
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['raffle-requests'],
    queryFn: () => base44.entities.PartnerRaffleRequest.list('-created_date', 100),
  });

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      // Create actual raffle from request
      await base44.entities.Raffle.create({
        title: `Sorteio — ${req.partner_name}`,
        prize: req.description,
        prize_type: req.prize_type,
        image_url: req.image_url,
        draw_date: req.draw_date,
        status: 'ativo',
        target_audience: 'todos',
        redemption_conditions: req.redemption_conditions,
        partner_id: req.partner_id,
        partner_name: req.partner_name,
        unlimited_participants: req.unlimited_participants,
        max_participants: req.max_participants,
        partner_request_id: req.id,
      });
      await base44.entities.PartnerRaffleRequest.update(req.id, { status: 'aprovado' });
      // Notify partner
      await base44.entities.Notification.create({
        title: '🎉 Sorteio aprovado!',
        message: `Seu sorteio foi aprovado pelo time Sou Brasil e já está ativo na plataforma!`,
        type: 'benefit',
        target: 'specific',
        target_email: req.partner_id,
        sent_at: new Date().toISOString(),
      });
    },
    onSuccess: () => { qc.invalidateQueries(['raffle-requests']); toast.success('Sorteio aprovado e publicado!'); setSelected(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.PartnerRaffleRequest.update(id, { status: 'rejeitado' }),
    onSuccess: () => { qc.invalidateQueries(['raffle-requests']); toast.error('Requisição rejeitada.'); setSelected(null); },
  });

  const pendingRequests = requests.filter(r => r.status === 'pendente');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700">Requisições de Sorteio de Parceiros</h3>
        {pendingRequests.length > 0 && (
          <Badge className="bg-yellow-100 text-yellow-700">{pendingRequests.length} pendente(s)</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma requisição de sorteio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {req.image_url && <img src={req.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-sm">{req.partner_name || 'Parceiro'}</p>
                      <Badge className={`text-[10px] ${statusBadge[req.status]}`}>{req.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{req.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tipo: {req.prize_type} | Data: {req.draw_date ? new Date(req.draw_date).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                  {req.status === 'pendente' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs gap-1" onClick={() => approveMutation.mutate(req)}>
                        <Check className="w-3 h-3" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-red-600 border-red-200" onClick={() => rejectMutation.mutate(req.id)}>
                        <X className="w-3 h-3" /> Rejeitar
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