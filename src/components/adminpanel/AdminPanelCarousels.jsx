import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, GripVertical,
  Image, LayoutGrid, ArrowUp, ArrowDown, ExternalLink,
  Loader2, X, Upload, Save, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'sonner';

const CAROUSEL_TYPES = {
  home_banner: { label: 'Banner Principal (Home)', color: 'bg-blue-100 text-blue-700' },
  action_button: { label: 'Botão de Ação (Home)', color: 'bg-purple-100 text-purple-700' },
};

const IMAGE_FIT_OPTIONS = [
  { value: 'cover', label: 'Cobrir (Cover)' },
  { value: 'contain', label: 'Conter (Contain)' },
  { value: 'fill', label: 'Preencher (Fill)' },
];

const ICON_OPTIONS = ['Gift', 'Trophy', 'Store', 'Star', 'Zap', 'Heart', 'Crown', 'Percent', 'Tag', 'Bell', 'Flame', 'Sparkles'];

const GRADIENT_PRESETS = [
  { label: 'Verde', from: '#16a34a', to: '#4ade80' },
  { label: 'Amarelo', from: '#f59e0b', to: '#fde68a' },
  { label: 'Azul', from: '#2563eb', to: '#60a5fa' },
  { label: 'Roxo', from: '#7c3aed', to: '#c084fc' },
  { label: 'Vermelho', from: '#dc2626', to: '#f87171' },
  { label: 'Laranja', from: '#ea580c', to: '#fb923c' },
];

const EMPTY_FORM = {
  carousel_type: 'home_banner',
  title: '',
  subtitle: '',
  image_url: '',
  link_url: '',
  badge_text: '',
  gradient_from: '#16a34a',
  gradient_to: '#4ade80',
  icon_name: 'Gift',
  image_height: 192,
  image_fit: 'cover',
  display_order: 0,
  active: true,
  open_external: false,
};

