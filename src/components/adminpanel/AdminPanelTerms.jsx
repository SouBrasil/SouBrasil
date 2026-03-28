import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Shield, Store, Loader2, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';

const DEFAULT_USER_TERMS = `<h2>1. Sobre o Clube Sou Brasil</h2>
<p>O Clube Sou Brasil é uma plataforma digital de benefícios que conecta usuários a parceiros comerciais, oferecendo descontos exclusivos, sorteios, cashback e vantagens para assinantes. Ao utilizar nosso aplicativo, você concorda integralmente com os presentes Termos de Uso e Política de Privacidade.</p>

<h2>2. Cadastro e Responsabilidades do Usuário</h2>
<p>Para utilizar os serviços, o usuário deve:</p>
<ul>
  <li>Ter no mínimo 18 anos de idade ou ser legalmente emancipado;</li>
  <li>Fornecer informações verdadeiras, completas e atualizadas (nome, CPF, e-mail, data de nascimento, endereço, telefone);</li>
  <li>Manter a confidencialidade de seus dados de acesso (login e senha);</li>
  <li>Não ceder, transferir ou compartilhar sua conta com terceiros;</li>
  <li>Não utilizar o aplicativo para fins ilícitos, fraudulentos ou prejudiciais a terceiros;</li>
  <li>Notificar imediatamente o Clube Sou Brasil caso identifique uso não autorizado de sua conta.</li>
</ul>
<p>O usuário é o único responsável pelas informações cadastradas e por todas as ações realizadas em sua conta.</p>

<h2>3. Planos e Assinatura</h2>
<p>O Clube Sou Brasil oferece os seguintes planos:</p>
<ul>
  <li><strong>Trial Gratuito:</strong> 7 dias de acesso completo sem custo, sem necessidade de cartão de crédito;</li>
  <li><strong>Plano Mensal:</strong> R$ 19,90/mês com renovação automática;</li>
  <li><strong>Plano Anual:</strong> R$ 179,88/ano (equivalente a R$ 14,99/mês), cobrado integralmente no ato da contratação.</li>
</ul>
<p>Os valores podem ser atualizados mediante aviso prévio de 30 dias. A cobrança é realizada pela plataforma Asaas, podendo ser via PIX, boleto bancário ou cartão de crédito.</p>

<h2>4. Cancelamento e Reembolso</h2>
<p>O usuário pode solicitar o cancelamento a qualquer momento pelo aplicativo ou pelo suporte. As regras são:</p>
<ul>
  <li>O cancelamento encerra a renovação automática, mantendo o acesso até o fim do período já pago;</li>
  <li>Solicitações de reembolso devem ser feitas em até 7 dias corridos após a cobrança, conforme o Código de Defesa do Consumidor (CDC, Art. 49);</li>
  <li>Após 7 dias do pagamento, não haverá reembolso proporcional pelo período restante;</li>
  <li>O trial gratuito não gera cobranças e pode ser encerrado sem burocracia.</li>
</ul>

<h2>5. Uso dos Benefícios</h2>
<p>Os benefícios e descontos disponíveis no aplicativo estão sujeitos às seguintes regras:</p>
<ul>
  <li>Os benefícios são de uso exclusivo do titular da conta, sendo vedado o compartilhamento com terceiros;</li>
  <li>Cada benefício possui um limite de uso por dia por estabelecimento, conforme definido pelo parceiro comercial;</li>
  <li>O Clube Sou Brasil não garante a disponibilidade contínua de todos os benefícios, pois dependem da permanência dos parceiros na rede;</li>
  <li>O uso indevido ou fraudulento de benefícios pode resultar no cancelamento imediato da conta, sem reembolso.</li>
</ul>

<h2>6. Programa Indique e Ganhe</h2>
<p>O Clube Sou Brasil oferece um programa de indicações onde:</p>
<ul>
  <li>O usuário recebe comissão de R$ 10,00 por cada pessoa indicada que contratar um plano pago;</li>
  <li>O pagamento da comissão ocorre após a confirmação do pagamento do indicado;</li>
  <li>As comissões são transferidas via carteira digital (Asaas), sendo necessária a ativação da carteira;</li>
  <li>É vedado o uso de práticas de spam, compra de seguidores, grupos de clickbait ou quaisquer meios antiéticos de divulgação;</li>
  <li>O Clube Sou Brasil reserva-se o direito de suspender ou cancelar comissões em casos de fraude, abuso ou desrespeito a estes termos;</li>
  <li>As comissões não são transferíveis e não possuem validade monetária fora da plataforma.</li>
</ul>

<h2>7. Parceiros Comerciais</h2>
<p>Os parceiros comerciais são estabelecimentos independentes que oferecem benefícios e descontos. O Clube Sou Brasil não se responsabiliza por:</p>
<ul>
  <li>Qualidade dos produtos e serviços oferecidos pelos parceiros;</li>
  <li>Indisponibilidade temporária ou permanente de benefícios em caso de encerramento de atividades do parceiro;</li>
  <li>Conflitos, reclamações ou litígios entre usuários e parceiros comerciais;</li>
  <li>Alterações unilaterais de benefícios realizadas pelos parceiros.</li>
</ul>
<p>Em caso de problemas com um parceiro, o usuário deve contatar nosso suporte para mediação.</p>

<h2>8. Política de Privacidade e Uso de Dados (LGPD)</h2>
<p>Coletamos e utilizamos seus dados pessoais com base na Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Os dados coletados incluem:</p>
<ul>
  <li><strong>Dados de cadastro:</strong> Nome completo, CPF, e-mail, data de nascimento, endereço e telefone;</li>
  <li><strong>Dados de uso:</strong> Benefícios utilizados, parceiros acessados, localização geográfica (somente com consentimento expresso);</li>
  <li><strong>Dados de pagamento:</strong> Processados exclusivamente pela plataforma Asaas; não armazenamos dados de cartão de crédito;</li>
  <li><strong>Dados de comunicação:</strong> Mensagens de suporte e interações com o sistema.</li>
</ul>
<p><strong>Finalidades do uso dos dados:</strong></p>
<ul>
  <li>Prestação dos serviços contratados e gestão da conta;</li>
  <li>Verificação de identidade e prevenção de fraudes;</li>
  <li>Personalização da experiência no aplicativo;</li>
  <li>Envio de notificações sobre benefícios, promoções e novidades (com consentimento);</li>
  <li>Cumprimento de obrigações legais e regulatórias.</li>
</ul>

<h2>9. Compartilhamento de Dados</h2>
<p>Seus dados pessoais poderão ser compartilhados com:</p>
<ul>
  <li><strong>Parceiros comerciais:</strong> Apenas dados mínimos necessários para validação de benefícios (ex.: confirmação de assinatura ativa);</li>
  <li><strong>Processadores de pagamento (Asaas):</strong> Para realização das cobranças e transferências;</li>
  <li><strong>Autoridades competentes:</strong> Quando exigido por lei, ordem judicial ou regulatória.</li>
</ul>
<p>Não vendemos, alugamos ou comercializamos seus dados pessoais a terceiros para fins de marketing.</p>

<h2>10. Direitos do Titular de Dados (LGPD)</h2>
<p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
<ul>
  <li>Confirmação da existência de tratamento e acesso aos dados coletados;</li>
  <li>Correção de dados incorretos, incompletos ou desatualizados;</li>
  <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
  <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
  <li>Eliminação dos dados tratados com base no consentimento;</li>
  <li>Informação sobre compartilhamento de dados com terceiros;</li>
  <li>Revogação do consentimento a qualquer momento.</li>
</ul>
<p>Para exercer esses direitos, entre em contato: <strong>contato@soubrasil.com.br</strong></p>

<h2>11. Segurança dos Dados</h2>
<p>Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda, destruição ou divulgação indevida, incluindo criptografia de dados sensíveis, controle de acesso baseado em função e monitoramento contínuo de segurança.</p>

<h2>12. Cookies e Tecnologias de Rastreamento</h2>
<p>Utilizamos cookies e tecnologias similares para melhorar a experiência de uso, analisar o comportamento de navegação e personalizar conteúdo. Você pode gerenciar as preferências de cookies nas configurações do seu dispositivo ou navegador.</p>

<h2>13. Suspensão e Encerramento de Conta</h2>
<p>O Clube Sou Brasil reserva-se o direito de suspender ou encerrar contas de usuários que:</p>
<ul>
  <li>Violem estes Termos de Uso;</li>
  <li>Realizem fraudes, manipulações ou abusos do sistema de benefícios;</li>
  <li>Forneçam informações falsas no cadastro;</li>
  <li>Pratiquem qualquer ato ilícito utilizando a plataforma.</li>
</ul>
<p>Em caso de encerramento por violação, não haverá reembolso de valores pagos.</p>

<h2>14. Alterações nos Termos</h2>
<p>O Clube Sou Brasil pode atualizar estes Termos periodicamente. Notificaremos os usuários sobre mudanças significativas com pelo menos 30 dias de antecedência por e-mail ou notificação no aplicativo. O uso continuado após as alterações implica na aceitação dos novos termos.</p>

<h2>15. Foro e Legislação Aplicável</h2>
<p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede do Clube Sou Brasil para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.</p>`;

