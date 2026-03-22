import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, partner_id, referrer_email } = await req.json();

    // ── CREATE COMMISSION ──
    // Cria uma comissão para o usuário que indicou o parceiro comercial
    if (action === 'create') {
      if (!partner_id || !referrer_email) {
        return Response.json({ error: 'partner_id e referrer_email são obrigatórios' }, { status: 400 });
      }

      // Busca o parceiro
      const partners = await base44.asServiceRole.entities.Partner.filter({ id: partner_id });
      if (partners.length === 0) {
        return Response.json({ error: 'Partner não encontrado' }, { status: 404 });
      }
      const partner = partners[0];

      // Busca o referrer
      const referrers = await base44.asServiceRole.entities.User.filter({ email: referrer_email });
      if (referrers.length === 0) {
        return Response.json({ error: 'Referrer não encontrado' }, { status: 404 });
      }
      const referrer = referrers[0];

      // Verifica se já existe comissão para este parceiro
      const existingCommissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
        referred_email: partner.created_by, // email do criador do parceiro
      });
      const alreadyExists = existingCommissions.some(c => 
        c.referrer_email === referrer_email && 
        c.user_type === 'parceiro'
      );

      if (alreadyExists) {
        return Response.json({ error: 'Comissão para este parceiro já existe' }, { status: 409 });
      }

      // Valor padrão de comissão para indicação de parceiro (configurável)
      const commissionValue = 250; // R$ 250 por parceiro indicado

      // Cria a comissão
      const commission = await base44.asServiceRole.entities.AffiliateCommission.create({
        referrer_email: referrer_email,
        referred_email: partner.created_by,
        referrer_name: referrer.full_name,
        referred_name: partner.name,
        user_type: 'parceiro',
        plan_type: 'monthly', // padrão para parceiro
        commission_value: commissionValue,
        status: 'confirmada', // já confirmada pois é aprovação direta
        payment_date: new Date().toISOString(),
      });

      // Atualiza partner com referrer info
      await base44.asServiceRole.entities.Partner.update(partner_id, {
        referrer_user_email: referrer_email,
        referred_at: new Date().toISOString(),
        commission_status: 'confirmada',
      });

      // Notifica o referrer
      await base44.asServiceRole.entities.UserNotification.create({
        title: '💰 Parceiro aprovado!',
        message: `Parabéns! Você indicou ${partner.name} como parceiro e está confirmado. Comissão de R$ ${commissionValue.toFixed(2)} creditada!`,
        type: 'benefit',
        read: false,
        sent_at: new Date().toISOString(),
        created_by: referrer_email,
      });

      // Atualiza earnings do referrer
      const currentEarnings = referrer.total_earned || 0;
      await base44.asServiceRole.entities.User.update(referrer.id, {
        total_earned: currentEarnings + commissionValue,
      });

      console.log(`✅ Comissão criada: R$${commissionValue} para ${referrer_email} pela indicação de ${partner.name}`);

      return Response.json({
        success: true,
        commission: {
          id: commission.id,
          value: commissionValue,
          referrer: referrer_email,
          partner: partner.name,
        },
      });
    }

    // ── LIST PENDING COMMISSIONS ──
    if (action === 'list_pending') {
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter(
        { status: 'pendente', user_type: 'parceiro' },
        '-created_date',
        100
      );
      return Response.json({ commissions });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Sync Partner Commission Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});