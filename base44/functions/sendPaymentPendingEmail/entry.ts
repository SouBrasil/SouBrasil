import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * E-MAIL 5: Pagamento Pendente / Vencendo
 * Disparado 3 dias antes do vencimento da assinatura
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      email,
      nome_usuario,
      dias_para_vencer = 3,
      data_vencimento,
      valor_assinatura = 'R$ 19,90',
      link_renovacao = 'https://preview-sandbox.base44.app/Pricing',
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
                <td style="background: linear-gradient(135deg, #f5c400 0%, #e8b800 100%); padding: 0; text-align: center;">
                  <div style="background: #1a5c2a; height: 6px; width: 100%;"></div>
                  <div style="padding: 30px 20px 20px;">
                    <img src="${LOGO}" alt="Sou Brasil" style="max-width: 180px; height: auto;">
                  </div>
                  <div style="padding: 20px 20px 0; color: #1a2e6b; text-align: center;">
                    <p style="font-size: 28px; font-weight: bold; margin: 0;">⏰ Atenção!</p>
                    <p style="font-size: 14px; margin: 8px 0 0; opacity: 0.9;">Sua assinatura vence em breve</p>
                  </div>
                  <div style="background: #1a5c2a; height: 6px; width: 100%; margin-top: 20px;"></div>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding: 40px 30px; background-color: white; color: #333333;">
                  <h2 style="color: #1a2e6b; font-size: 24px; margin: 0 0 20px;">Olá, ${nome_usuario}!</h2>

                  <div style="background: linear-gradient(135deg, rgba(245, 196, 0, 0.2) 0%, rgba(245, 196, 0, 0.15) 100%); border-left: 4px solid #f5c400; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 18px; color: #856404; font-weight: bold; margin: 0;">
                      ⚠️ Pagamento Pendente
                    </p>
                  </div>

                  <p style="font-size: 14px; color: #666666; line-height: 1.8; margin: 0 0 20px;">
                    Sua assinatura do Clube Sou Brasil vence em <strong>${dias_para_vencer} dias</strong>.
                    Para continuar desfrutando de todos os descontos exclusivos, 
                    <strong>renove sua assinatura agora</strong>!
                  </p>

                  <!-- Informações da assinatura -->
                  <div style="background: linear-gradient(135deg, rgba(26, 92, 42, 0.05) 0%, rgba(245, 196, 0, 0.05) 100%); border-left: 4px solid #f5c400; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <div style="font-size: 14px; color: #333333;">
                      <p style="margin: 0 0 12px;"><strong>📅 Vencimento:</strong> ${data_vencimento}</p>
                      <p style="margin: 0;"><strong>💰 Valor:</strong> ${valor_assinatura}</p>
                    </div>
                  </div>

                  <p style="font-size: 14px; color: #666666; line-height: 1.8; margin: 25px 0 0;">
                    Não perca seus benefícios! Clique no botão abaixo para renovar sua assinatura em segundos.
                  </p>

                  <!-- CTA Button -->
                  <table style="width: 100%; max-width: 400px; margin: 30px auto 0;">
                    <tbody>
                      <tr>
                        <td style="text-align: center;">
                          <a href="${link_renovacao}" style="display: inline-block; background: linear-gradient(135deg, #1a2e6b 0%, #0d1a4a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(26, 46, 107, 0.3);">
                            RENOVAR AGORA
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div style="margin-top: 30px; padding: 15px; background-color: #fef9e7; border-radius: 6px; border-left: 4px solid #f5c400;">
                    <p style="font-size: 12px; color: #856404; margin: 0; line-height: 1.6;">
                      <strong>💡 Dica:</strong> Após a renovação, você terá acesso imediato a todos os descontos 
                      e poderá participar dos sorteios exclusivos do Clube Sou Brasil!
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
      subject: `⚠️ Sua assinatura vence em ${dias_para_vencer} dias, ${nome_usuario}!`,
      body: emailHTML,
    });

    console.log(`✅ Email de pagamento pendente enviado para ${email}`);
    return Response.json({ success: true, email_sent: email });

  } catch (error) {
    console.error('❌ Send Payment Pending Email Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});