const DEFAULT_PARTNER_TERMS = `<h2>1. Sobre o Clube Sou Brasil e a Parceria Comercial</h2>
<p>O Clube Sou Brasil é uma plataforma digital de benefícios que conecta estabelecimentos comerciais (Parceiros) a uma base ativa de consumidores assinantes. Ao se cadastrar como Parceiro Comercial, o estabelecimento concorda integralmente com os presentes Termos de Uso e Política de Privacidade para Parceiros.</p>

<h2>2. Elegibilidade e Cadastro do Parceiro</h2>
<p>Para se tornar Parceiro Comercial, o estabelecimento deve:</p>
<ul>
  <li>Ser pessoa jurídica regularmente constituída (CNPJ ativo) ou pessoa física com CPF válido e atividade comercial regular;</li>
  <li>Possuir endereço físico ou virtual onde os benefícios serão disponibilizados;</li>
  <li>Fornecer informações verdadeiras, completas e atualizadas no cadastro;</li>
  <li>Ter o representante legal com idade mínima de 18 anos;</li>
  <li>Não possuir restrições legais ou regulatórias que impeçam a prestação dos serviços ofertados.</li>
</ul>

<h2>3. Planos de Parceria</h2>
<p>O Clube Sou Brasil oferece os seguintes planos para Parceiros Comerciais:</p>
<ul>
  <li><strong>Trial Gratuito:</strong> Período experimental de 90 dias sem custo, mediante análise e aprovação pela equipe Sou Brasil;</li>
  <li><strong>Plano Mensal Parceiro:</strong> R$ 299,90/mês com renovação automática;</li>
  <li><strong>Plano Anual Parceiro:</strong> R$ 2.500,00/ano (equivalente a R$ 208,33/mês), cobrado integralmente no ato da contratação;</li>
  <li><strong>Promo Trial Especial:</strong> Plano promocional com condições diferenciadas conforme campanha vigente.</li>
</ul>
<p>Os valores podem ser atualizados mediante aviso prévio de 30 dias. A cobrança é realizada pela plataforma Asaas.</p>

<h2>4. Processo de Aprovação e Publicação</h2>
<p>O cadastro do Parceiro passa pelas seguintes etapas:</p>
<ul>
  <li><strong>Submissão:</strong> O Parceiro submete as informações e materiais do estabelecimento;</li>
  <li><strong>Análise:</strong> A equipe Sou Brasil analisa o cadastro em até 5 dias úteis;</li>
  <li><strong>Aprovação ou Revisão:</strong> Em caso de aprovação, o perfil é publicado e as credenciais de acesso ao Portal do Parceiro são enviadas por e-mail. Em caso de necessidade de correções, o Parceiro recebe um e-mail com as orientações;</li>
  <li><strong>Publicação:</strong> Após aprovação, o perfil fica visível imediatamente para todos os usuários assinantes do aplicativo.</li>
</ul>

<h2>5. Obrigações do Parceiro Comercial</h2>
<p>O Parceiro Comercial se compromete a:</p>
<ul>
  <li>Honrar integralmente os benefícios e descontos cadastrados para todos os usuários com assinatura ativa que apresentarem o benefício pelo aplicativo;</li>
  <li>Manter as informações do perfil (endereço, horário de funcionamento, benefícios) sempre atualizadas;</li>
  <li>Não discriminar usuários na concessão dos benefícios por qualquer motivo;</li>
  <li>Capacitar sua equipe para reconhecer e validar o benefício apresentado pelo aplicativo;</li>
  <li>Comunicar com antecedência mínima de 30 dias qualquer alteração ou encerramento dos benefícios;</li>
  <li>Não cobrar taxas adicionais para usuários que utilizem o benefício cadastrado;</li>
  <li>Manter os padrões mínimos de qualidade e atendimento.</li>
</ul>

<h2>6. Portal do Parceiro</h2>
<p>Após aprovação, o Parceiro terá acesso ao Portal exclusivo onde poderá:</p>
<ul>
  <li>Gerenciar e atualizar as informações do perfil público;</li>
  <li>Solicitar e gerenciar sorteios exclusivos para usuários do clube;</li>
  <li>Contratar e gerenciar créditos de Push Notification para divulgação geolocalizadas;</li>
  <li>Visualizar relatórios de uso dos benefícios e indicações;</li>
  <li>Acompanhar o desempenho das indicações e comissões geradas;</li>
  <li>Acessar o suporte especializado do Clube Sou Brasil.</li>
</ul>
<p>As credenciais de acesso ao Portal são pessoais e intransferíveis. O Parceiro é responsável pela segurança e uso das credenciais.</p>

<h2>7. Programa de Indicação para Parceiros</h2>
<p>O Parceiro Comercial pode participar do Programa de Indicação, onde:</p>
<ul>
  <li>O Parceiro recebe um link exclusivo de indicação para novos usuários e parceiros;</li>
  <li>Para cada usuário que assinar um plano pago via link do Parceiro, o indicador recebe comissão conforme tabela vigente;</li>
  <li>Para cada novo Parceiro Comercial que contratar um plano pago via indicação, o indicador recebe comissão diferenciada;</li>
  <li>As comissões são processadas via Asaas e transferidas conforme disponibilidade da carteira digital;</li>
  <li>É vedado o uso de práticas enganosas, spam ou qualquer forma antiética de divulgação do link de indicação.</li>
</ul>

<h2>8. Sorteios e Push Notifications</h2>
<p><strong>Sorteios:</strong> O Parceiro pode solicitar a realização de sorteios para usuários do clube. Cada solicitação é analisada pela equipe Sou Brasil e, uma vez aprovada, é publicada e gerenciada diretamente pela plataforma.</p>
<p><strong>Push Notifications:</strong> O Parceiro pode contratar créditos de notificações push geolocalizadas, enviadas para usuários próximos ao estabelecimento (raio configurável). As notificações passam por aprovação prévia da equipe Sou Brasil antes do envio.</p>

<h2>9. Cancelamento e Rescisão</h2>
<p>O Parceiro pode solicitar o cancelamento a qualquer momento pelo Portal ou pelo suporte. As regras são:</p>
<ul>
  <li>O cancelamento encerra a renovação automática, mantendo o perfil ativo até o fim do período pago;</li>
  <li>Após o encerramento da assinatura, o perfil do Parceiro será removido do aplicativo dentro de 48 horas;</li>
  <li>Solicitações de reembolso devem ser feitas em até 7 dias corridos após a cobrança;</li>
  <li>O Clube Sou Brasil pode rescindir a parceria unilateralmente em caso de violação destes termos, sem reembolso e sem aviso prévio;</li>
  <li>Créditos de Push Notification adquiridos e não utilizados não são reembolsáveis após a aprovação do pagamento.</li>
</ul>

<h2>10. Política de Privacidade e Proteção de Dados do Parceiro (LGPD)</h2>
<p>Com base na LGPD (Lei 13.709/2018), coletamos e tratamos dados do Parceiro Comercial e de seus representantes, incluindo:</p>
<ul>
  <li><strong>Dados cadastrais:</strong> Razão social, CNPJ/CPF, nome do responsável, e-mail, telefone, endereço;</li>
  <li><strong>Dados operacionais:</strong> Informações do estabelecimento, benefícios cadastrados, fotos e materiais de divulgação;</li>
  <li><strong>Dados financeiros:</strong> Processados pela Asaas; não armazenamos dados de cartão ou conta bancária diretamente;</li>
  <li><strong>Dados de uso da plataforma:</strong> Acessos ao Portal, relatórios de benefícios utilizados e métricas de desempenho.</li>
</ul>
<p><strong>Finalidades do tratamento:</strong></p>
<ul>
  <li>Gestão do contrato de parceria e prestação dos serviços;</li>
  <li>Publicação do perfil do Parceiro no aplicativo para usuários;</li>
  <li>Processamento de cobranças e repasse de comissões;</li>
  <li>Comunicação sobre atualizações, suporte e melhorias;</li>
  <li>Cumprimento de obrigações legais e regulatórias.</li>
</ul>

<h2>11. Compartilhamento de Dados do Parceiro</h2>
<p>Os dados do Parceiro poderão ser compartilhados com:</p>
<ul>
  <li><strong>Usuários do clube:</strong> Informações públicas do perfil (nome, endereço, benefícios, fotos, horários), conforme cadastrado pelo Parceiro;</li>
  <li><strong>Asaas:</strong> Dados necessários para processamento de pagamentos e transferências;</li>
  <li><strong>Autoridades competentes:</strong> Quando exigido por lei ou ordem judicial.</li>
</ul>
<p>Não compartilhamos dados sensíveis do Parceiro com terceiros para fins comerciais ou de marketing.</p>

<h2>12. Direitos do Parceiro como Titular de Dados (LGPD)</h2>
<p>O Parceiro, como titular de dados, tem direito a:</p>
<ul>
  <li>Confirmar a existência de tratamento e acessar seus dados;</li>
  <li>Corrigir dados incorretos ou desatualizados através do Portal;</li>
  <li>Solicitar a exclusão de dados após o encerramento da parceria;</li>
  <li>Revogar consentimentos específicos a qualquer momento;</li>
  <li>Solicitar portabilidade dos dados.</li>
</ul>
<p>Para exercer esses direitos: <strong>contato@soubrasil.com.br</strong></p>

<h2>13. Responsabilidades e Limitação de Responsabilidade</h2>
<p>O Clube Sou Brasil não se responsabiliza por:</p>
<ul>
  <li>Quedas de volume de clientes decorrentes de variações naturais do mercado;</li>
  <li>Falhas no aplicativo causadas por fatores externos (falha de internet, servidores de terceiros);</li>
  <li>Uso indevido das credenciais de acesso pelo Parceiro ou por pessoas não autorizadas;</li>
  <li>Danos indiretos, lucros cessantes ou perda de negócios relacionados ao uso da plataforma.</li>
</ul>

<h2>14. Propriedade Intelectual</h2>
<p>O Parceiro autoriza expressamente o Clube Sou Brasil a:</p>
<ul>
  <li>Utilizar o nome, logotipo, fotos e materiais fornecidos para divulgação do perfil no aplicativo e em materiais de marketing do clube;</li>
  <li>Reproduzir e adaptar os materiais exclusivamente para fins de divulgação da parceria.</li>
</ul>
<p>O Clube Sou Brasil não reivindica propriedade sobre os materiais fornecidos pelo Parceiro.</p>

<h2>15. Conduta e Boas Práticas</h2>
<p>O Parceiro se compromete a não:</p>
<ul>
  <li>Oferecer benefícios falsos, enganosos ou que não possam ser efetivamente cumpridos;</li>
  <li>Utilizar a base de dados de usuários do Clube Sou Brasil para contato direto sem autorização;</li>
  <li>Praticar discriminação de qualquer natureza na prestação dos benefícios;</li>
  <li>Realizar ações que prejudiquem a imagem ou reputação do Clube Sou Brasil.</li>
</ul>

<h2>16. Alterações nos Termos</h2>
<p>O Clube Sou Brasil pode atualizar estes Termos periodicamente. O Parceiro será notificado por e-mail com antecedência mínima de 30 dias. A continuidade de uso do Portal após as alterações implica na aceitação dos novos termos.</p>

<h2>17. Foro e Legislação Aplicável</h2>
<p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede do Clube Sou Brasil para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro foro.</p>`;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

