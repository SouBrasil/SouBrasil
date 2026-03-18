import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Store } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerLoginModal({ onSuccess, onBecomePartner, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // login | forgot

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Find partner access by email
      const accesses = await base44.entities.PartnerAccess.filter({ email: email.toLowerCase().trim() });
      if (accesses.length === 0) {
        toast.error('E-mail não encontrado como parceiro.');
        setLoading(false);
        return;
      }
      const access = accesses[0];
      // Simple password check (stored as plain or hash — here we store as plain for simplicity)
      if (access.password_hash !== password) {
        toast.error('Senha incorreta.');
        setLoading(false);
        return;
      }
      if (!access.active) {
        toast.error('Acesso de parceiro inativo.');
        setLoading(false);
        return;
      }
      toast.success('Bem-vindo ao Portal do Parceiro!');
      onSuccess(access);
    } catch (err) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'Recuperação de acesso — Portal Parceiro Sou Brasil',
        body: `Olá!\n\nVocê solicitou a recuperação da sua senha do Portal do Parceiro Sou Brasil.\n\nPor favor, entre em contato com nossa equipe via WhatsApp: (41) 99617-9617 informando seu e-mail de cadastro.\n\nEquipe Sou Brasil`,
      });
      toast.success('E-mail de recuperação enviado!');
      setMode('login');
    } catch {
      toast.error('Erro ao enviar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <div>
          <p className="text-sm font-bold mb-1">Recuperar senha</p>
          <p className="text-xs text-muted-foreground mb-3">Informe seu e-mail cadastrado como parceiro.</p>
          <Label className="text-xs">E-mail</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seuemail@exemplo.com" />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar e-mail de recuperação'}
        </Button>
        <button type="button" onClick={() => setMode('login')} className="text-xs text-muted-foreground w-full text-center hover:text-foreground transition-colors">
          ← Voltar ao login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <Label className="text-xs">E-mail do parceiro</Label>
        <div className="relative mt-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="email" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seuemail@exemplo.com" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Senha</Label>
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showPass ? 'text' : 'password'}
            className="pl-9 pr-9"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Sua senha"
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Portal'}
      </Button>
      <button type="button" onClick={() => setMode('forgot')} className="text-xs text-muted-foreground w-full text-center hover:text-foreground transition-colors block">
        Esqueci minha senha
      </button>
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={onBecomePartner}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
        >
          <Store className="w-4 h-4" /> Seja um Parceiro Comercial
        </button>
      </div>
      {onBack && (
        <button type="button" onClick={onBack} className="text-xs text-muted-foreground w-full text-center hover:text-foreground transition-colors flex items-center justify-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar para o App
        </button>
      )}
    </form>
  );
}