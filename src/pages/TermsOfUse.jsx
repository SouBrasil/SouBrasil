import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Store } from 'lucide-react';

export default function TermsOfUse() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('usuario');

  const { data: terms = [] } = useQuery({
    queryKey: ['terms-config'],
    queryFn: () => base44.entities.TermsConfig.list('-updated_date', 10),
    staleTime: 60000,
  });

  const current = terms.find(t => t.type === tab);

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-black text-base">Termos de Uso e Privacidade</h1>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 px-4 pt-4 max-w-2xl mx-auto">
        <button
          onClick={() => setTab('usuario')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            tab === 'usuario' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-foreground hover:bg-muted'
          }`}
        >
          <Shield className="w-4 h-4" /> Usuário
        </button>
        <button
          onClick={() => setTab('parceiro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            tab === 'parceiro' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-foreground hover:bg-muted'
          }`}
        >
          <Store className="w-4 h-4" /> Parceiro Comercial
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6 text-sm text-foreground leading-relaxed">
        {current ? (
          <DynamicTermsContent term={current} />
        ) : (
          <TermsContent type={tab} />
        )}
      </div>
    </div>
  );
}

function DynamicTermsContent({ term }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png"
          alt="Sou Brasil" className="h-14 mx-auto mb-3" />
        <p className="text-xs text-muted-foreground">
          Última atualização: {term.last_updated_label || ''}
          {term.version ? ` — ${term.version}` : ''}
        </p>
      </div>
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: term.content }} />
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Dúvidas? Entre em contato:<br />
          <strong className="text-primary">contato@soubrasil.com.br</strong>
        </p>
      </div>
    </div>
  );
}

