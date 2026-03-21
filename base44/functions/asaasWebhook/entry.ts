import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Validate webhook token
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (expectedToken && token !== expectedToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await req.json();
    const { event: eventType, payment } = event;
    console.log('ASAAS Webhook:', eventType, payment?.id);

    if (!payment) return Response.json({ received: true });

    // Update payment status in DB
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: payment.id });
    if (payments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: payment.status });
    }

    // ── Activate subscription on confirmed payment ──
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType)) {
      const parts = (payment.externalReference || '').split('|');
      const email = parts[0];
      const plan = parts[1];
      const planType = parts[2] || 'client';

      if (email) {
        const now = new Date().toISOString();
        const subscriptionType = plan === 'annual' ? 'annual' : 'monthly';

        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_type: subscriptionType,
            subscription_date: now,
            trial_start_date: null,
          });
          console.log(`Assinatura ativada: ${email} → ${subscriptionType}`);
        }

        if (payments.length > 0 && !payments[0].subscription_activated) {
          await base44.asServiceRole.entities.Payment.update(payments[0].id, {
            status: payment.status,
            subscription_activated: true,
          });
        }

        // Financial transaction record
        await base44.asServiceRole.entities.FinancialTransaction.create({
          type: 'mensalidade',
          amount: payment.value,
          description: `Assinatura ${planType === 'partner' ? 'Parceiro' : 'Cliente'} ${plan} — ${email}`,
          reference_id: payment.id,
          reference_type: 'asaas_payment',
          status: 'pago',
          paid_at: now,
          user_email: email,
        });

        // Notify user
        await base44.asServiceRole.entities.Notification.create({
          title: '✅ Pagamento confirmado!',
          message: `Seu plano ${plan === 'annual' ? 'Anual' : 'Mensal'} foi ativado com sucesso. Aproveite todos os benefícios! 🎉`,
          type: 'benefit',
          target: 'specific',
          target_email: email,
          sent_at: now,
        });
      }
    }

    // ── Overdue ──
    if (eventType === 'PAYMENT_OVERDUE') {
      const [email] = (payment.externalReference || '').split('|');
      if (email) {
        await base44.asServiceRole.entities.Notification.create({
          title: '⚠️ Pagamento vencido',
          message: 'Seu pagamento está vencido. Efetue o pagamento para manter sua assinatura ativa.',
          type: 'alert',
          target: 'specific',
          target_email: email,
          sent_at: new Date().toISOString(),
        });
      }
    }

    // ── Refund / Chargeback — deactivate subscription ──
    if (['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(eventType)) {
      const [email] = (payment.externalReference || '').split('|');
      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_type: null,
            subscription_date: null,
          });
        }
        await base44.asServiceRole.entities.Notification.create({
          title: '❌ Assinatura cancelada',
          message: 'Seu pagamento foi estornado e sua assinatura foi desativada.',
          type: 'alert',
          target: 'specific',
          target_email: email,
          sent_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});