import { useState } from 'react';
import { maskCPF } from '@/utils/masks';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fields = [
  { key: 'full_name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo' },
  { key: 'phone', label: 'Telefone / WhatsApp', type: 'tel', placeholder: '(41) 9 9999-9999' },
  { key: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
  { key: 'birth_date', label: 'Data de nascimento', type: 'date', placeholder: '' },
  { key: 'gender', label: 'Gênero', type: 'text', placeholder: 'Ex: Masculino, Feminino, Outro' },
  { key: 'cep', label: 'CEP', type: 'text', placeholder: '00000-000' },
  { key: 'address', label: 'Endereço', type: 'text', placeholder: 'Rua, número' },
  { key: 'neighborhood', label: 'Bairro', type: 'text', placeholder: 'Bairro' },
  { key: 'city', label: 'Cidade', type: 'text', placeholder: 'Cidade' },
  { key: 'state', label: 'Estado (UF)', type: 'text', placeholder: 'PR' },
];

export default function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    birth_date: user?.birth_date || '',
    gender: user?.gender || '',
    cep: user?.cep || '',
    address: user?.address || '',
    neighborhood: user?.neighborhood || '',
    city: user?.city || '',
    state: user?.state || '',
  });
  const [loading, setLoading] = useState(false);

  const handleCEPBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json()).catch(() => null);
    if (res && !res.erro) {
      setForm(f => ({
        ...f,
        address: res.logradouro || f.address,
        neighborhood: res.bairro || f.neighborhood,
        city: res.localidade || f.city,
        state: res.uf || f.state,
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    await base44.auth.updateMe(form);
    toast.success('Perfil atualizado!');
    setLoading(false);
    onSaved(form);
    onClose();
  };

  return (
    <div className="fixed z-50 bg-black/50 flex items-end justify-center" style={{ top: '72px', left: 0, right: 0, bottom: '64px' }}>
      <div className="bg-background rounded-t-3xl w-full max-w-lg flex flex-col" style={{ height: '100%', maxHeight: '100%' }}>
        {/* Header fixo */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold">Editar Perfil</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo rolável com botões no final */}
        <div className="overflow-y-auto flex-1 px-6">
          <div className="space-y-4 pb-2">
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <Input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  onBlur={key === 'cep' ? handleCEPBlur : undefined}
                  className="rounded-xl"
                />
              </div>
            ))}
          </div>
          {/* Botões no final do formulário */}
          <div className="py-4 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl font-bold"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}