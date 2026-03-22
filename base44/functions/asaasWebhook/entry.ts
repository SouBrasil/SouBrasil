import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Asaas envia o token no header asaas-access-token (e também aceita query param token)
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (expectedToken) {
      const headerToken = req.headers.get('asaas-access-token');
      const url = new URL(req.url);
      const queryToken = url.searchParams.get('token');
      if (headerToken !== expectedToken && queryToken !== expectedToken) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const event = await req.json();
    const { event: eventType, payment } = event;
    console.log('ASAAS Webhook:', eventType, payment?.id);

    if (!payment) return Response.json({ received: true });

    // Atualiza status no DB se existir
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: payment.id });
    if (payments.length > 0) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: payment.status });
    }

    // Resolve externalReference — funciona para cobranças avulsas e ciclos de assinatura recorrente
    const externalRef = payment.externalReference || '';
    let parts = externalRef.split('|');
    let email = parts[0];
    let plan = parts[1];
    let planType = parts[2] || 'client';

    // Se não tem externalReference, tenta buscar pela subscription
    if (!email && payment.subscription) {
      const sub = await asaasFetch(`/subscriptions/${payment.subscription}`);
      if (sub) {
        const subParts = (sub.externalReference || '').split('|');
        email    = subParts[0];
        plan     = subParts[1];
        planType = subParts[2] || 'client';
      }
    }

    const now = new Date().toISOString();

    // ── PAGAMENTO CONFIRMADO/RECEBIDO ──
    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType) && email) {
      const subscriptionType = plan === 'annual' ? 'annual' : 'monthly';

      // Atualiza usuário
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          subscription_type: subscriptionType,
          subscription_date: now,
          trial_start_date: null,
        });
        console.log(`Assinatura ativada/renovada: ${email} → ${subscriptionType}`);
      }

      // Marca pagamento como ativado
      if (payments.length > 0 && !payments[0].subscription_activated) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, {
          status: payment.status,
          subscription_activated: true,
        });
      }

      // Se é renovação (não tem registro no DB), cria o registro
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

      // Notifica usuário
      const isRenewal = payments.length === 0;
      await base44.asServiceRole.entities.UserNotification.create({
        title: isRenewal ? '🔄 Assinatura renovada!' : '✅ Pagamento confirmado!',
        message: isRenewal
          ? `Sua assinatura ${plan === 'annual' ? 'Anual' : 'Mensal'} foi renovada. Continue aproveitando os benefícios! 🎉`
          : `Seu plano ${plan === 'annual' ? 'Anual' : 'Mensal'} foi ativado com sucesso. Aproveite todos os benefícios! 🎉`,
        type: 'benefit',
        read: false,
        sent_at: now,
        created_by: email,
      });

      // ── Confirma comissões pendentes do afiliado ──
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
        asaas_payment_id: payment.id,
        status: 'pendente',
      });
      for (const comm of commissions) {
        await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
          status: 'confirmada',
          payment_date: now,
        });

        // Atualiza total_earned do afiliado
        const referrerList = await base44.asServiceRole.entities.User.filter({ email: comm.referrer_email });
        if (referrerList.length > 0) {
          const currentTotal = referrerList[0].total_earned || 0;
          await base44.asServiceRole.entities.User.update(referrerList[0].id, {
            total_earned: currentTotal + comm.commission_value,
          });

          await base44.asServiceRole.entities.UserNotification.create({
            title: '💰 Comissão confirmada!',
            message: `Sua comissão de R$ ${comm.commission_value.toFixed(2)} pela indicação de ${comm.referred_name} foi confirmada!`,
            type: 'benefit',
            read: false,
            sent_at: now,
            created_by: comm.referrer_email,
          });
        }
      }
    }

    // ── PAGAMENTO VENCIDO ──
    if (eventType === 'PAYMENT_OVERDUE' && email) {
      await base44.asServiceRole.entities.UserNotification.create({
        title: '⚠️ Pagamento vencido',
        message: 'Seu pagamento está vencido. Efetue o pagamento para manter sua assinatura ativa.',
        type: 'alert',
        read: false,
        sent_at: now,
        created_by: email,
      });
    }

    // ── ASSINATURA CANCELADA / ESTORNADA ──
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
        message: 'Seu pagamento foi estornado e sua assinatura foi desativada. Entre em contato para mais informações.',
        type: 'alert',
        read: false,
        sent_at: now,
        created_by: email,
      });
    }

    // ── SUBSCRIPTION DELETADA ──
    if (eventType === 'PAYMENT_DELETED' && email) {
      console.log(`Pagamento deletado para ${email}: ${payment.id}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    // Retorna 200 mesmo em erro para evitar pausar a fila do Asaas
    return Response.json({ received: true, warning: error.message });
  }
});