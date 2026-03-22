import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * E-MAIL 4: Confirmação de Pagamento / Assinatura
 * Disparado quando um pagamento é confirmado
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      email,
      nome_usuario,
      nome_plano = 'Plano Premium',
      valor_pago = 'R$ 19,90',
      data_vencimento,
      numero_protocolo = '###',
      link_app = 'https://preview-sandbox.base44.app/Home',
    } = body;

    if (!email || !nome_usuario) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const LOGO = 'https://media.base44.com/images/public/user_69b9c557424640bf7f14ad8a/a3052d43d_LogoSouBrasil-Oficial-FundoTransparente.png';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px 0; background-color: #f9f9f9;">
          <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <tbody>
              <!-- HEADER -->
              <tr>
                <td style="background: linear-gradient(135deg, #1a5c2a 0%, #1a2e6b 100%); padding: 0; text-align: center;">
                  <div style="background: #f5c400; height: 6px; width: 100%;"></div>
                  <div style="padding: 30px 20px 20px;">
                    <img src="${LOGO}" alt="Sou Brasil" style="max-width: 180px; height: auto;">
                  </div>
                  <div style="padding: 20px 20px 0; color: white; text-align: center;">
                    <p style="font-size: 28px; font-weight: bold; margin: 0;">✅ Pagamento Aprovado!</p>
                    <p style="font-size: 14px; margin: 8px 0 0; opacity: 0.95;">Bem-vindo aos benefícios exclusivos</p>
                  </div>
                  <div style="background: #f5c400; height: 6px; width: 100%; margin-top: 20px;"></div>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding: 40px 30px; background-color: white; color: #333333;">
                  <h2 style="color: #1a2e6b; font-size: 24px; margin: 0 0 20px;">Olá, ${nome_usuario}!</h2>

                  <p style="font-size: 14px; color: #666666; line-height: 1.8; margin: 0 0 20px;">
                    Seu pagamento foi processado com sucesso! Agora você tem acesso a todos os 
                    <strong>benefícios exclusivos</strong> do Clube Sou Brasil.
                  </p>

                  <!-- Resumo do pagamento -->
                  <div style="background: linear-gradient(135deg, rgba(26, 92, 42, 0.05) 0%, rgba(245, 196, 0, 0.05) 100%); border-left: 4px solid #1a5c2a; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <div style="font-size: 14px; color: #333333;">
                      <p style="margin: 0 0 12px;"><strong>📋 Plano:</strong> ${nome_plano}</p>
                      <p style="margin: 0 0 12px;"><strong>💰 Valor:</strong> ${valor_pago}</p>
                      <p style="margin: 0 0 12px;"><strong>📅 Válido até:</strong> ${data_vencimento}</p>
                      <p style="margin: 0;"><strong>🔢 Protocolo:</strong> ${numero_protocolo}</p>
                    </div>
                  </div>

                  <p style="font-size: 14px; color: #666666; line-height: 1.8; margin: 25px 0 0;">
                    Aproveite agora todos os descontos exclusivos dos nossos parceiros! 
                    Acesse o app para descobrir as melhores ofertas.
                  </p>

                  <!-- CTA Button -->
                  <table style="width: 100%; max-width: 400px; margin: 30px auto 0;">
                    <tbody>
                      <tr>
                        <td style="text-align: center;">
                          <a href="${link_app}" style="display: inline-block; background: linear-gradient(135deg, #1a2e6b 0%, #0d1a4a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(26, 46, 107, 0.3);">
                            ACESSAR MINHA CONTA
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 6px;">
                    <p style="font-size: 12px; color: #666666; margin: 0; line-height: 1.6;">
                      <strong>📌 Informações importantes:</strong><br>
                      • Sua assinatura se renova automaticamente na data de vencimento<br>
                      • Você pode cancelar a qualquer momento no seu perfil<br>
                      • Receba ofertas exclusivas e participe dos sorteios!
                    </p>
                  </div>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background-color: #1a5c2a; padding: 30px 20px; text-align: center; color: white; font-size: 13px;">
                  <p style="margin: 0 0 15px; font-style: italic; font-size: 16px; font-weight: 500;">Equipe Sou Brasil 🇧🇷</p>
                  <p style="margin: 0; opacity: 0.9;">Porque todo Brasileiro merece Desconto!</p>
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: '✅ Pagamento confirmado - Clube Sou Brasil',
      body: emailHTML,
    });

    console.log(`✅ Email de confirmação de pagamento enviado para ${email}`);
    return Response.json({ success: true, email_sent: email });

  } catch (error) {
    console.error('❌ Send Payment Confirmation Email Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});