import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, User, CheckCircle2, Loader2, Camera, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function WorkWithUs() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', whatsapp: '',
    city: '', state: '', specialty: '', objective: '',
    profile_photo_url: '', resume_url: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({
        ...f,
        full_name: u.full_name || '',
        email: u.email || '',
        phone: u.phone || '',
        whatsapp: u.whatsapp || u.phone || '',
        city: u.city || '',
        state: u.state || '',
        profile_photo_url: u.profile_photo || '',
      }));
    }).catch(() => {});
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, profile_photo_url: file_url }));
    setUploadingPhoto(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, resume_url: file_url }));
    setUploadingResume(false);
    toast.success('Currículo enviado!');
  };

  const handleSubmit = async () => {
    if (!form.profile_photo_url) { toast.error('Foto de perfil é obrigatória!'); return; }
    if (!form.full_name || !form.email || !form.objective) { toast.error('Preencha todos os campos obrigatórios.'); return; }
    setLoading(true);
    await base44.entities.JobApplication.create({ ...form, reported_at: new Date().toISOString() });
    await base44.integrations.Core.SendEmail({
      to: 'rh@soubrasil.com.br',
      subject: `📋 Novo Currículo: ${form.full_name}`,
      body: `Nome: ${form.full_name}\nEmail: ${form.email}\nTelefone: ${form.phone}\nWhatsApp: ${form.whatsapp}\nCidade: ${form.city}/${form.state}\nEspecialidade: ${form.specialty}\n\nObjetivo:\n${form.objective}\n\nCurrículo: ${form.resume_url || 'Não anexado'}\nFoto: ${form.profile_photo_url}`,
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Candidatura Enviada! 🎉</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Seu cadastro e currículo estão sendo encaminhados para o time de <strong>Recursos Humanos da Sou Brasil</strong>.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Caso a Sou Brasil tenha uma vaga disponível na sua área de atuação, entraremos em contato via <strong>WhatsApp</strong> e <strong>e-mail</strong> com os dados informados.
          </p>
          <Button onClick={() => navigate('/Profile')} className="w-full bg-primary hover:bg-primary/90 rounded-2xl mt-4">
            Voltar ao Perfil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Trabalhe Conosco</h1>
          <p className="text-xs text-muted-foreground">Faça parte do time Sou Brasil</p>
        </div>
      </div>

      {/* Foto de Perfil (obrigatória) */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> Foto de Perfil <span className="text-red-500">*</span></p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-primary/20 flex items-center justify-center shrink-0">
            {form.profile_photo_url
              ? <img src={form.profile_photo_url} alt="Foto" className="w-full h-full object-cover" />
              : <User className="w-8 h-8 text-slate-400" />}
          </div>
          <label className={`flex-1 cursor-pointer border-2 border-dashed border-primary/30 rounded-xl p-3 text-center hover:border-primary/60 transition-colors ${uploadingPhoto ? 'opacity-50' : ''}`}>
            {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /> : <><Upload className="w-5 h-5 mx-auto text-primary mb-1" /><p className="text-xs text-slate-600">Enviar foto</p></>}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
          </label>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <p className="text-sm font-semibold">Dados Pessoais</p>
        <div className="grid grid-cols-1 gap-3">
          <div><label className="text-xs text-slate-600 mb-1 block">Nome Completo *</label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-600 mb-1 block">E-mail *</label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-600 mb-1 block">Telefone</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="text-xs text-slate-600 mb-1 block">WhatsApp</label><Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-600 mb-1 block">Cidade</label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className="text-xs text-slate-600 mb-1 block">Estado</label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} maxLength={2} /></div>
          </div>
          <div><label className="text-xs text-slate-600 mb-1 block">Especialidade / Área de Atuação</label><Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ex: Marketing, Tecnologia, Vendas..." /></div>
        </div>
      </div>

      {/* Objetivo */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <p className="text-sm font-semibold">Objetivo Profissional *</p>
        <Textarea
          value={form.objective}
          onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
          placeholder="Descreva seu objetivo de trabalho com a Sou Brasil e sua especialidade..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Currículo */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Enviar Currículo (opcional)</p>
        <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors ${uploadingResume ? 'opacity-50' : ''}`}>
          {uploadingResume
            ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
            : form.resume_url
            ? <><CheckCircle2 className="w-6 h-6 text-green-600 mb-1" /><p className="text-xs text-green-700 font-medium">Currículo enviado!</p><p className="text-[10px] text-slate-400 mt-0.5">Clique para trocar</p></>
            : <><Upload className="w-6 h-6 text-slate-400 mb-2" /><p className="text-sm text-slate-500">Clique para enviar PDF, DOC ou imagem</p></>}
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleResumeUpload} disabled={uploadingResume} />
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 rounded-2xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Candidatura'}
        </Button>
      </div>
    </div>
  );
}