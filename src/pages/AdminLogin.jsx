import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Eye, EyeOff, KeyRound, Mail, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', security_key: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.security_key) {
      toast.error('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const allAdmins = await base44.entities.AdminUser.list('-created_date', 100);
      const admin = allAdmins?.find(a =>
        a.email?.trim().toLowerCase() === form.email.trim().toLowerCase() &&
        String(a.password_hash).trim() === String(form.password).trim() &&
        String(a.security_key).trim() === String(form.security_key).trim() &&
        a.active === true
      );
      if (!admin) {
        toast.error('Credenciais inválidas. Verifique e-mail, senha e chave de segurança.');
        setLoading(false);
        return;
      }
      // Store admin session
      sessionStorage.setItem('admin_session', JSON.stringify({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || [],
      }));
      // Update last login
      await base44.entities.AdminUser.update(admin.id, { last_login: new Date().toISOString() });
      toast.success(`Bem-vindo, ${admin.name}!`);
      navigate('/AdminPanel');
    } catch (err) {
      console.error('Erro no login admin:', err);
      toast.error(`Erro ao fazer login: ${err?.message || 'Tente novamente.'}`);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error('Informe o e-mail'); return; }
    setLoading(true);
    try {
      const allAdmins = await base44.entities.AdminUser.list();
      const admin = allAdmins?.find(a =>
        a.email?.trim().toLowerCase() === forgotEmail.trim().toLowerCase() && a.active === true
      );
      if (!admin) {
        toast.error('E-mail não encontrado ou sem permissão de recuperação.');
        setLoading(false);
        return;
      }
      await base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: 'Recuperação de Senha - Painel Sou Brasil',
        body: `Olá, ${admin.name}!\n\nSua senha de acesso ao Painel Administrativo Sou Brasil é:\n\nSenha: ${admin.password_hash}\nChave de Segurança: ${admin.security_key}\n\nPor segurança, altere sua senha após o login.\n\nEquipe Sou Brasil`,
      });
      toast.success('E-mail de recuperação enviado com sucesso!');
      setMode('login');
    } catch (err) {
      toast.error('Erro ao enviar e-mail. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Back to app */}
        <button onClick={() => navigate('/Landing')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-900/50">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Painel Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Sou Brasil — Acesso Restrito</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Chave de Segurança</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="Chave de acesso"
                  value={form.security_key}
                  onChange={e => setForm(f => ({ ...f, security_key: e.target.value }))}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-xl mt-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Entrar no Painel'}
            </Button>

            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-center text-xs text-slate-400 hover:text-green-400 transition-colors mt-2"
            >
              Esqueci minha senha / chave de segurança
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-slate-300 text-sm">Informe seu e-mail cadastrado. Enviaremos suas credenciais de acesso.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">E-mail cadastrado</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar Credenciais por E-mail'}
            </Button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors">
              ← Voltar ao Login
            </button>
          </form>
        )}

        <p className="text-slate-600 text-xs text-center mt-8">Acesso exclusivo para administradores autorizados</p>
      </div>
    </div>
  );
}