import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Search, User, MapPin, Phone, Crown, Calendar, Filter, X,
  MessageSquare, Send, Loader2, CheckCircle2, Mail, Shield, Briefcase,
  Users, Gift, CreditCard, Home
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function InfoBox({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-center gap-1 text-slate-400 mb-1">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-700 break-all">{value}</p>
    </div>
  );
}

function ClientDetail({ user, usages, onBack }) {
  const myUsages = usages.filter(u => u.created_by === user.email);
  const [showMsg, setShowMsg] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const getSubType = (u) => {
    if (u.subscription_type === 'annual') return 'Anual';
    if (u.subscription_type === 'monthly') return 'Mensal';
    if (u.trial_start_date && Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) < 7) return 'Trial';
    return 'Free';
  };

  const subColor = () => {
    const t = getSubType(user);
    if (t === 'Anual') return 'bg-blue-100 text-blue-700';
    if (t === 'Mensal') return 'bg-purple-100 text-purple-700';
    if (t === 'Trial') return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-500';
  };

  const whatsappNumber = user.phone?.replace(/\D/g, '');
  const fullAddress = [user.street, user.number, user.neighborhood, user.city, user.state, user.cep]
    .filter(Boolean).join(', ');

  const handleSend = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) return;
    setSending(true);
    try {
      await base44.entities.Notification.create({
        title: msgTitle,
        message: msgBody,
        type: 'info',
        target: 'specific',
        target_email: user.email,
        read: false,
        sent_at: new Date().toISOString(),
      });
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `📬 ${msgTitle} — Sou Brasil`,
        body: `Olá, ${user.full_name || 'cliente'}!\n\n${msgBody}\n\nAtenciosamente,\nEquipe Sou Brasil`,
      });
      setSent(true);
      setMsgTitle('');
      setMsgBody('');
      setShowMsg(false);
      setTimeout(() => setSent(false), 4000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
        <ArrowLeft className="w-4 h-4" /> Voltar à lista
      </button>

      {/* Confirmação de envio */}
      {sent && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-700">Mensagem enviada com sucesso!</p>
        </div>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-5 space-y-5">

          {/* Avatar + nome */}
          <div className="flex items-center gap-4">
            {user.profile_photo ? (
              <img src={user.profile_photo} alt={user.full_name} className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <User className="w-7 h-7 text-blue-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg text-slate-800">{user.full_name || 'Sem nome'}</h2>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge className={`text-[10px] ${subColor()}`}>{getSubType(user)}</Badge>
                {user.role === 'admin' && <Badge className="text-[10px] bg-red-100 text-red-700">Admin</Badge>}
              </div>
            </div>
          </div>

          {/* Dados pessoais */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Dados Pessoais</p>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox icon={<Mail className="w-3 h-3" />} label="E-mail" value={user.email} />
              <InfoBox icon={<Phone className="w-3 h-3" />} label="Telefone / WhatsApp" value={user.phone} />
              <InfoBox icon={<Shield className="w-3 h-3" />} label="CPF" value={user.cpf} />
              <InfoBox icon={<Shield className="w-3 h-3" />} label="CNPJ" value={user.cnpj} />
              <InfoBox icon={<Calendar className="w-3 h-3" />} label="Nascimento" value={user.birth_date ? new Date(user.birth_date).toLocaleDateString('pt-BR') : null} />
              <InfoBox icon={<User className="w-3 h-3" />} label="Gênero" value={user.gender} />
              <InfoBox icon={<Briefcase className="w-3 h-3" />} label="Profissão" value={user.profession} />
              <InfoBox icon={<Calendar className="w-3 h-3" />} label="Cadastro" value={new Date(user.created_date).toLocaleDateString('pt-BR')} />
            </div>
          </div>

          {/* Localização */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Localização</p>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox icon={<Home className="w-3 h-3" />} label="Endereço" value={fullAddress || user.address} />
              <InfoBox icon={<MapPin className="w-3 h-3" />} label="Bairro" value={user.neighborhood} />
              <InfoBox icon={<MapPin className="w-3 h-3" />} label="Cidade" value={user.city ? `${user.city}${user.state ? ` - ${user.state}` : ''}` : null} />
              <InfoBox icon={<MapPin className="w-3 h-3" />} label="CEP" value={user.cep} />
            </div>
          </div>

          {/* Assinatura */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Assinatura</p>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox icon={<CreditCard className="w-3 h-3" />} label="Plano" value={getSubType(user)} />
              <InfoBox icon={<Gift className="w-3 h-3" />} label="Usos Totais" value={myUsages.length.toString()} />
              {user.trial_start_date && <InfoBox icon={<Calendar className="w-3 h-3" />} label="Início Trial" value={new Date(user.trial_start_date).toLocaleDateString('pt-BR')} />}
              {user.subscription_start_date && <InfoBox icon={<Crown className="w-3 h-3" />} label="Assinou em" value={new Date(user.subscription_start_date).toLocaleDateString('pt-BR')} />}
              {user.subscription_end_date && <InfoBox icon={<Calendar className="w-3 h-3" />} label="Expira em" value={new Date(user.subscription_end_date).toLocaleDateString('pt-BR')} />}
            </div>
          </div>

          {/* WhatsApp direto */}
          {whatsappNumber && (
            <a
              href={`https://wa.me/55${whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" className="w-full rounded-xl border-green-300 text-green-700 hover:bg-green-50">
                <Phone className="w-4 h-4 mr-2" />
                Abrir WhatsApp do Cliente
              </Button>
            </a>
          )}

          {/* Histórico de usos */}
          {myUsages.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">Histórico de Usos ({myUsages.length})</h3>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {myUsages.map((u, i) => (
                  <div key={i} className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-medium text-slate-700">{u.partner_name || 'Parceiro'}</span>
                    <span className="text-[10px] text-slate-500">{new Date(u.used_at || u.created_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão enviar mensagem */}
          {!showMsg ? (
            <Button className="w-full rounded-xl" onClick={() => setShowMsg(true)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Enviar Notificação ao Usuário
            </Button>
          ) : (
            <div className="space-y-3 border border-primary/20 rounded-xl p-4 bg-primary/5">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Nova Notificação
              </p>
              <Input placeholder="Título da mensagem" value={msgTitle} onChange={e => setMsgTitle(e.target.value)} />
              <Textarea placeholder="Escreva sua mensagem aqui..." value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowMsg(false)}>Cancelar</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSend} disabled={sending || !msgTitle.trim() || !msgBody.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Enviar</>}
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default function StatsClients({ onBack }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [filterSub, setFilterSub] = useState('all');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['ap-clients'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });
  const { data: usages = [] } = useQuery({
    queryKey: ['ap-usages-cli'],
    queryFn: () => base44.entities.BenefitUsage.list('-created_date', 1000),
  });

  const getSubType = (u) => {
    if (u.subscription_type === 'annual') return 'annual';
    if (u.subscription_type === 'monthly') return 'monthly';
    if (u.trial_start_date && Math.floor((Date.now() - new Date(u.trial_start_date)) / 86400000) < 7) return 'trial';
    return 'free';
  };

  const states = [...new Set(users.map(u => u.state).filter(Boolean))].sort();
  const cities = [...new Set(users.filter(u => !filterState || u.state === filterState).map(u => u.city).filter(Boolean))].sort();

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(search) || u.cpf?.includes(search) || u.cnpj?.includes(search);
    const matchSub = filterSub === 'all' || getSubType(u) === filterSub;
    const matchState = !filterState || u.state === filterState;
    const matchCity = !filterCity || u.city === filterCity;
    return matchSearch && matchSub && matchState && matchCity;
  });

  if (selected) return <ClientDetail user={selected} usages={usages} onBack={() => setSelected(null)} />;

  const subBadgeClass = { annual: 'bg-blue-100 text-blue-700', monthly: 'bg-purple-100 text-purple-700', trial: 'bg-green-100 text-green-700', free: 'bg-slate-100 text-slate-500' };
  const subLabel = { annual: 'Anual', monthly: 'Mensal', trial: 'Trial', free: 'Free' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Visão Geral
        </button>
        <h2 className="font-black text-lg text-slate-800">Total de Clientes</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Nome, e-mail, CPF, CNPJ, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-10" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-3.5 h-3.5" /> Filtros {(filterSub !== 'all' || filterState || filterCity) && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </Button>
          <div className="flex gap-2 overflow-x-auto">
            {[['all', 'Todos'], ['annual', 'Anual'], ['monthly', 'Mensal'], ['trial', 'Trial'], ['free', 'Free']].map(([val, label]) => (
              <button key={val} onClick={() => setFilterSub(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${filterSub === val ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <Card className="border-slate-200">
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Estado</p>
                <Select value={filterState || '__all'} onValueChange={v => { setFilterState(v === '__all' ? '' : v); setFilterCity(''); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todos estados</SelectItem>
                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">Cidade</p>
                <Select value={filterCity || '__all'} onValueChange={v => setFilterCity(v === '__all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todas cidades</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <button onClick={() => { setFilterSub('all'); setFilterState(''); setFilterCity(''); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">Limpar filtros</button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-slate-500">{filtered.length} clientes</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <Card key={u.id} className="border-slate-200 hover:border-green-300 transition-colors cursor-pointer" onClick={() => setSelected(u)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {u.profile_photo ? (
                    <img src={u.profile_photo} alt={u.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">{u.full_name || 'Sem nome'}</p>
                      <Badge className={`text-[10px] ${subBadgeClass[getSubType(u)]}`}>{subLabel[getSubType(u)]}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-slate-400">
                      {u.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{u.city}{u.state ? ` - ${u.state}` : ''}</span>}
                      <span>{usages.filter(us => us.created_by === u.email).length} usos</span>
                      <span>Desde {new Date(u.created_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}