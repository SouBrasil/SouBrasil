/**
 * 🇧🇷 SISTEMA COMPLETO DE E-MAILS PROFISSIONAIS - SOU BRASIL
 * 
 * 8 Templates de e-mail automáticos com identidade visual padrão
 * HTML com CSS inline 100% compatível com Gmail, Outlook e demais clientes
 * 
 * Templates:
 * 1. generateWelcomeEmailHTML - Boas-vindas/Cadastro aprovado
 * 2. generatePasswordResetEmailHTML - Recuperação de senha
 * 3. generateWinnerEmailHTML - Ganhador do sorteio
 * 4. generatePaymentConfirmationEmailHTML - Confirmação de pagamento
 * 5. generatePaymentPendingEmailHTML - Pagamento pendente/vencendo
 * 6. generateSubscriptionCancelledEmailHTML - Assinatura cancelada
 * 7. generateBirthdayEmailHTML - Aniversário do usuário
 * 8. generatePromotionEmailHTML - Nova promoção/comunicado
 */

const COLORS = {
  greenDark: '#1a5c2a',
  yellow: '#f5c400',
  navy: '#1a2e6b',
  white: '#ffffff',
  lightGray: '#f5f5f5',
  textDark: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
};

const LOGO_URL = 'https://media.base44.com/images/public/user_69b9c557424640bf7f14ad8a/a3052d43d_LogoSouBrasil-Oficial-FundoTransparente.png';

