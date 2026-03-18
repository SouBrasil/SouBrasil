import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings, Save, AlertCircle, CheckCircle, Database, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminPanelSettings({ session }) {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { data: partners = [] } = useQuery({ queryKey: ['aps-partners'], queryFn: () => base44.entities.Partner.list('-created_date', 500) });
  const { data: users = [] } = useQuery({ queryKey: ['aps-users'], queryFn: () => base44.entities.User.list('-created_date', 1000) });
  const { data: usages = [] } = useQuery({ queryKey: ['aps-usages'], queryFn: () => base44.entities.BenefitUsage.list('-created_date', 2000) });
  const { data: admins = [] } = useQuery({ queryKey: ['aps-admins'], queryFn: () => base44.entities.AdminUser.list('-created_date', 200) });
  const { data: requests = [] } = useQuery({ queryKey: ['aps-requests'], queryFn: () => base44.entities.PartnerRequest.list('-created_date', 500) });
  const { data: reviews = [] } = useQuery({ queryKey: ['aps-reviews'], queryFn: () => base44.entities.PartnerReview.list('-created_date', 1000) });

  const isMaster = session?.role === 'master';

  const dbStats = [
    { label: 'Clientes cadastrados', value: users.length, icon: '👥' },
    { label: 'Parceiros ativos', value: partners.filter(p => p.active).length, icon: '🏪' },
    { label: 'Total de parceiros', value: partners.length, icon: '🏢' },
    { label: 'Usos de benefícios', value: usages.length, icon: '🎁' },
    { label: 'Avaliações', value: reviews.length, icon: '⭐' },
    { label: 'Solicitações pendentes', value: requests.filter(r => r.status === 'pendente').length, icon: '⏳' },
    { label: 'Funcionários admin', value: admins.filter(a => a.active).length, icon: '🔐' },
  ];

  const infoItems = [
    { label: 'Plataforma', value: 'Base44 Pro' },
    { label: 'Ambiente', value: 'Produção' },
    { label: 'Versão do App', value: 'Sou Brasil v1.0' },
    { label: 'Banco de Dados', value: 'Base44 Entities (NoSQL)' },
    { label: 'Autenticação', value: 'Base44 Auth + Admin Custom' },
    { label: 'Storage', value: 'Base44 File Storage' },
  ];

  return (
    <div className="space-y-6">
      {!isMaster && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Configurações avançadas disponíveis somente para o nível Master.
        </div>
      )}

      {/* DB Stats */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="w-4 h-4" /> Banco de Dados</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dbStats.map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <span className="text-2xl">{s.icon}</span>
                <p className="text-xl font-black text-slate-800 mt-1">{s.value}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Informações do Sistema</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {infoItems.map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-500">{item.label}</span>
                <Badge variant="outline" className="text-xs">{item.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin accounts summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Contas Administrativas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {admins.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${a.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{a.active ? 'Ativo' : 'Inativo'}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isMaster && (
        <Card className="border-red-200 bg-red-50/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-700"><Zap className="w-4 h-4" /> Ações Master</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">Ações de manutenção e configuração do sistema. Use com cuidado.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => { if (confirm('Desativar todos os parceiros inativos?')) toast.info('Função disponível em breve.'); }}>
                Limpar Parceiros Inativos
              </Button>
              <Button variant="outline" size="sm" className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => toast.info('Use a aba Relatórios para exportar dados.')}>
                Exportar Backup
              </Button>
            </div>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium">💡 Dica para o Administrador Master:</p>
              <p className="text-xs text-amber-700 mt-1">Para configurações avançadas como webhooks, variáveis de ambiente, domínio personalizado e planos de cobrança, acesse o painel da plataforma Base44 diretamente em app.base44.com.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}