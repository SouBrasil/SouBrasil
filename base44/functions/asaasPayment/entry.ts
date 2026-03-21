import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

function asaasHeaders() {
  return {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY,
  };
}

async function asaasFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: asaasHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.description || JSON.stringify(data) || 'Erro ASAAS');
  return data;
}

async function findOrCreateCustomer(user) {
  // Try search by CPF first, then email
  if (user.cpf) {
    const byCpf = await asaasFetch(`/customers?cpfCnpj=${user.cpf.replace(/\D/g, '')}`);
    if (byCpf.data?.length > 0) return byCpf.data[0];
  }
  const byEmail = await asaasFetch(`/customers?email=${encodeURIComponent(user.email)}`);
  if (byEmail.data?.length > 0) return byEmail.data[0];

  // Create new customer
  return asaasFetch('/customers', 'POST', {
    name: user.full_name || user.email,
    email: user.email,
    cpfCnpj: user.cpf ? user.cpf.replace(/\D/g, '') : undefined,
    mobilePhone: user.phone ? user.phone.replace(/\D/g, '') : undefined,
  });
}

// Prices for client plans
const CLIENT_PLAN_PRICES = {
  monthly: 19.90,
  annual:  179.90,
};
const CLIENT_PLAN_LABELS = {
  monthly: 'Assinatura Mensal — Clube Sou Brasil',
  annual:  'Assinatura Anual — Clube Sou Brasil',
};

// Prices for partner plans
const PARTNER_PLAN_PRICES = {
  monthly: 299.90,
  annual:  2500.00,
};
const PARTNER_PLAN_LABELS = {
  monthly: 'Plano Parceiro Mensal — Sou Brasil',
  annual:  'Plano Parceiro Anual — Sou Brasil',
};

function getDueDate(days = 3) {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!ASAAS_API_KEY) {
      return Response.json({
        error: 'ASAAS_API_KEY não configurada. Configure nas variáveis de ambiente.',
        sandbox_mode: Deno.env.get('ASAAS_ENV') !== 'production',
      }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────
    // CREATE PAYMENT — cliente ou parceiro
    // ──────────────────────────────────────────────────
    if (action === 'create_payment') {
      const { plan, billing_type, cpf, referral_code, plan_type = 'client' } = body;

      if (!plan || !billing_type) {
        return Response.json({ error: 'plan e billing_type são obrigatórios' }, { status: 400 });
      }

      const prices = plan_type === 'partner' ? PARTNER_PLAN_PRICES : CLIENT_PLAN_PRICES;
      const labels = plan_type === 'partner' ? PARTNER_PLAN_LABELS : CLIENT_PLAN_LABELS;

      const amount = prices[plan];
      if (!amount) return Response.json({ error: 'Plano inválido' }, { status: 400 });

      const userEnriched = { ...user, cpf: cpf || user.cpf };
      const customer = await findOrCreateCustomer(userEnriched);
      const dueDate = getDueDate(3);

      const payment = await asaasFetch('/payments', 'POST', {
        customer: customer.id,
        billingType: billing_type,
        value: amount,
        dueDate,
        description: labels[plan],
        externalReference: `${user.email}|${plan}|${plan_type}|${referral_code || ''}`,
      });

      const paymentData = {
        asaas_payment_id: payment.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: payment.invoiceUrl,
        status: payment.status,
      };

      if (billing_type === 'PIX') {
        const pixData = await asaasFetch(`/payments/${payment.id}/pixQrCode`);
        paymentData.pix_qr_code = pixData.encodedImage;
        paymentData.pix_copy_paste = pixData.payload;
      } else if (billing_type === 'BOLETO') {
        paymentData.boleto_url = payment.bankSlipUrl;
        paymentData.boleto_barcode = payment.nossoNumero;
      }

      await base44.entities.Payment.create({
        user_email: user.email,
        user_name: user.full_name,
        plan,
        amount,
        billing_type,
        referral_code: referral_code || '',
        due_date: dueDate,
        notes: plan_type,
        ...paymentData,
      });

      return Response.json({ success: true, payment: paymentData });
    }

    // ──────────────────────────────────────────────────
    // CHECK STATUS — poll de confirmação
    // ──────────────────────────────────────────────────
    if (action === 'check_status') {
      const { asaas_payment_id } = body;
      if (!asaas_payment_id) return Response.json({ error: 'asaas_payment_id obrigatório' }, { status: 400 });

      const payment = await asaasFetch(`/payments/${asaas_payment_id}`);

      if (['RECEIVED', 'CONFIRMED'].includes(payment.status)) {
        const parts = (payment.externalReference || '').split('|');
        const email = parts[0];
        const plan = parts[1];
        const planType = parts[2] || 'client';

        if (email) {
          const subscriptionType = plan === 'annual' ? 'annual' : 'monthly';
          const now = new Date().toISOString();

          const users = await base44.asServiceRole.entities.User.filter({ email });
          if (users.length > 0) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              subscription_type: subscriptionType,
              subscription_date: now,
              trial_start_date: null,
            });
          }

          const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id });
          if (payments.length > 0) {
            await base44.asServiceRole.entities.Payment.update(payments[0].id, {
              status: payment.status,
              subscription_activated: true,
            });
          }

          // Registro financeiro automático
          await base44.asServiceRole.entities.FinancialTransaction.create({
            type: 'mensalidade',
            amount: payment.value,
            description: `Assinatura ${planType === 'partner' ? 'Parceiro' : 'Cliente'} ${plan} — ${email}`,
            reference_id: asaas_payment_id,
            reference_type: 'asaas_payment',
            status: 'pago',
            paid_at: now,
            user_email: email,
          });
        }
      }

      return Response.json({ status: payment.status, value: payment.value });
    }

    // ──────────────────────────────────────────────────
    // GET MY PAYMENTS
    // ──────────────────────────────────────────────────
    if (action === 'get_my_payments') {
      const payments = await base44.entities.Payment.filter({ user_email: user.email }, '-created_date', 20);
      return Response.json({ payments });
    }

    // ──────────────────────────────────────────────────
    // SYNC ALL — admin: re-sincroniza status de todos pagamentos PENDING
    // ──────────────────────────────────────────────────
    if (action === 'admin_sync_payments') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const pendingPayments = await base44.asServiceRole.entities.Payment.filter({ status: 'PENDING' }, '-created_date', 100);
      let synced = 0;

      for (const p of pendingPayments) {
        if (!p.asaas_payment_id) continue;
        const asaasPayment = await asaasFetch(`/payments/${p.asaas_payment_id}`);
        if (asaasPayment.status !== p.status) {
          await base44.asServiceRole.entities.Payment.update(p.id, { status: asaasPayment.status });

          if (['RECEIVED', 'CONFIRMED'].includes(asaasPayment.status) && !p.subscription_activated) {
            const parts = (asaasPayment.externalReference || '').split('|');
            const email = parts[0];
            const plan = parts[1];
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
              }
              await base44.asServiceRole.entities.Payment.update(p.id, { subscription_activated: true });
              await base44.asServiceRole.entities.FinancialTransaction.create({
                type: 'mensalidade',
                amount: asaasPayment.value,
                description: `Assinatura ${plan} — ${email} (sync)`,
                reference_id: p.asaas_payment_id,
                reference_type: 'asaas_payment',
                status: 'pago',
                paid_at: now,
                user_email: email,
              });
            }
          }
          synced++;
        }
      }

      return Response.json({ success: true, synced, total: pendingPayments.length });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('ASAAS Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});