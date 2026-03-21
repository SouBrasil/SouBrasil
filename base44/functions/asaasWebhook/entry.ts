import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Valida token
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

    // Atualiza status no DB
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: payment.id });
    if (payments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: payment.status });
    }

    // Extrai referência — funciona tanto para pagamentos avulsos quanto para ciclos de subscription
    const externalRef = payment.externalReference || '';
    const parts = externalRef.split('|');
    let email = parts[0];
    let plan = parts[1];
    let planType = parts[2] || 'client';

    // Se externalReference estiver vazio (cobrança de ciclo de subscription), busca pela subscription
    if (!email && payment.subscription) {
      const subData = await fetch(
        `${Deno.env.get('ASAAS_ENV') === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3'}/subscriptions/${payment.subscription}`,
        { headers: { 'Content-Type': 'application/json', 'access_token': Deno.env.get('ASAAS_API_KEY') } }
      );
      if (subData.ok) {
        const sub = await subData.json();
        const subParts = (sub.externalReference || '').split('|');
        email = subParts[0];
        plan = subParts[1];
        planType = subParts[2] || 'client';
      }
    }

    // ── Pagamento confirmado ──
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType) && email) {
      const now = new Date().toISOString();
      const subscriptionType = plan === 'annual' ? 'annual' : 'monthly';

      // Atualiza usuário
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          subscription_type: subscriptionType,
          subscription_date: now,
          trial_start_date: null,
        });
        console.log(`Assinatura renovada/ativada: ${email} → ${subscriptionType}`);
      }

      // Marca como ativado
      if (payments.length > 0 && !payments[0].subscription_activated) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, {
          status: payment.status,
          subscription_activated: true,
        });
      }

      // Se é cobrança de renovação (sem registro no DB), cria o registro
      if (payments.length === 0 && email) {
        await base44.asServiceRole.entities.Payment.create({
          user_email: email,
          plan: plan || 'monthly',
          amount: payment.value,
          billing_type: payment.billingType || 'PIX',
          asaas_payment_id: payment.id,
          asaas_customer_id: payment.customer,
          asaas_invoice_url: payment.invoiceUrl || '',
          status: payment.status,
          subscription_activated: true,
          notes: planType,
          due_date: payment.dueDate || now.split('T')[0],
        });
      }

      // Registro financeiro
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

      // Notifica usuário via UserNotification (lida pelo sino de notificações)
      const isRenewal = payments.length === 0;
      await base44.asServiceRole.entities.UserNotification.create({
        title: isRenewal ? '🔄 Assinatura renovada!' : '✅ Pagamento confirmado!',
        message: isRenewal
          ? `Sua assinatura ${plan === 'annual' ? 'Anual' : 'Mensal'} foi renovada automaticamente. Continue aproveitando os benefícios! 🎉`
          : `Seu plano ${plan === 'annual' ? 'Anual' : 'Mensal'} foi ativado com sucesso. Aproveite todos os benefícios! 🎉`,
        type: 'benefit',
        read: false,
        sent_at: now,
        created_by: email,
      });
    }

    // ── Pagamento vencido ──
    if (eventType === 'PAYMENT_OVERDUE' && email) {
      await base44.asServiceRole.entities.UserNotification.create({
        title: '⚠️ Pagamento vencido',
        message: 'Seu pagamento está vencido. Efetue o pagamento para manter sua assinatura ativa.',
        type: 'alert',
        read: false,
        sent_at: new Date().toISOString(),
        created_by: email,
      });
    }

    // ── Subscription cancelada pelo ASAAS ──
    if (['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(eventType) && email) {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          subscription_type: null,
          subscription_date: null,
        });
      }
      await base44.asServiceRole.entities.UserNotification.create({
        title: '❌ Assinatura cancelada',
        message: 'Seu pagamento foi estornado e sua assinatura foi desativada.',
        type: 'alert',
        read: false,
        sent_at: new Date().toISOString(),
        created_by: email,
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});