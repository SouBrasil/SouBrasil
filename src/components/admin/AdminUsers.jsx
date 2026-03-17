import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Crown, User, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminUsers() {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['admin-usages-users'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 500),
  });

  const filtered = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getUserUsageCount = (email) => usages.filter((u) => u.created_by === email).length;

  const getStatusBadge = (u) => {
    if (u.subscription_type === 'annual') return <Badge className="text-[10px] bg-blue-100 text-blue-700">Anual</Badge>;
    if (u.subscription_type === 'monthly') return <Badge className="text-[10px] bg-purple-100 text-purple-700">Mensal</Badge>;
    if (u.trial_start_date) {
      const days = Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000);
      if (days < 7) return <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Trial</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">Free</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} usuários</p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {u.profile_photo ? (
                    <img src={u.profile_photo} alt={u.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{u.full_name || 'Sem nome'}</p>
                      {u.role === 'admin' && <Badge className="text-[10px] bg-red-100 text-red-700">Admin</Badge>}
                      {getStatusBadge(u)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        {getUserUsageCount(u.email)} usos
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(u.created_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}