export function TermsContent({ type }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <img
          src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png"
          alt="Sou Brasil" className="h-14 mx-auto mb-3"
        />
        <p className="text-xs text-muted-foreground">Última atualização: Março de 2025</p>
      </div>

      <Section title="1. Sobre o Clube Sou Brasil">
        <p>O Clube Sou Brasil é uma plataforma digital de benefícios que conecta usuários a parceiros comerciais, oferecendo descontos exclusivos, sorteios e vantagens para os assinantes. Ao utilizar nosso aplicativo, você concorda integralmente com os presentes Termos de Uso e Política de Privacidade.</p>
      </Section>

      <Section title="2. Cadastro e Responsabilidades do Usuário">
        <p>Para utilizar os serviços do Clube Sou Brasil, o usuário deve:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li>Ter no mínimo 18 anos de idade ou ser emancipado;</li>
          <li>Fornecer informações verdadeiras, completas e atualizadas;</li>
          <li>Manter a confidencialidade de seus dados de acesso;</li>
          <li>Não utilizar o aplicativo para fins ilícitos ou prejudiciais a terceiros;</li>
          <li>Notificar imediatamente caso identifique uso não autorizado de sua conta.</li>
        </ul>
        <p className="mt-2">O usuário é o único responsável pelas informações cadastradas e por todas as ações realizadas em sua conta.</p>
      </Section>

      <Section title="3. Planos e Assinatura">
        <p>O Clube Sou Brasil oferece os seguintes planos:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li><strong>Trial Gratuito:</strong> 7 dias de acesso completo sem custo;</li>
          <li><strong>Plano Mensal:</strong> R$ 19,90/mês com renovação automática;</li>
          <li><strong>Plano Anual:</strong> R$ 179,88/ano (equivalente a R$ 14,99/mês).</li>
        </ul>
        <p className="mt-2">Os valores podem ser atualizados mediante aviso prévio de 30 dias. A cobrança é realizada pelo sistema Asaas, podendo ser via PIX, boleto bancário ou cartão de crédito.</p>
      </Section>

      <Section title="4. Cancelamento e Reembolso">
        <p>O usuário pode cancelar sua assinatura a qualquer momento através do aplicativo ou por contato com nosso suporte. As regras de cancelamento são:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li>O cancelamento encerra a renovação automática, mantendo o acesso até o fim do período pago;</li>
          <li>Solicitações de reembolso devem ser feitas em até 7 dias corridos após a cobrança;</li>
          <li>Após 7 dias do pagamento, não haverá reembolso proporcional;</li>
          <li>O trial gratuito não gera cobranças e pode ser encerrado sem burocracia.</li>
        </ul>
      </Section>

      <Section title="5. Programa Indique e Ganhe">
        <p>O Clube Sou Brasil oferece um programa de indicações onde:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li>O usuário recebe comissão de R$10,00 por cada indicado que contratar um plano pago;</li>
          <li>O pagamento da comissão ocorre após a confirmação do pagamento do indicado;</li>
          <li>As comissões são transferidas via carteira digital (Asaas);</li>
          <li>É vedado o uso de práticas de spam ou meios antiéticos de divulgação;</li>
          <li>O Clube Sou Brasil reserva-se o direito de suspender comissões em casos de fraude ou abuso.</li>
        </ul>
      </Section>

      <Section title="6. Parceiros Comerciais">
        <p>Os parceiros comerciais são estabelecimentos independentes que oferecem benefícios e descontos. O Clube Sou Brasil não se responsabiliza por:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li>Qualidade dos produtos e serviços oferecidos pelos parceiros;</li>
          <li>Disponibilidade dos benefícios em casos de encerramento do parceiro;</li>
          <li>Conflitos entre usuários e parceiros comerciais.</li>
        </ul>
      </Section>

      <Section title="7. Política de Privacidade e Uso de Dados">
        <p>Coletamos e utilizamos seus dados pessoais com base na Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018). Os dados coletados incluem:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li><strong>Dados de cadastro:</strong> Nome, CPF, e-mail, data de nascimento, endereço e telefone;</li>
          <li><strong>Dados de uso:</strong> Benefícios utilizados, parceiros visitados, localização geográfica (com consentimento);</li>
          <li><strong>Dados de pagamento:</strong> Processados exclusivamente pela plataforma Asaas, não armazenamos dados de cartão;</li>
          <li><strong>Dados de comunicação:</strong> Mensagens de suporte e interações com o aplicativo.</li>
        </ul>
        <p className="mt-2"><strong>Finalidades do uso dos dados:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-1 text-muted-foreground">
          <li>Prestação dos serviços contratados;</li>
          <li>Personalização da experiência no aplicativo;</li>
          <li>Envio de notificações sobre benefícios e promoções (com consentimento);</li>
          <li>Cumprimento de obrigações legais e prevenção de fraudes.</li>
        </ul>
      </Section>

      <Section title="8. Compartilhamento de Dados">
        <p>Seus dados pessoais poderão ser compartilhados com:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li>Parceiros comerciais: apenas dados necessários para validação de benefícios;</li>
          <li>Processadores de pagamento (Asaas): para realização das cobranças;</li>
          <li>Autoridades competentes: quando exigido por lei.</li>
        </ul>
        <p className="mt-2">Não vendemos ou comercializamos seus dados pessoais a terceiros.</p>
      </Section>

      <Section title="9. Direitos do Titular de Dados (LGPD)">
        <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
          <li>Confirmação da existência de tratamento e acesso aos dados;</li>
          <li>Correção de dados incorretos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Portabilidade dos dados a outro fornecedor;</li>
          <li>Eliminação dos dados tratados com consentimento;</li>
          <li>Revogação do consentimento a qualquer momento.</li>
        </ul>
        <p className="mt-2">Para exercer esses direitos, entre em contato: <strong>contato@soubrasil.com.br</strong></p>
      </Section>

      <Section title="10. Segurança dos Dados">
        <p>Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda, destruição ou divulgação indevida, incluindo criptografia de dados sensíveis, controle de acesso e monitoramento de segurança.</p>
      </Section>

      <Section title="11. Cookies e Tecnologias de Rastreamento">
        <p>Utilizamos cookies e tecnologias similares para melhorar a experiência de uso, analisar o tráfego e personalizar conteúdo. Você pode gerenciar as preferências de cookies nas configurações do seu dispositivo.</p>
      </Section>

      <Section title="12. Alterações nos Termos">
        <p>O Clube Sou Brasil pode atualizar estes Termos de Uso periodicamente. Notificaremos os usuários sobre mudanças significativas com pelo menos 30 dias de antecedência. O uso continuado do aplicativo após as alterações implica na aceitação dos novos termos.</p>
      </Section>

      <Section title="13. Foro e Legislação Aplicável">
        <p>Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da cidade sede do Clube Sou Brasil para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.</p>
      </Section>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Dúvidas? Entre em contato:<br />
          <strong className="text-primary">contato@soubrasil.com.br</strong> | WhatsApp: <strong className="text-primary">(41) 9 9999-9999</strong>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="font-bold text-base text-foreground border-b border-border pb-1">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );
}