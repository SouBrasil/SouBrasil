import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart2, Store, Users, Gift, Bell, Settings, Shield,
  LogOut, Menu, X, UserCog, FileText, TrendingUp, AlertCircle,
  ChevronRight, Home, Trophy, Heart, DollarSign, RefreshCw,
  Briefcase, AlertOctagon, MessageSquare, CheckCircle, GalleryHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminPanelStats from '@/components/adminpanel/AdminPanelStats';
import AdminPanelPartners from '@/components/adminpanel/AdminPanelPartners';
import AdminPanelClients from '@/components/adminpanel/AdminPanelClients';
import AdminPanelEmployees from '@/components/adminpanel/AdminPanelEmployees';
import AdminPanelNotifications from '@/components/adminpanel/AdminPanelNotifications';
import AdminPanelReports from '@/components/adminpanel/AdminPanelReports';
import AdminPanelRequests from '@/components/adminpanel/AdminPanelRequests';
import AdminPanelSettings from '@/components/adminpanel/AdminPanelSettings';
import AdminPanelRaffles from '@/components/adminpanel/AdminPanelRaffles';
import AdminPanelReferrals from '@/components/adminpanel/AdminPanelReferrals';
import AdminPanelFinancial from '@/components/adminpanel/AdminPanelFinancial';
import AdminPanelJobApplications from '@/components/adminpanel/AdminPanelJobApplications';
import AdminPanelTechIssues from '@/components/adminpanel/AdminPanelTechIssues';
import AdminPanelContactMessages from '@/components/adminpanel/AdminPanelContactMessages';
import AdminPanelDuplicateReports from '@/components/adminpanel/AdminPanelDuplicateReports';
import AdminPanelApprovedPartners from '@/components/adminpanel/AdminPanelApprovedPartners';
import AdminPanelCarousels from '@/components/adminpanel/AdminPanelCarousels';
import AdminPanelAffiliates from '@/components/adminpanel/AdminPanelAffiliates';
import AdminPanelAIChat from '@/components/adminpanel/AdminPanelAIChat';

const roleBadgeColors = {
  master: 'bg-red-600 text-white',
  administrador: 'bg-orange-500 text-white',
  supervisor: 'bg-blue-500 text-white',
  colaborador: 'bg-slate-500 text-white',
};

