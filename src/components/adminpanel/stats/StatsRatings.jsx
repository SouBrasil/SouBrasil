import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, Star, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function StatsRatings({ onBack }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lowest');
  const [expanded, setExpanded] = useState(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['ap-reviews-list'],
    queryFn: () => base44.entities.PartnerReview.list('-created_date', 2000),
  });

  const partnerRatings = useMemo(() => {
    const map = {};
    reviews.forEach(r => {
      if (!map[r.partner_id]) map[r.partner_id] = { id: r.partner_id, name: r.partner_name, reviews: [] };
      map[r.partner_id].reviews.push(r);
    });
    return Object.values(map).map(p => ({
      ...p,
      avg: p.reviews.reduce((s, r) => s + (r.rating || 0), 0) / p.reviews.length,
      count: p.reviews.length,
    }));
  }, [reviews]);

  const filtered = useMemo(() => {
    const f = partnerRatings.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));
    return f.sort((a, b) => sortBy === 'highest' ? b.avg - a.avg : a.avg - b.avg);
  }, [partnerRatings, search, sortBy]);

  const avgGlobal = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—';

  function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
    ));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Visão Geral
        </button>
        <h2 className="font-black text-lg text-slate-800">Avaliação Média</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-2xl font-black text-yellow-500">{avgGlobal}</p>
          <p className="text-[10px] text-slate-500">Média geral</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-2xl font-black text-slate-800">{reviews.length}</p>
          <p className="text-[10px] text-slate-500">Avaliações</p>
        </CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-3 text-center">
          <p className="text-2xl font-black text-slate-800">{partnerRatings.length}</p>
          <p className="text-[10px] text-slate-500">Parceiros</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar parceiro..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {[['lowest', <><TrendingDown className="w-3 h-3" /> Menos avaliados</>], ['highest', <><TrendingUp className="w-3 h-3" /> Mais avaliados</>]].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const isOpen = expanded === p.id;
            const worstReviews = [...p.reviews].sort((a, b) => (a.rating || 0) - (b.rating || 0));
            return (
              <Card key={p.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${i === 0 && sortBy === 'lowest' ? 'bg-red-100 text-red-600' : i === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-50 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex">{renderStars(p.avg)}</div>
                        <span className="text-xs font-bold text-slate-700">{p.avg.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">({p.count} avaliações)</span>
                      </div>
                    </div>
                    <button onClick={() => setExpanded(isOpen ? null : p.id)} className="text-slate-400 hover:text-slate-600">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-bold text-slate-600">Comentários (piores primeiro)</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {worstReviews.map((r, ri) => (
                          <div key={ri} className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700">{r.reviewer_name || 'Anônimo'}</span>
                              <div className="flex items-center gap-1">
                                <div className="flex">{renderStars(r.rating || 0)}</div>
                                <span className="text-xs font-bold text-slate-600">{r.rating}</span>
                              </div>
                            </div>
                            {r.comment && <p className="text-[10px] text-slate-500 leading-relaxed">{r.comment}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(r.created_date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        ))}
                      </div>
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