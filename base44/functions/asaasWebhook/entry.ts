import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Validate webhook token (set ASAAS_WEBHOOK_TOKEN in env)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (expectedToken && token !== expectedToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await req.json();
    console.log('ASAAS Webhook:', event.event, event.payment?.id);

    const { event: eventType, payment } = event;

    if (!payment) return Response.json({ received: true });

    // Update payment status in DB
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: payment.id });

    if (payments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, {
        status: payment.status,
      });
    }

    // Activate subscription on payment confirmed
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType)) {
      const [email, plan] = (payment.externalReference || '').split('|');
      if (email) {
        const subscriptionType = plan === 'annual' ? 'annual' : 'monthly';
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_type: subscriptionType,
            trial_start_date: null,
          });
          console.log(`Assinatura ativada para ${email}: ${subscriptionType}`);
        }
        // Mark payment activated
        if (payments.length > 0) {
          await base44.asServiceRole.entities.Payment.update(payments[0].id, {
            subscription_activated: true,
          });
        }
        // Send notification
        await base44.asServiceRole.entities.Notification.create({
          title: '✅ Pagamento confirmado!',
          message: `Seu plano ${plan === 'annual' ? 'Anual' : 'Mensal'} foi ativado com sucesso. Aproveite todos os benefícios!`,
          type: 'benefit',
          target: 'specific',
          target_email: email,
          sent_at: new Date().toISOString(),
        });
      }
    }

    // Handle refund / cancellation
    if (['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'].includes(eventType)) {
      const [email] = (payment.externalReference || '').split('|');
      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_type: null,
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});