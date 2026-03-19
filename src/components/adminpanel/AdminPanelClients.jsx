import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ClientDetailModal from './ClientDetailModal';

export default function AdminPanelClients({ session }) {
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['ap-clients'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['ap-usages-cli'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 1000),
  });



  const getSubType = (u) => {
    if (u.subscription_type === 'annual') return 'annual';
    if (u.subscription_type === 'monthly') return 'monthly';
    if (u.trial_start_date && Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) < 7) return 'trial';
    return 'free';
  };

  const subBadge = (u) => {
    const t = getSubType(u);
    const map = {
      annual: 'bg-blue-100 text-blue-700',
      monthly: 'bg-purple-100 text-purple-700',
      trial: 'bg-green-100 text-green-700',
      free: 'bg-slate-100 text-slate-500',
    };
    const label = { annual: 'Anual', monthly: 'Mensal', trial: 'Trial', free: 'Free' };
    return <Badge className={`text-[10px] ${map[t]}`}>{label[t]}</Badge>;
  };

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) || u.cpf?.includes(search);
    const matchSub = filterSub === 'all' || getSubType(u) === filterSub;
    return matchSearch && matchSub;
  });

  const getUserUsages = (email) => usages.filter(u => u.created_by === email);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nome, e-mail, CPF, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {[['all', 'Todos'], ['annual', 'Anual'], ['monthly', 'Mensal'], ['trial', 'Trial'], ['free', 'Free']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterSub(val)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${filterSub === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} clientes</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <Card key={u.id} className="border-slate-200 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => setSelected(u)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {u.profile_photo ? (
                    <img src={u.profile_photo} alt={u.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">{u.full_name || 'Sem nome'}</p>
                      {u.role === 'admin' && <Badge className="text-[10px] bg-red-100 text-red-700">Admin App</Badge>}
                      {subBadge(u)}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-slate-400">
                      <span>{getUserUsages(u.email).length} usos</span>
                      <span>Cadastro: {new Date(u.created_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <ClientDetailModal
          user={selected}
          usages={usages}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}