export default function AdminPanelTerms({ session }) {
  const [activeTab, setActiveTab] = useState('usuario');
  const [content, setContent] = useState('');
  const [label, setLabel] = useState('');
  const [version, setVersion] = useState('');
  const [preview, setPreview] = useState(false);
  const qc = useQueryClient();

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['terms-config'],
    queryFn: () => base44.entities.TermsConfig.list('-updated_date', 10),
  });

  const currentTerm = terms.find(t => t.type === activeTab);

  useEffect(() => {
    if (currentTerm) {
      setContent(currentTerm.content || '');
      setLabel(currentTerm.last_updated_label || '');
      setVersion(currentTerm.version || '');
    } else {
      setContent(activeTab === 'usuario' ? DEFAULT_USER_TERMS : DEFAULT_PARTNER_TERMS);
      setLabel(activeTab === 'usuario' ? 'Março de 2025' : 'Março de 2025');
      setVersion('v1.0');
    }
  }, [activeTab, terms]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (currentTerm) {
        await base44.entities.TermsConfig.update(currentTerm.id, {
          content,
          last_updated_label: label,
          version,
        });
      } else {
        await base44.entities.TermsConfig.create({
          type: activeTab,
          content,
          last_updated_label: label,
          version,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terms-config'] });
      toast.success('Termos salvos com sucesso!');
    },
    onError: (err) => toast.error('Erro ao salvar: ' + err.message),
  });

  const isMaster = session?.role === 'master';

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('usuario')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'usuario' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" /> Termos — Usuário
        </button>
        <button
          onClick={() => setActiveTab('parceiro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'parceiro' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Store className="w-4 h-4" /> Termos — Parceiro Comercial
        </button>
        <button
          onClick={() => setPreview(!preview)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
        >
          <Eye className="w-4 h-4" /> {preview ? 'Editar' : 'Visualizar'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" /></div>
      ) : preview ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          {!isMaster && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-700">👁️ Somente o Master pode editar os Termos de Uso.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data de Atualização</label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Março de 2025"
                disabled={!isMaster}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Versão</label>
              <Input
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="Ex: v1.2"
                disabled={!isMaster}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">
              Conteúdo — Termos de Uso {activeTab === 'usuario' ? 'do Usuário' : 'do Parceiro Comercial'}
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <ReactQuill
                value={content}
                onChange={setContent}
                modules={QUILL_MODULES}
                readOnly={!isMaster}
                style={{ minHeight: 480 }}
              />
            </div>
          </div>

          {isMaster && (
            <div className="flex justify-end">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Termos
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}