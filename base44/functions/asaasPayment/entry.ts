import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
};

async function asaasFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: asaasHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.description || 'Erro ASAAS');
  return data;
}

async function findOrCreateCustomer(user) {
  // Search existing customer by CPF or email
  const cpfQuery = user.cpf ? `?cpfCnpj=${user.cpf.replace(/\D/g, '')}` : `?email=${encodeURIComponent(user.email)}`;
  const search = await asaasFetch(`/customers${cpfQuery}`);
  if (search.data?.length > 0) return search.data[0];

  // Create customer
  return asaasFetch('/customers', 'POST', {
    name: user.full_name || user.email,
    email: user.email,
    cpfCnpj: user.cpf ? user.cpf.replace(/\D/g, '') : undefined,
    phone: user.phone ? user.phone.replace(/\D/g, '') : undefined,
    mobilePhone: user.phone ? user.phone.replace(/\D/g, '') : undefined,
  });
}

const PLAN_PRICES = { monthly: 19.90, annual: 179.90 };
const PLAN_LABELS = { monthly: 'Assinatura Mensal - Clube Sou Brasil', annual: 'Assinatura Anual - Clube Sou Brasil' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!ASAAS_API_KEY) {
      return Response.json({ error: 'ASAAS_API_KEY não configurada. Configure nas variáveis de ambiente.' }, { status: 500 });
    }

    const body = await req.json();
    const { action, plan, billing_type, cpf, referral_code } = body;

    if (action === 'create_payment') {
      // Validate
      if (!plan || !billing_type) {
        return Response.json({ error: 'plan e billing_type são obrigatórios' }, { status: 400 });
      }
      const amount = PLAN_PRICES[plan];
      if (!amount) return Response.json({ error: 'Plano inválido' }, { status: 400 });

      // Enrich user with CPF if provided
      const userEnriched = { ...user, cpf: cpf || user.cpf };

      // Find or create ASAAS customer
      const customer = await findOrCreateCustomer(userEnriched);

      // Due date = today + 3 days
      const due = new Date();
      due.setDate(due.getDate() + 3);
      const dueDate = due.toISOString().split('T')[0];

      // Create payment
      const payment = await asaasFetch('/payments', 'POST', {
        customer: customer.id,
        billingType: billing_type,
        value: amount,
        dueDate,
        description: PLAN_LABELS[plan],
        externalReference: `${user.email}|${plan}|${referral_code || ''}`,
      });

      // Build response object
      const paymentData = {
        asaas_payment_id: payment.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: payment.invoiceUrl,
        status: payment.status,
      };

      // Fetch Pix or Boleto details
      if (billing_type === 'PIX') {
        const pixData = await asaasFetch(`/payments/${payment.id}/pixQrCode`);
        paymentData.pix_qr_code = pixData.encodedImage;
        paymentData.pix_copy_paste = pixData.payload;
      } else if (billing_type === 'BOLETO') {
        paymentData.boleto_url = payment.bankSlipUrl;
        paymentData.boleto_barcode = payment.nossoNumero;
      }

      // Save payment record to database
      await base44.entities.Payment.create({
        user_email: user.email,
        user_name: user.full_name,
        plan,
        amount,
        billing_type,
        referral_code: referral_code || '',
        due_date: dueDate,
        ...paymentData,
      });

      return Response.json({ success: true, payment: paymentData });
    }

    if (action === 'check_status') {
      const { asaas_payment_id } = body;
      if (!asaas_payment_id) return Response.json({ error: 'asaas_payment_id obrigatório' }, { status: 400 });

      const payment = await asaasFetch(`/payments/${asaas_payment_id}`);

      // If confirmed, activate subscription
      if (['RECEIVED', 'CONFIRMED'].includes(payment.status)) {
        const [email, plan] = (payment.externalReference || '').split('|');
        if (email) {
          const subscriptionType = plan === 'annual' ? 'annual' : 'monthly';
          // Update user subscription
          const users = await base44.asServiceRole.entities.User.filter({ email });
          if (users.length > 0) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              subscription_type: subscriptionType,
              trial_start_date: null,
            });
          }
          // Mark payment activated
          const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id });
          if (payments.length > 0) {
            await base44.asServiceRole.entities.Payment.update(payments[0].id, {
              status: payment.status,
              subscription_activated: true,
            });
          }
        }
      }

      return Response.json({ status: payment.status, value: payment.value });
    }

    if (action === 'get_my_payments') {
      const payments = await base44.entities.Payment.filter({ user_email: user.email }, '-created_date', 10);
      return Response.json({ payments });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('ASAAS Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});