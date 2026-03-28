import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

/**
 * Webhook dedicado para pagamentos de parceiros comerciais.
 * Ativado pelos eventos PAYMENT_RECEIVED / PAYMENT_CONFIRMED do Asaas.
 * Trata planos: partner_monthly, partner_annual, wallet_activation
 */
Deno.serve(async (req) => {
  try {
    // ── Validação do token de autenticação do webhook ──
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (expectedToken) {
      const headerToken = req.headers.get('asaas-access-token');
      const url = new URL(req.url);
      const queryToken = url.searchParams.get('token');
      if (headerToken !== expectedToken && queryToken !== expectedToken) {
        console.warn('Webhook token inválido');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const event = await req.json();
    const { event: eventType, payment } = event;

    console.log('PartnerWebhook recebido:', eventType, payment?.id);

    if (!payment) return Response.json({ received: true });

    const now = new Date().toISOString();

    // ── Apenas processa pagamentos confirmados ──
    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType)) {
      return Response.json({ received: true, ignored: true });
    }

    // Resolve externalReference para identificar email, plano e tipo
    const externalRef = payment.externalReference || '';
    let parts = externalRef.split('|');
    let email = parts[0];
    let plan = parts[1];
    let planType = parts[2] || 'partner';

    // Se não tem externalReference, tenta buscar via subscription
    if (!email && payment.subscription && ASAAS_API_KEY) {
      try {
        const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${payment.subscription}`, {
          headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const sub = await res.json();
          const subParts = (sub.externalReference || '').split('|');
          email    = subParts[0];
          plan     = subParts[1];
          planType = subParts[2] || 'partner';
        }
      } catch (e) {
        console.warn('Erro ao buscar subscription:', e.message);
      }
    }

    // ── Atualiza registro de Payment no banco ──
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: payment.id });
    if (payments.length > 0 && payments[0].subscription_activated) {
      console.log('Pagamento já ativado:', payment.id);
      return Response.json({ received: true, already_processed: true });
    }
    if (payments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, {
        status: payment.status,
        subscription_activated: true,
      });
    }

    if (!email) {
      console.warn('Sem email no externalReference:', externalRef);
      return Response.json({ received: true, warning: 'no_email' });
    }

    // ── Trata ativação de carteira (R$ 14,99) ──
    if (plan === 'wallet_activation') {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        const userData = users[0];
        const updateData = { wallet_activation_paid: true };
        if (!userData.referral_code) {
          updateData.referral_code = 'REF' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        await base44.asServiceRole.entities.User.update(userData.id, updateData);
        await base44.asServiceRole.entities.UserNotification.create({
          title: '🎉 Carteira ativada!',
          message: 'Pagamento de R$ 14,99 confirmado! Sua carteira e link de indicação estão prontos.',
          type: 'benefit', read: false,
          sent_at: now, created_by: email,
        });
        console.log('Ativação de carteira confirmada para:', email);
      }
      return Response.json({ received: true });
    }

    // ── Trata planos de parceiro ──
    const isPartnerPlan = planType === 'partner' || plan === 'monthly' || plan === 'annual';
    if (!isPartnerPlan) {
      // Não é plano de parceiro, ignora (será tratado pelo webhook principal)
      return Response.json({ received: true, ignored: 'not_partner' });
    }

    const subscriptionType = plan === 'annual' ? 'partner_annual' : 'partner_monthly';
    const daysToAdd = plan === 'annual' ? 365 : 30;

    // ── Ativa assinatura do parceiro (User) ──
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length > 0) {
      const u = users[0];
      const paidTypes = ['partner_monthly', 'partner_annual'];
      const nowDate = new Date();

      // Determina a base de cálculo: plano pago ativo > trial restante > agora
      const hasActivePaid = paidTypes.includes(u.subscription_type) && u.subscription_expires_at && new Date(u.subscription_expires_at) > nowDate;
      const trialExpiry = u.trial_expires_at ? new Date(u.trial_expires_at) : null;
      const hasActiveTrial = !hasActivePaid && trialExpiry && trialExpiry > nowDate;

      let base;
      if (hasActivePaid) {
        base = new Date(u.subscription_expires_at);
      } else if (hasActiveTrial) {
        // Soma o tempo restante de trial ao novo plano
        base = trialExpiry;
        console.log('Somando trial restante ao novo plano. Trial expira:', trialExpiry.toISOString());
      } else {
        base = nowDate;
      }

      const expiresAt = new Date(base);
      expiresAt.setDate(expiresAt.getDate() + daysToAdd);

      await base44.asServiceRole.entities.User.update(u.id, {
        subscription_type: subscriptionType,
        subscription_date: now,
        subscription_expires_at: expiresAt.toISOString(),
        trial_start_date: null,
        trial_used: true,
      });
      console.log('Assinatura parceiro ativada:', email, '->', subscriptionType, 'expira:', expiresAt.toISOString());

      await base44.asServiceRole.entities.UserNotification.create({
        title: '✅ Assinatura Parceiro confirmada!',
        message: `Seu plano ${plan === 'annual' ? 'Anual' : 'Mensal'} de Parceiro foi ativado. Acesse o Portal do Parceiro!`,
        type: 'benefit', read: false,
        sent_at: now, created_by: email,
      });
    }

    // ── Ativa assinatura no Partner (registro de parceiro) ──
    const partnerAccesses = await base44.asServiceRole.entities.PartnerAccess.filter({ email });
    if (partnerAccesses.length > 0) {
      const pa = partnerAccesses[0];
      if (pa.partner_id) {
        // Usa list + find para evitar problemas com filter por ID
        const allPartners = await base44.asServiceRole.entities.Partner.list('-created_date', 1000);
        const partnerRecord = allPartners.find(p => p.id === pa.partner_id);
        if (partnerRecord) {
          // Usa a mesma lógica de somar trial
          const nowDate2 = new Date();
          const paidTypes2 = ['partner_monthly', 'partner_annual'];
          const hasActivePaid2 = paidTypes2.includes(partnerRecord.subscription_type) && partnerRecord.subscription_expires_at && new Date(partnerRecord.subscription_expires_at) > nowDate2;
          const partnerTrialExpiry = partnerRecord.trial_expires_at ? new Date(partnerRecord.trial_expires_at) : null;
          const hasActiveTrial2 = !hasActivePaid2 && partnerTrialExpiry && partnerTrialExpiry > nowDate2;

          let base2;
          if (hasActivePaid2) base2 = new Date(partnerRecord.subscription_expires_at);
          else if (hasActiveTrial2) base2 = partnerTrialExpiry;
          else base2 = nowDate2;

          const partnerExpiresAt = new Date(base2);
          partnerExpiresAt.setDate(partnerExpiresAt.getDate() + daysToAdd);

          await base44.asServiceRole.entities.Partner.update(pa.partner_id, {
            subscription_type: subscriptionType,
            subscription_expires_at: partnerExpiresAt.toISOString(),
            trial_start_date: null,
            active: true,
          });
          console.log('Partner atualizado:', pa.partner_id, '->', subscriptionType, 'expira:', partnerExpiresAt.toISOString());
        } else {
          console.warn('Partner não encontrado para id:', pa.partner_id);
        }
      }
    }

    // ── Registro financeiro ──
    const existingTx = await base44.asServiceRole.entities.FinancialTransaction.filter({ reference_id: payment.id });
    if (existingTx.length === 0) {
      await base44.asServiceRole.entities.FinancialTransaction.create({
        type: 'mensalidade',
        amount: payment.value || 0,
        description: `Assinatura Parceiro ${plan} — ${email}`,
        reference_id: payment.id,
        reference_type: 'asaas_payment',
        status: 'pago',
        paid_at: now,
        user_email: email,
      });
    }

    // ── Comissões de afiliado ──
    let commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
      asaas_payment_id: payment.id,
      status: 'pendente',
    });

    if (commissions.length === 0 && email) {
      const uList = await base44.asServiceRole.entities.User.filter({ email });
      if (uList.length > 0 && uList[0].referral_code_used) {
        const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
        const referrer = allUsers.find(u => u.referral_code === uList[0].referral_code_used);
        if (referrer) {
          const COMMISSION_VALUES = { monthly: 100, annual: 200 };
          const commValue = COMMISSION_VALUES[plan] || 0;
          if (commValue > 0) {
            const existing = await base44.asServiceRole.entities.AffiliateCommission.filter({
              referred_email: email, referrer_email: referrer.email,
            });
            const alreadyPaid = existing.some(c => ['confirmada', 'transferida'].includes(c.status));
            if (!alreadyPaid) {
              const newComm = await base44.asServiceRole.entities.AffiliateCommission.create({
                referrer_email: referrer.email,
                referred_email: email,
                referrer_name: referrer.full_name,
                referred_name: uList[0].full_name,
                user_type: 'parceiro',
                plan_type: plan,
                commission_value: commValue,
                asaas_payment_id: payment.id,
                status: 'pendente',
              });
              commissions = [newComm];
            }
          }
        }
      }
    }

    for (const comm of commissions) {
      await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
        status: 'confirmada',
        payment_date: now,
      });
      await base44.asServiceRole.entities.UserNotification.create({
        title: '💰 Comissão confirmada!',
        message: `Comissão de R$ ${(comm.commission_value || 0).toFixed(2)} pela indicação de parceiro confirmada!`,
        type: 'benefit', read: false,
        sent_at: now, created_by: comm.referrer_email,
      });
    }

    return Response.json({ received: true, email, subscriptionType });

  } catch (error) {
    console.error('PartnerWebhook Error:', error.message);
    return Response.json({ received: true, warning: error.message });
  }
});