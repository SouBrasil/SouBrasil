import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gift, Search, Calendar, User } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminUsages() {
  const [search, setSearch] = useState('');

  const { data: usages = [], isLoading } = useQuery({
    queryKey: ['admin-all-usages'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 300),
  });

  const filtered = usages.filter((u) =>
    u.partner_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.created_by?.toLowerCase().includes(search.toLowerCase())
  );

  // Group stats
  const todayUsages = usages.filter((u) => {
    const d = new Date(u.used_at || u.created_date);
    return d.toDateString() === new Date().toDateString();
  }).length;

  const weekUsages = usages.filter((u) => {
    const d = new Date(u.used_at || u.created_date);
    return Date.now() - d.getTime() < 7 * 86400000;
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-primary">{todayUsages}</p>
          <p className="text-xs text-muted-foreground">Hoje</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-primary">{weekUsages}</p>
          <p className="text-xs text-muted-foreground">Esta semana</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-primary">{usages.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por parceiro ou usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.id} className="border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{u.partner_name || 'Parceiro'}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />{u.created_by}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(u.used_at || u.created_date).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Usado</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}