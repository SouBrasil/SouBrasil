import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Send, MessageSquare, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function StarRating({ value, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`${sz} transition-colors ${
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PartnerReviews({ partnerId, partnerName, userEmail }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [blockMsg, setBlockMsg] = useState('');
  const queryClient = useQueryClient();

  // Check if user has used this partner's benefit
  const { data: usages = [] } = useQuery({
    queryKey: ['usage-check-review', partnerId, userEmail],
    queryFn: () => base44.entities.BenefitUsage.filter({ partner_id: partnerId }),
    enabled: !!partnerId && !!userEmail,
  });

  const hasUsed = usages.some((u) => u.created_by === userEmail);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', partnerId],
    queryFn: () => base44.entities.PartnerReview.filter({ partner_id: partnerId }, '-created_date', 20),
  });

  const mutation = useMutation({
    mutationFn: async (data) => base44.entities.PartnerReview.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', partnerId]);
      setComment('');
      setRating(5);
      setShowForm(false);
      setBlockMsg('');
    },
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const handleToggleForm = () => {
    if (!hasUsed) {
      setBlockMsg('Você precisa utilizar o benefício deste parceiro antes de poder avaliar. Apresente o voucher em uma visita e depois retorne para avaliar!');
      setShowForm(false);
      return;
    }
    setBlockMsg('');
    setShowForm(!showForm);
  };

  const handleSubmit = async () => {
    const user = await base44.auth.me();
    mutation.mutate({
      partner_id: partnerId,
      partner_name: partnerName,
      rating,
      comment,
      reviewer_name: user?.full_name || 'Cliente',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base">Avaliações</h3>
          {avgRating && (
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-700">{avgRating}</span>
              <span className="text-xs text-yellow-600">({reviews.length})</span>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant={hasUsed ? 'outline' : 'ghost'}
          onClick={handleToggleForm}
          className="rounded-full text-xs gap-1"
        >
          {!hasUsed && <Lock className="w-3 h-3" />}
          {showForm ? 'Cancelar' : 'Avaliar'}
        </Button>
      </div>

      {/* Block message */}
      {blockMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{blockMsg}</p>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium">Sua avaliação</p>
          <StarRating value={rating} onChange={setRating} size="lg" />
          <Textarea
            placeholder="Conte sua experiência..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-xl resize-none h-20 text-sm"
          />
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-primary text-white"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Ainda sem avaliações. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(r.reviewer_name || 'C')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{r.reviewer_name || 'Cliente'}</span>
                </div>
                <StarRating value={r.rating} size="sm" />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              <p className="text-xs text-muted-foreground/60">
                {new Date(r.created_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}