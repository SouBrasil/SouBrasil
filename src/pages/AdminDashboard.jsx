import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, Store, TrendingUp, Bell, BarChart2, Settings,
  ChevronRight, Shield, Gift, DollarSign, Star, LogOut,
  Plus, Send, Eye, UserCheck, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminStats from '@/components/admin/AdminStats';
import AdminPartners from '@/components/admin/AdminPartners';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminUsages from '@/components/admin/AdminUsages';

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
  { id: 'partners', label: 'Parceiros', icon: Store },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'usages', label: 'Benefícios', icon: Gift },
  { id: 'notifications', label: 'Notificações', icon: Bell },
];

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (u?.role !== 'admin') navigate('/Home');
    }).catch(() => navigate('/Home'));
  }, []);

  const handleLogout = () => base44.auth.logout('/');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70">Painel Administrativo</p>
              <p className="font-bold text-sm">Clube Sou Brasil</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/Home">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs">
                <Eye className="w-4 h-4 mr-1" /> App
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border sticky top-[65px] z-40 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex gap-1 px-4 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && <AdminStats />}
        {activeTab === 'partners' && <AdminPartners />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'usages' && <AdminUsages />}
        {activeTab === 'notifications' && <AdminNotifications />}
      </main>
    </div>
  );
}