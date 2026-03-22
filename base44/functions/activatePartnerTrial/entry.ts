import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ============================================================================
// Ativada quando um PartnerRequest é APROVADO (status: "aprovado")
// Cria Partner com trial de 90 dias e envia email HTML profissional
// ============================================================================

// Template HTML para email de aprovação de parceiro
function generatePartnerWelcomeEmail(data, tempPassword, portalUrl) {
  const COLORS = {
    greenDark: '#1a5c2a',
    yellow: '#f5c400',
    navy: '#1a2e6b',
  };

  const LOGO_URL = 'https://media.base44.com/images/public/user_69b9c557424640bf7f14ad8a/a3052d43d_LogoSouBrasil-Oficial-FundoTransparente.png';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px 0; background-color: #f9f9f9;">
        <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tbody>
            <!-- HEADER -->
            <tr>
              <td style="background: linear-gradient(135deg, ${COLORS.greenDark} 0%, ${COLORS.navy} 100%); padding: 0; text-align: center;">
                <div style="background: ${COLORS.yellow}; height: 6px; width: 100%;"></div>
                <div style="padding: 30px 20px 20px;">
                  <img src="${LOGO_URL}" alt="Sou Brasil" style="max-width: 180px; height: auto;">
                </div>
                <div style="padding: 20px 20px 0; color: white; text-align: center;">
                  <p style="font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 1px;">🎉 Seu cadastro foi aprovado! 🎉</p>
                  <p style="font-size: 14px; margin: 8px 0 0; opacity: 0.95;">Bem-vindo(a) ao Portal Parceiro Sou Brasil!</p>
                </div>
                <div style="background: ${COLORS.yellow}; height: 6px; width: 100%; margin-top: 20px;"></div>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding: 40px 30px; background-color: white; color: #333333;">
                <h2 style="color: ${COLORS.navy}; font-size: 22px; margin: 0 0 20px; font-weight: bold;">
                  Olá, ${data.owner_name}!
                </h2>

                <p style="font-size: 16px; color: ${COLORS.greenDark}; font-weight: bold; margin: 0 0 15px;">
                  ✨ Sua solicitação foi APROVADA!
                </p>

                <p style="font-size: 14px; color: #666666; line-height: 1.8; margin: 0 0 25px;">
                  Agora você já pode acessar o portal de parceiros com suas credenciais. 
                  Você tem <strong>90 dias de trial GRÁTIS</strong> para começar!
                </p>

                <!-- Credenciais -->
                <div style="background: linear-gradient(135deg, rgba(26, 92, 42, 0.05) 0%, rgba(245, 196, 0, 0.05) 100%); border-left: 4px solid ${COLORS.greenDark}; border-radius: 6px; padding: 20px; margin: 20px 0;">
                  <div style="font-size: 14px; color: #333333;">
                    <p style="margin: 0 0 12px;">
                      <strong>📧 E-mail:</strong><br>
                      <code style="background: #f0f0f0; padding: 6px 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">${data.owner_email}</code>
                    </p>
                    <p style="margin: 12px 0 0;">
                      <strong>🔑 Senha provisória:</strong><br>
                      <code style="background: #f0f0f0; padding: 6px 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">${tempPassword}</code>
                    </p>
                  </div>
                </div>

                <p style="font-size: 13px; color: #666666; margin: 25px 0 0; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                  ⚠️ Recomendamos que você mude sua senha no primeiro acesso para manter sua conta segura.
                </p>

                <!-- CTA Button -->
                <table style="width: 100%; max-width: 400px; margin: 30px auto 0;">
                  <tbody>
                    <tr>
                      <td style="text-align: center;">
                        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.navy} 0%, #0d1a4a 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(26, 46, 107, 0.3);">
                          ACESSAR PORTAL
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Próximos passos -->
                <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 6px;">
                  <p style="font-size: 13px; color: #333333; margin: 0; line-height: 1.8;">
                    <strong>🎯 Próximos passos:</strong><br>
                    1️⃣ Acesse o portal com suas credenciais<br>
                    2️⃣ Mude sua senha (provisória)<br>
                    3️⃣ Complete seu perfil comercial<br>
                    4️⃣ Escolha um plano (trial ou pago)
                  </p>
                </div>

                <div style="margin-top: 20px; padding: 15px; background-color: #fef9e7; border-left: 4px solid ${COLORS.yellow}; border-radius: 6px;">
                  <p style="font-size: 12px; color: #856404; margin: 0; line-height: 1.6;">
                    <strong>💡 Oferta especial:</strong> Nos primeiros 7 dias após aprovação, contratar o plano anual por apenas <strong>R$ 2.500</strong> (economize R$ 1.100!)
                  </p>
                </div>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background-color: ${COLORS.greenDark}; padding: 30px 20px; text-align: center; color: white; font-size: 13px;">
                <p style="margin: 0 0 15px; font-style: italic; font-size: 16px; font-weight: 500;">Equipe Sou Brasil 🇧🇷</p>
                <p style="margin: 0; opacity: 0.9;">Porque todo Brasileiro merece Desconto!</p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Payload da automação entity
    const { event, data } = body;

    if (!data || event.type !== 'update') {
      return Response.json({ error: 'Invalid event' }, { status: 400 });
    }

    // Verifica se status mudou para "aprovado"
    if (data.status !== 'aprovado') {
      return Response.json({ success: false, reason: 'Not approved' });
    }

    console.log(`✅ Ativando trial de parceiro: ${data.business_name}`);

    const now = new Date();
    const trialExpiration = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Cria Partner
    const partner = await base44.asServiceRole.entities.Partner.create({
      name: data.business_name,
      category: data.category,
      description: data.description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      discount_description: data.discount_description,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      image_url: data.logo_url || data.business_photo_url,
      opening_hours: data.opening_hours,
      instagram: data.instagram,
      facebook: data.facebook,
      tiktok: data.tiktok,
      youtube: data.youtube,
      website: data.website,
      cpf: data.cpf,
      cnpj: data.cnpj,
      active: true,
      subscription_type: 'none',
      trial_start_date: now.toISOString(),
      trial_expires_at: trialExpiration.toISOString(),
      trial_days: 90,
    });

    console.log(`📍 Partner criado com ID: ${partner.id}`);

    // Cria PartnerAccess (login/senha temporária)
    const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const access = await base44.asServiceRole.entities.PartnerAccess.create({
      partner_id: partner.id,
      email: data.owner_email,
      password_hash: tempPassword, // TODO: Hash corretamente em produção
      must_change_password: true,
      active: true,
      referral_link: `${process.env.BASE44_APP_URL || ''}/PartnerSignup?ref=${data.referral_code || ''}`,
    });

    console.log(`🔑 PartnerAccess criado com ID: ${access.id}`);

    // Envia email com credenciais
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: data.owner_email,
        subject: '🎉 Sua empresa foi aprovada no Clube Sou Brasil!',
        body: `Olá ${data.owner_name}!\n\nSua empresa "${data.business_name}" foi APROVADA e está agora ativa no Clube Sou Brasil!\n\n📊 ACESSO AO PORTAL:\nEmail: ${data.owner_email}\nSenha temporária: ${tempPassword}\nURL: ${process.env.BASE44_APP_URL || ''}/PartnerPortal\n\n⏰ TRIAL: Você tem 90 dias de trial GRÁTIS!\n🚀 OFERTA ESPECIAL: Nos primeiros 7 dias, contratar o plano anual por R$ 2.500 (economize R$ 1.100!)\n\n📱 Primeira coisa a fazer:\n1. Acesse o portal com suas credenciais\n2. Mude sua senha (temporária)\n3. Configure seu perfil comercial\n4. Escolha um plano (trial ou pago)\n\nDúvidas? Contate-nos!\n\n— Equipe Sou Brasil 💚`,
      });
    } catch (e) {
      console.warn(`⚠️ Erro ao enviar email: ${e.message}`);
    }

    return Response.json({
      success: true,
      partner_id: partner.id,
      access_id: access.id,
      trial_expires_at: trialExpiration.toISOString(),
    });

  } catch (error) {
    console.error('❌ Activate Trial Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});