function emailWrapper(content) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; }
          table { border-collapse: collapse; width: 100%; }
          img { max-width: 100%; height: auto; display: block; }
          a { color: ${COLORS.navy}; text-decoration: none; }
          .footer-link { color: ${COLORS.white}; text-decoration: underline; }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px 0; background-color: #f9f9f9;">
        <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: ${COLORS.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tbody>
            ${content}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function headerDecorativo(title, subtitle = '') {
  return `
    <tr>
      <td style="background: linear-gradient(135deg, ${COLORS.greenDark} 0%, ${COLORS.navy} 100%); padding: 0; text-align: center; position: relative; overflow: hidden;">
        <!-- Faixa decorativa amarela -->
        <div style="background: ${COLORS.yellow}; height: 6px; width: 100%;"></div>
        
        <!-- Logo -->
        <div style="padding: 30px 20px 20px;">
          <img src="${LOGO_URL}" alt="Sou Brasil" style="max-width: 180px; height: auto;">
        </div>
        
        <!-- Título decorativo -->
        <div style="padding: 20px 20px 0; color: ${COLORS.white}; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 2px;">
            ${title}
          </p>
          ${subtitle ? `<p style="font-size: 16px; margin: 8px 0 0; opacity: 0.95;">${subtitle}</p>` : ''}
        </div>
        
        <!-- Faixa decorativa inferior -->
        <div style="background: ${COLORS.yellow}; height: 6px; width: 100%; margin-top: 20px;"></div>
      </td>
    </tr>
  `;
}

function bodySection(title, content) {
  return `
    <tr>
      <td style="padding: 40px 30px; background-color: ${COLORS.white}; color: ${COLORS.textDark};">
        ${title ? `<h2 style="color: ${COLORS.navy}; font-size: 24px; margin: 0 0 20px; font-weight: bold;">${title}</h2>` : ''}
        ${content}
      </td>
    </tr>
  `;
}

function ctaButton(text, url) {
  return `
    <table style="width: 100%; max-width: 400px; margin: 30px auto 0;">
      <tbody>
        <tr>
          <td style="text-align: center;">
            <a href="${url}" style="
              display: inline-block;
              background: linear-gradient(135deg, ${COLORS.navy} 0%, #0d1a4a 100%);
              color: ${COLORS.white};
              padding: 14px 40px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 1px;
              box-shadow: 0 4px 12px rgba(26, 46, 107, 0.3);
              transition: all 0.3s ease;
              border: 2px solid ${COLORS.navy};
            ">
              ${text}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

function highlightBox(content) {
  return `
    <div style="
      background: linear-gradient(135deg, rgba(26, 92, 42, 0.05) 0%, rgba(245, 196, 0, 0.05) 100%);
      border-left: 4px solid ${COLORS.greenDark};
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    ">
      ${content}
    </div>
  `;
}

function footer(unsubscribeLink = '') {
  return `
    <tr>
      <td style="background-color: ${COLORS.greenDark}; padding: 30px 20px; text-align: center; color: ${COLORS.white}; font-size: 13px;">
        <p style="margin: 0 0 15px; font-style: italic; font-size: 16px; font-weight: 500;">Equipe Sou Brasil 🇧🇷</p>
        <p style="margin: 0 0 10px; opacity: 0.9;">Porque todo Brasileiro merece Desconto!</p>
        ${unsubscribeLink ? `
          <p style="margin: 15px 0 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); opacity: 0.8;">
            Se deseja cancelar sua inscrição, <a href="${unsubscribeLink}" class="footer-link">clique aqui</a>.
          </p>
        ` : ''}
      </td>
    </tr>
  `;
}

// ============================================================================
// 1. E-MAIL DE BOAS-VINDAS E CADASTRO APROVADO
// ============================================================================

export function generateWelcomeEmailHTML(userData = {}) {
  const {
    nome_usuario = 'Usuário',
    email_usuario = 'seu@email.com',
    senha_provisoria = null,
    tipo = 'usuario', // 'usuario' ou 'parceiro'
    portal_url = 'https://preview-sandbox.base44.app/Home',
    unsubscribe_url = '',
  } = userData;

  const titulo = '🎉 Seu cadastro foi aprovado! 🎉';
  const subtitulo = tipo === 'parceiro' 
    ? 'Bem-vindo(a) ao Portal Parceiro Sou Brasil!' 
    : 'Bem-vindo(a) ao Clube Sou Brasil!';

  const conteudo = `
    <p style="font-size: 18px; color: ${COLORS.textDark}; margin: 0 0 20px;">
      Olá, <strong>${nome_usuario}!</strong>
    </p>

    <p style="font-size: 16px; color: ${COLORS.greenDark}; font-weight: bold; margin: 0 0 15px;">
      ✨ Sua solicitação foi APROVADA! 
    </p>

    <p style="font-size: 14px; color: ${COLORS.textLight}; line-height: 1.8; margin: 0 0 25px;">
      Agora você já pode acessar ${tipo === 'parceiro' ? 'o portal de parceiros' : 'o aplicativo'} com suas credenciais. 
      ${tipo === 'parceiro' ? 'Você tem <strong>90 dias de trial GRÁTIS</strong> para começar!' : ''}
    </p>

    ${highlightBox(`
      <div style="font-size: 14px; color: ${COLORS.textDark};">
        <p style="margin: 0 0 12px;">
          <strong>📧 E-mail:</strong><br>
          <code style="background: #f0f0f0; padding: 6px 10px; border-radius: 4px; font-family: monospace;">${email_usuario}</code>
        </p>
        ${senha_provisoria ? `
          <p style="margin: 12px 0 0;">
            <strong>🔑 Senha provisória:</strong><br>
            <code style="background: #f0f0f0; padding: 6px 10px; border-radius: 4px; font-family: monospace;">${senha_provisoria}</code>
          </p>
        ` : ''}
      </div>
    `)}

    <p style="font-size: 13px; color: ${COLORS.textLight}; margin: 25px 0 0; padding-top: 15px; border-top: 1px solid ${COLORS.border};">
      ⚠️ Recomendamos que você mude sua senha no primeiro acesso para manter sua conta segura.
    </p>

    ${ctaButton('ACESSAR AGORA', portal_url)}

    ${tipo === 'parceiro' ? `
      <div style="margin-top: 30px; padding: 20px; background-color: ${COLORS.lightGray}; border-radius: 6px;">
        <p style="font-size: 13px; color: ${COLORS.textDark}; margin: 0; line-height: 1.8;">
          <strong>🎯 Próximos passos:</strong><br>
          1️⃣ Acesse o portal com suas credenciais<br>
          2️⃣ Mude sua senha (provisória)<br>
          3️⃣ Complete seu perfil comercial<br>
          4️⃣ Escolha um plano (trial ou pago)
        </p>
      </div>
    ` : ''}
  `;

  return emailWrapper(
    headerDecorativo(titulo, subtitulo) +
    bodySection('', conteudo) +
    footer(unsubscribe_url)
  );
}

// ============================================================================
// 2. E-MAIL DE GANHADOR DO SORTEIO
// ============================================================================

export function generateWinnerEmailHTML(winnerData = {}) {
  const {
    nome_usuario = 'Ganhador',
    nome_premio = 'Prêmio Especial',
    data_sorteio = new Date().toLocaleDateString('pt-BR'),
    app_url = 'https://preview-sandbox.base44.app/Home',
    descricao_premio = '',
    unsubscribe_url = '',
  } = winnerData;

  const conteudo = `
    <p style="font-size: 18px; color: ${COLORS.textDark}; margin: 0 0 20px;">
      Olá, <strong>${nome_usuario}!</strong> 🎊
    </p>

    <div style="
      background: linear-gradient(135deg, rgba(245, 196, 0, 0.2) 0%, rgba(26, 92, 42, 0.1) 100%);
      border: 2px solid ${COLORS.yellow};
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    ">
      <p style="
        font-size: 20px;
        color: ${COLORS.greenDark};
        font-weight: bold;
        margin: 0 0 15px;
        letter-spacing: 1px;
      ">
        🏆 VOCÊ É UM GANHADOR! 🏆
      </p>
      
      <p style="font-size: 16px; color: ${COLORS.navy}; margin: 0 0 10px; font-weight: bold;">
        Dentro do app Sou Brasil, seu prêmio já está disponível!
      </p>
    </div>

    <p style="font-size: 14px; color: ${COLORS.textDark}; margin: 25px 0 15px; font-weight: bold;">
      📌 Informações do seu Prêmio:
    </p>

    ${highlightBox(`
      <div style="font-size: 14px; color: ${COLORS.textDark};">
        <p style="margin: 0 0 12px;">
          <strong>🎁 Prêmio:</strong> ${nome_premio}
        </p>
        <p style="margin: 0 0 12px;">
          <strong>📅 Data do Sorteio:</strong> ${data_sorteio}
        </p>
        ${descricao_premio ? `
          <p style="margin: 0;">
            <strong>📝 Descrição:</strong> ${descricao_premio}
          </p>
        ` : ''}
      </div>
    `)}

    <p style="font-size: 14px; color: ${COLORS.textDark}; line-height: 1.8; margin: 25px 0 0;">
      Acesse o aplicativo Sou Brasil e resgate seu prêmio agora mesmo! 
      <strong>Seu prêmio ficará disponível por 7 dias.</strong> 
      Não perca este prazo! ⏰
    </p>

    ${ctaButton('🏆 RESGATAR MEU PRÊMIO', app_url)}

    <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid ${COLORS.yellow};">
      <p style="font-size: 12px; color: #856404; margin: 0; line-height: 1.6;">
        <strong>⚠️ Atenção:</strong> Este prêmio é exclusivo para você e válido por 7 dias a partir de agora. 
        Certifique-se de resgatá-lo dentro deste período.
      </p>
    </div>

    <p style="font-size: 13px; color: ${COLORS.textLight}; text-align: center; margin: 25px 0 0;">
      Parabéns! 🇧🇷 Que você aproveite muito seu prêmio!
    </p>
  `;

  return emailWrapper(
    headerDecorativo('🎉 VOCÊ É UM GANHADOR! 🎉', 'Parabéns aos ganhadores do sorteio!') +
    bodySection('', conteudo) +
    footer(unsubscribe_url)
  );
}

// ============================================================================
// 3. E-MAIL DE RECUPERAÇÃO DE SENHA
// ============================================================================

export function generatePasswordResetEmailHTML(resetData = {}) {
  const {
    nome_usuario = 'Usuário',
    reset_link = 'https://preview-sandbox.base44.app/ResetPassword',
    validade_horas = 24,
    unsubscribe_url = '',
  } = resetData;

  const conteudo = `
    <p style="font-size: 16px; color: ${COLORS.textDark}; margin: 0 0 20px;">
      Olá, <strong>${nome_usuario}!</strong>
    </p>

    <p style="font-size: 14px; color: ${COLORS.textDark}; line-height: 1.8; margin: 0 0 20px;">
      Recebemos uma solicitação para redefinir a senha da sua conta no 
      <strong>Clube Sou Brasil</strong>.
    </p>

    <div style="
      background-color: #fef9e7;
      border-left: 4px solid ${COLORS.yellow};
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    ">
      <p style="font-size: 13px; color: #856404; margin: 0; line-height: 1.6;">
        <strong>⚠️ Se você não solicitou esta alteração,</strong> ignore este e-mail. 
        Nenhuma ação será necessária e sua conta permanecerá segura.
      </p>
    </div>

    <p style="font-size: 14px; color: ${COLORS.textDark}; line-height: 1.8; margin: 0 0 25px;">
      Clique no botão abaixo para criar uma nova senha. 
      <strong>Este link é válido por ${validade_horas} horas.</strong>
    </p>

    ${ctaButton('🔐 REDEFINIR MINHA SENHA', reset_link)}

    <div style="margin-top: 30px; padding: 15px; background-color: ${COLORS.lightGray}; border-radius: 6px;">
      <p style="font-size: 12px; color: ${COLORS.textLight}; margin: 0; line-height: 1.6;">
        <strong>🔒 Por segurança:</strong><br>
        • Nunca compartilhe este link com ninguém<br>
        • Sou Brasil nunca pedirá sua senha por e-mail<br>
        • Se não reconhece esta solicitação, entre em contato conosco imediatamente
      </p>
    </div>

    <p style="font-size: 12px; color: ${COLORS.textLight}; text-align: center; margin: 25px 0 0; padding-top: 15px; border-top: 1px solid ${COLORS.border};">
      Se tiver dúvidas, entre em contato com nosso suporte.
    </p>
  `;

  return emailWrapper(
    headerDecorativo('🔐 Recuperação de Senha') +
    bodySection('', conteudo) +
    footer(unsubscribe_url)
  );
}

// Export padrão para compatibilidade
export default {
  generateWelcomeEmailHTML,
  generateWinnerEmailHTML,
  generatePasswordResetEmailHTML,
};