export default function AdminPanelCarousels() {
  const qc = useQueryClient();
  const [activeType, setActiveType] = useState('home_banner');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['carousel-banners'],
    queryFn: () => base44.entities.CarouselBanner.list('display_order', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) return base44.entities.CarouselBanner.update(editingId, data);
      return base44.entities.CarouselBanner.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carousel-banners'] });
      qc.invalidateQueries({ queryKey: ['carousel-banners-home'] });
      toast.success(editingId ? 'Banner atualizado!' : 'Banner criado!');
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarouselBanner.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carousel-banners'] });
      qc.invalidateQueries({ queryKey: ['carousel-banners-home'] });
      toast.success('Banner removido!');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.CarouselBanner.update(id, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carousel-banners'] });
      qc.invalidateQueries({ queryKey: ['carousel-banners-home'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, display_order }) => base44.entities.CarouselBanner.update(id, { display_order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carousel-banners'] }),
  });

  const filtered = banners.filter(b => b.carousel_type === activeType)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, carousel_type: activeType });
    setShowForm(true);
  };

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      carousel_type: banner.carousel_type || 'home_banner',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      badge_text: banner.badge_text || '',
      gradient_from: banner.gradient_from || '#16a34a',
      gradient_to: banner.gradient_to || '#4ade80',
      icon_name: banner.icon_name || 'Gift',
      image_height: banner.image_height || 192,
      image_fit: banner.image_fit || 'cover',
      display_order: banner.display_order ?? 0,
      active: banner.active !== false,
      open_external: banner.open_external || false,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('image_url', file_url);
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleMove = (banner, direction) => {
    const list = [...filtered];
    const idx = list.findIndex(b => b.id === banner.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const swapBanner = list[swapIdx];
    reorderMutation.mutate({ id: banner.id, display_order: swapBanner.display_order ?? swapIdx });
    reorderMutation.mutate({ id: swapBanner.id, display_order: banner.display_order ?? idx });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Carrosséis</h2>
          <p className="text-sm text-slate-500">Gerencie os banners e botões de ação exibidos no app</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Banner
        </Button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CAROUSEL_TYPES).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setActiveType(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              activeType === key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {key === 'home_banner' ? <Image className="w-3.5 h-3.5 inline mr-1.5" /> : <LayoutGrid className="w-3.5 h-3.5 inline mr-1.5" />}
            {label}
            <span className="ml-2 text-xs opacity-70">
              ({banners.filter(b => b.carousel_type === key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        {activeType === 'home_banner' ? (
          <p>📸 <strong>Banner Principal:</strong> Exibido na tela inicial como carrossel de imagens grandes. Você pode usar imagem de fundo, título, subtítulo e badge.</p>
        ) : (
          <p>🎛️ <strong>Botões de Ação:</strong> Cartões coloridos horizontais no topo do Home (ex: Indique e Ganhe, Sorteios). Configure gradiente, ícone e link de destino.</p>
        )}
      </div>

      {/* Banners List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum banner cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Banner" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((banner, idx) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              idx={idx}
              total={filtered.length}
              onEdit={() => openEdit(banner)}
              onDelete={() => {
                if (confirm('Remover este banner?')) deleteMutation.mutate(banner.id);
              }}
              onToggle={() => toggleMutation.mutate({ id: banner.id, active: !banner.active })}
              onMoveUp={() => handleMove(banner, 'up')}
              onMoveDown={() => handleMove(banner, 'down')}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-black text-lg">{editingId ? 'Editar Banner' : 'Novo Banner'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Tipo de Carrossel</label>
                <select
                  value={form.carousel_type}
                  onChange={e => set('carousel_type', e.target.value)}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                >
                  {Object.entries(CAROUSEL_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Título *</label>
                  <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Promoção de Verão" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Subtítulo</label>
                  <Input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="Ex: Até 50% off" className="rounded-xl" />
                </div>
              </div>

              {/* Image (home_banner only) */}
              {form.carousel_type === 'home_banner' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Imagem de Fundo</label>
                    <div className="flex gap-2">
                      <Input
                        value={form.image_url}
                        onChange={e => set('image_url', e.target.value)}
                        placeholder="https://... ou faça upload"
                        className="rounded-xl flex-1"
                      />
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                        <div className="h-9 px-3 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors border border-slate-200">
                          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Upload
                        </div>
                      </label>
                    </div>
                    {form.image_url && (
                      <img src={form.image_url} alt="preview" className="mt-2 w-full rounded-xl object-cover" style={{ height: form.image_height }} />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Altura do Banner (px)</label>
                      <Input
                        type="number"
                        min={80} max={400}
                        value={form.image_height}
                        onChange={e => set('image_height', Number(e.target.value))}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Ajuste da Imagem</label>
                      <select
                        value={form.image_fit}
                        onChange={e => set('image_fit', e.target.value)}
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      >
                        {IMAGE_FIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Badge (opcional)</label>
                    <Input value={form.badge_text} onChange={e => set('badge_text', e.target.value)} placeholder="Ex: 20% OFF, NOVO, DESTAQUE" className="rounded-xl" />
                  </div>
                </>
              )}

              {/* Gradient (action_button only) */}
              {form.carousel_type === 'action_button' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-2 block">Gradiente de Cores</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {GRADIENT_PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => { set('gradient_from', p.from); set('gradient_to', p.to); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border-2 transition-all"
                          style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})`, borderColor: form.gradient_from === p.from ? '#fff' : 'transparent' }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Cor Inicial</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={form.gradient_from} onChange={e => set('gradient_from', e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" />
                          <Input value={form.gradient_from} onChange={e => set('gradient_from', e.target.value)} className="rounded-xl flex-1 text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Cor Final</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={form.gradient_to} onChange={e => set('gradient_to', e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" />
                          <Input value={form.gradient_to} onChange={e => set('gradient_to', e.target.value)} className="rounded-xl flex-1 text-xs" />
                        </div>
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="mt-3 rounded-xl p-4 flex items-center gap-3 text-white" style={{ background: `linear-gradient(135deg, ${form.gradient_from}, ${form.gradient_to})` }}>
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">✦</div>
                      <div>
                        <p className="text-xs font-bold">{form.title || 'Título'}</p>
                        <p className="text-[10px] opacity-80">{form.subtitle || 'Subtítulo'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Ícone</label>
                    <div className="flex gap-2 flex-wrap">
                      {ICON_OPTIONS.map(icon => (
                        <button
                          key={icon}
                          onClick={() => set('icon_name', icon)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.icon_name === icon ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Link */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Link ao Clicar</label>
                <Input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="Ex: /Pricing ou https://site.com" className="rounded-xl" />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="open_external"
                    checked={form.open_external}
                    onChange={e => set('open_external', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="open_external" className="text-xs text-slate-500">Abrir em nova aba (links externos)</label>
                </div>
              </div>

              {/* Order & Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Ordem de Exibição</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.display_order}
                    onChange={e => set('display_order', Number(e.target.value))}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
                  <button
                    type="button"
                    onClick={() => set('active', !form.active)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${form.active ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    {form.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {form.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t flex gap-3">
              <Button variant="outline" onClick={closeForm} className="flex-1 rounded-xl">Cancelar</Button>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.title || saveMutation.isPending}
                className="flex-1 rounded-xl gap-2"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Salvar Alterações' : 'Criar Banner'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BannerCard({ banner, idx, total, onEdit, onDelete, onToggle, onMoveUp, onMoveDown }) {
  const typeInfo = CAROUSEL_TYPES[banner.carousel_type] || CAROUSEL_TYPES.home_banner;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${!banner.active ? 'opacity-60' : ''}`}>
      <div className="flex items-stretch">
        {/* Preview */}
        <div className="w-24 shrink-0 relative overflow-hidden rounded-l-2xl">
          {banner.carousel_type === 'action_button' ? (
            <div
              className="w-full h-full min-h-[80px] flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${banner.gradient_from || '#16a34a'}, ${banner.gradient_to || '#4ade80'})` }}
            >
              <span className="text-white text-2xl">✦</span>
            </div>
          ) : banner.image_url ? (
            <img src={banner.image_url} alt={banner.title} className="w-full h-full min-h-[80px] object-cover" />
          ) : (
            <div className="w-full h-full min-h-[80px] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <Image className="w-6 h-6 text-slate-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className={`text-[10px] px-1.5 py-0 ${typeInfo.color}`}>{typeInfo.label}</Badge>
                {!banner.active && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inativo</Badge>}
                {banner.badge_text && <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">{banner.badge_text}</Badge>}
              </div>
              <p className="font-bold text-sm text-slate-800 truncate">{banner.title}</p>
              {banner.subtitle && <p className="text-xs text-slate-500 truncate">{banner.subtitle}</p>}
              {banner.link_url && (
                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <ExternalLink className="w-2.5 h-2.5" />
                  {banner.link_url}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onMoveUp} disabled={idx === 0} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors">
                <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button onClick={onMoveDown} disabled={idx === total - 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors">
                <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button onClick={onToggle} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title={banner.active ? 'Desativar' : 'Ativar'}>
                {banner.active ? <Eye className="w-3.5 h-3.5 text-green-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              <button onClick={onEdit} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                <Pencil className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>

          {/* Height info for home_banner */}
          {banner.carousel_type === 'home_banner' && (
            <p className="text-[10px] text-slate-400 mt-1">
              {banner.image_height || 192}px · {banner.image_fit || 'cover'} · ordem {banner.display_order ?? 0}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}