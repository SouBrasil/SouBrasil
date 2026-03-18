import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ChangePasswordScreen({ partnerAccess, onPasswordChanged }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const isStrong = password.length >= 6;
  const matches = password === confirm;
  const canSave = isStrong && matches && confirm.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    await base44.entities.PartnerAccess.update(partnerAccess.id, {
      password_hash: password,
      must_change_password: false,
    });
    toast.success('Senha criada com sucesso! Bem-vindo ao Portal!');
    setLoading(false);
    onPasswordChanged({ ...partnerAccess, password_hash: password, must_change_password: false });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #0d3320, #145a32)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">

        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 flex items-center justify-center mb-5">
          <Lock className="w-8 h-8 text-green-700" />
        </div>

        <h2 className="text-xl font-black text-slate-800 mb-2">Crie sua senha pessoal</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Por segurança, você precisa criar uma senha pessoal antes de continuar. Use uma senha que só você conheça.
        </p>

        <div className="space-y-3 text-left">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nova senha (mínimo 6 caracteres)</label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="pr-10 rounded-xl"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && !isStrong && (
              <p className="text-[10px] text-red-500 mt-1">Mínimo 6 caracteres</p>
            )}
            {isStrong && <p className="text-[10px] text-green-600 mt-1">✓ Senha válida</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Confirmar senha</label>
            <Input
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              className="rounded-xl"
            />
            {confirm.length > 0 && !matches && (
              <p className="text-[10px] text-red-500 mt-1">As senhas não coincidem</p>
            )}
            {confirm.length > 0 && matches && (
              <p className="text-[10px] text-green-600 mt-1">✓ Senhas coincidem</p>
            )}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!canSave || loading}
          className="w-full h-12 mt-6 font-bold rounded-2xl bg-green-600 hover:bg-green-700">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
            : <><CheckCircle2 className="w-4 h-4 mr-2" />Criar minha senha e entrar</>
          }
        </Button>
      </motion.div>
    </div>
  );
}