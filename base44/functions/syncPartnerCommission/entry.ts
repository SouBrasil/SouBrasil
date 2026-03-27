import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Gerencia comissões de parceiros indicados por usuários.
 * Apenas admin pode criar/listar comissões via esta função.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, partner_id, referrer_email } = await req.json();

    // ── CREATE COMMISSION ──────────────────────────────────────────
    if (action === 'create') {
      if (!partner_id || !referrer_email) {
        return Response.json({ error: 'partner_id e referrer_email são obrigatórios' }, { status: 400 });
      }

      const partners = await base44.asServiceRole.entities.Partner.filter({ id: partner_id });
      if (partners.length === 0) {
        return Response.json({ error: 'Parceiro não encontrado' }, { status: 404 });
      }
      const partner = partners[0];

      const referrers = await base44.asServiceRole.entities.User.filter({ email: referrer_email });
      if (referrers.length === 0) {
        return Response.json({ error: 'Referrer não encontrado' }, { status: 404 });
      }
      const referrer = referrers[0];

      // Verifica duplicata
      const existingCommissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
        referrer_email: referrer_email,
        user_type: 'parceiro',
      });
      const alreadyExists = existingCommissions.some(c =>
        c.referred_email === (partner.created_by || partner_id) &&
        ['confirmada', 'transferida'].includes(c.status)
      );
      if (alreadyExists) {
        return Response.json({ error: 'Comissão para este parceiro já existe e foi confirmada' }, { status: 409 });
      }

      // Valor de comissão padrão para parceiro mensal
      const commissionValue = 100;

      const commission = await base44.asServiceRole.entities.AffiliateCommission.create({
        referrer_email: referrer_email,
        referred_email: partner.created_by || partner_id,
        referrer_name: referrer.full_name,
        referred_name: partner.name,
        user_type: 'parceiro',
        plan_type: 'monthly',
        commission_value: commissionValue,
        status: 'confirmada',
        payment_date: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.Partner.update(partner_id, {
        referrer_user_email: referrer_email,
        referred_at: new Date().toISOString(),
        commission_status: 'confirmada',
      });

      await base44.asServiceRole.entities.UserNotification.create({
        title: '💰 Parceiro aprovado!',
        message: `Você indicou ${partner.name} como parceiro. Comissão de R$ ${commissionValue.toFixed(2)} confirmada!`,
        type: 'benefit', read: false,
        sent_at: new Date().toISOString(),
        created_by: referrer_email,
      });

      console.log(`Comissão parceiro criada: R$${commissionValue} para ${referrer_email} -> ${partner.name}`);

      return Response.json({
        success: true,
        commission: { id: commission.id, value: commissionValue, referrer: referrer_email, partner: partner.name },
      });
    }

    // ── LIST PENDING ────────────────────────────────────────────────
    if (action === 'list_pending') {
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter(
        { status: 'pendente', user_type: 'parceiro' }, '-created_date', 100
      );
      return Response.json({ commissions });
    }

    return Response.json({ error: 'Ação inválida. Use: create, list_pending' }, { status: 400 });

  } catch (error) {
    console.error('SyncPartnerCommission Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});