const menuItems = [
  { id: 'overview',       label: 'Visão Geral',         icon: BarChart2,  roles: ['master','administrador','supervisor','colaborador'] },
  { id: 'partners',       label: 'Parceiros',           icon: Store,      roles: ['master','administrador','supervisor'] },
  { id: 'clients',        label: 'Clientes',            icon: Users,      roles: ['master','administrador','supervisor','colaborador'] },
  { id: 'requests',          label: 'Solicitações',           icon: AlertCircle,roles: ['master','administrador','supervisor'] },
  { id: 'approved_partners', label: 'Parceiros Aprovados',    icon: CheckCircle, roles: ['master','administrador','supervisor'] },
  { id: 'raffles',           label: 'Sorteios',               icon: Trophy,     roles: ['master','administrador','supervisor'] },
  { id: 'affiliates',     label: 'Afiliados & Comissões', icon: DollarSign, roles: ['master','administrador','supervisor'] },
  { id: 'referrals',      label: 'Indicações',          icon: Heart,      roles: ['master','administrador','supervisor'] },
  { id: 'financial',      label: 'Financeiro',          icon: DollarSign, roles: ['master','administrador'] },
  { id: 'employees',      label: 'Funcionários',        icon: UserCog,    roles: ['master','administrador'] },
  { id: 'notifications',  label: 'Notificações',        icon: Bell,       roles: ['master','administrador','supervisor'] },
  { id: 'reports',        label: 'Relatórios',          icon: FileText,   roles: ['master','administrador','supervisor'] },
  { id: 'job_applications', label: 'Currículos',          icon: Briefcase,  roles: ['master','administrador'] },
  { id: 'tech_issues',    label: 'Problemas Técnicos',  icon: AlertOctagon, roles: ['master','administrador','supervisor'] },
  { id: 'contact_messages', label: 'Caixa de Mensagens', icon: MessageSquare, roles: ['master','administrador','supervisor'] },
  { id: 'duplicate_reports', label: 'Duplicidades', icon: AlertOctagon, roles: ['master','administrador'] },
  { id: 'carousels',      label: 'Carrosséis',          icon: GalleryHorizontal, roles: ['master','administrador','supervisor'] },
  { id: 'ai_chat',         label: 'Chat IA — Usuários',  icon: MessageSquare, roles: ['master','administrador','supervisor','colaborador'] },
  { id: 'ai_chat_partners', label: 'Chat IA — Parceiros', icon: MessageSquare, roles: ['master','administrador','supervisor','colaborador'] },
  { id: 'settings',       label: 'Configurações',       icon: Settings,   roles: ['master'] },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem('admin_session');
    if (!s) { navigate('/AdminLogin'); return; }
    setSession(JSON.parse(s));
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    navigate('/AdminLogin');
  };

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['ap-pending-count'],
    queryFn: async () => {
      const result = await base44.entities.PartnerRequest.filter({ status: 'pendente' });
      return result || [];
    },
    refetchInterval: 30000,
    staleTime: 0,
    enabled: !!session,
  });

  const { data: newMessages = [] } = useQuery({
    queryKey: ['ap-new-messages-count'],
    queryFn: () => base44.entities.ContactMessage.filter({ status: 'nova' }),
    refetchInterval: 30000,
    enabled: !!session,
  });

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  const allowedMenus = menuItems.filter(m => m.roles.includes(session.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':       return <AdminPanelStats session={session} />;
      case 'partners':       return <AdminPanelPartners session={session} />;
      case 'clients':        return <AdminPanelClients session={session} />;
      case 'requests':           return <AdminPanelRequests session={session} />;
      case 'approved_partners':  return <AdminPanelApprovedPartners session={session} />;
      case 'employees':          return <AdminPanelEmployees session={session} />;
      case 'notifications':  return <AdminPanelNotifications session={session} />;
      case 'reports':        return <AdminPanelReports session={session} />;
      case 'settings':       return <AdminPanelSettings session={session} />;
      case 'raffles':        return <AdminPanelRaffles session={session} />;
      case 'affiliates':     return <AdminPanelAffiliates session={session} />;
      case 'referrals':      return <AdminPanelReferrals session={session} />;
      case 'financial':        return <AdminPanelFinancial session={session} />;
      case 'job_applications': return <AdminPanelJobApplications session={session} />;
      case 'tech_issues':       return <AdminPanelTechIssues session={session} />;
      case 'contact_messages':  return <AdminPanelContactMessages session={session} />;
      case 'duplicate_reports': return <AdminPanelDuplicateReports session={session} />;
      case 'carousels':         return <AdminPanelCarousels session={session} />;
      case 'ai_chat':           return <AdminPanelAIChat session={session} userType="usuario" />;
      case 'ai_chat_partners':  return <AdminPanelAIChat session={session} userType="parceiro" />;
      default:                  return <AdminPanelStats session={session} />;
    }
  };

  const activeMenu = allowedMenus.find(m => m.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Sou Brasil</p>
                <p className="text-slate-400 text-xs">Painel Admin</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">{session.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{session.name}</p>
              <Badge className={`text-[10px] px-1.5 py-0 ${roleBadgeColors[session.role] || 'bg-slate-600 text-white'}`}>
                {session.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowedMenus.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                {item.id === 'requests' && pendingRequests.length > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {pendingRequests.length}
                  </span>
                )}
                {item.id === 'contact_messages' && newMessages.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {newMessages.length}
                  </span>
                )}
                {isActive && item.id !== 'requests' && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            onClick={() => { qc.invalidateQueries(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar Dados
          </button>
          <button
            onClick={() => navigate('/Home')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Home className="w-4 h-4" /> Ver App
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800">{activeMenu?.label || 'Painel'}</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Clube Sou Brasil — Painel Administrativo</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <button
                onClick={() => setActiveTab('requests')}
                className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
              </button>
            )}
            <Badge className={`text-[10px] hidden sm:flex ${roleBadgeColors[session.role] || 'bg-slate-500 text-white'}`}>
              {session.role}
            </Badge>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}