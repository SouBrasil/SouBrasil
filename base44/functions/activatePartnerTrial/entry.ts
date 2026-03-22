import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Ativada quando um PartnerRequest é APROVADO (status: "aprovado")
// Cria Partner com trial de 90 dias

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