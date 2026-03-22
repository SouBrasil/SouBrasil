import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Asaas: sandbox usa sandbox.asaas.com/api/v3, produção usa api.asaas.com/v3
const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.errors?.[0]?.description || data.message || JSON.stringify(data);
    throw new Error(errMsg);
  }
  return data;
}

// ── Busca ou cria cliente no Asaas ──
async function findOrCreateCustomer(user) {
  // 1. Tenta por CPF
  if (user.cpf) {
    const byCpf = await asaasFetch(`/customers?cpfCnpj=${user.cpf.replace(/\D/g, '')}`);
    if (byCpf.data?.length > 0) return byCpf.data[0];
  }
  // 2. Tenta por email
  const byEmail = await asaasFetch(`/customers?email=${encodeURIComponent(user.email)}`);
  if (byEmail.data?.length > 0) return byEmail.data[0];

  // 3. Cria novo cliente — cpfCnpj é obrigatório
  return asaasFetch('/customers', 'POST', {
    name: user.full_name || user.email,
    email: user.email,
    cpfCnpj: user.cpf ? user.cpf.replace(/\D/g, '') : undefined,
    mobilePhone: user.phone ? user.phone.replace(/\D/g, '') : undefined,
    address: user.street || user.address || undefined,
    addressNumber: user.number || undefined,
    province: user.neighborhood || undefined,
    postalCode: user.cep ? user.cep.replace(/\D/g, '') : undefined,
    city: user.city || undefined,
    externalReference: user.email,
  });
}

// ── Planos de cliente ──
const CLIENT_PLAN_PRICES  = { monthly: 19.90,  annual: 179.88 };
const CLIENT_PLAN_LABELS  = {
  monthly: 'Assinatura Mensal — Clube Sou Brasil',
  annual:  'Assinatura Anual — Clube Sou Brasil',
};

// ── Planos de parceiro ──
const PARTNER_PLAN_PRICES = { monthly: 299.90, annual: 2500.00 };
const PARTNER_PLAN_LABELS = {
  monthly: 'Plano Parceiro Mensal — Sou Brasil',
  annual:  'Plano Parceiro Anual — Sou Brasil',
};

// Valores de comissão por tipo e plano
const COMMISSION_VALUES = {
  client:  { monthly: 10,  annual: 10  },
  partner: { monthly: 100, annual: 200 },
};

function asaasCycle(plan) {
  return plan === 'annual' ? 'YEARLY' : 'MONTHLY';
}

function getDueDate(days = 1) {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

// ── Calcula nova data de expiração somando dias ao saldo atual ──
function calcExpiresAt(plan, currentExpiresAt, currentSubscriptionType) {
  const now = new Date();
  const newDays = plan === 'annual' ? 365 : 30;

  // Só aproveita saldo restante se o usuário já tem um plano PAGO ativo (não trial)
  const paidTypes = ['premium_mensal', 'premium_anual', 'partner_monthly', 'partner_annual', 'monthly', 'annual'];
  const hasPaidPlan = paidTypes.includes(currentSubscriptionType);

  let base = now;
  if (hasPaidPlan && currentExpiresAt && new Date(currentExpiresAt) > now) {
    base = new Date(currentExpiresAt);
  }

  const result = new Date(base);
  result.setDate(result.getDate() + newDays);
  return result.toISOString();
}

// ── Ativa assinatura no usuário ──
async function activateSubscription(base44, email, plan, planType, asaasPaymentId, paymentValue) {
  const isPartner = planType === 'partner';
  let subscriptionType;
  if (isPartner) {
    subscriptionType = plan === 'annual' ? 'partner_annual' : 'partner_monthly';
  } else {
    subscriptionType = plan === 'annual' ? 'premium_anual' : 'premium_mensal';
  }
  const now = new Date().toISOString();

  const users = await base44.asServiceRole.entities.User.filter({ email });
  if (users.length > 0) {
    const u = users[0];
    const expiresAt = calcExpiresAt(plan, u.subscription_expires_at, u.subscription_type);

    await base44.asServiceRole.entities.User.update(u.id, {
      subscription_type: subscriptionType,
      subscription_date: now,
      subscription_expires_at: expiresAt,
      trial_start_date: null,
      trial_used: true,
    });
    console.log(`Assinatura ativada: ${email} → ${subscriptionType}, expira: ${expiresAt}`);
  }

  // Marca pagamento como ativado
  if (asaasPaymentId) {
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: asaasPaymentId });
    if (payments.length > 0 && !payments[0].subscription_activated) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, {
        status: 'RECEIVED',
        subscription_activated: true,
      });
    }
  }

  // Registro financeiro — evita duplicata
  if (asaasPaymentId) {
    const existingTx = await base44.asServiceRole.entities.FinancialTransaction.filter({ reference_id: asaasPaymentId });
    if (existingTx.length === 0) {
      await base44.asServiceRole.entities.FinancialTransaction.create({
        type: 'mensalidade',
        amount: paymentValue,
        description: `Assinatura ${planType === 'partner' ? 'Parceiro' : 'Cliente'} ${plan} — ${email}`,
        reference_id: asaasPaymentId,
        reference_type: 'asaas_payment',
        status: 'pago',
        paid_at: now,
        user_email: email,
      });
    }
  }

  // Notifica usuário
  const userRecords = await base44.asServiceRole.entities.User.filter({ email });
  if (userRecords.length > 0) {
    await base44.asServiceRole.entities.UserNotification.create({
      title: '✅ Pagamento confirmado!',
      message: `Seu plano ${plan === 'annual' ? 'Anual' : 'Mensal'} foi ativado com sucesso. Aproveite todos os benefícios! 🎉`,
      type: 'benefit',
      read: false,
      sent_at: now,
      created_by: email,
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!ASAAS_API_KEY) {
      return Response.json({ error: 'ASAAS_API_KEY não configurada.' }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────
    // CREATE PAYMENT / SUBSCRIPTION
    // ──────────────────────────────────────────────────
    if (action === 'create_payment') {
      const { plan, billing_type, cpf, referral_code, referrer_email, plan_type = 'client' } = body;

      if (!plan || !billing_type) {
        return Response.json({ error: 'plan e billing_type são obrigatórios' }, { status: 400 });
      }

      const prices = plan_type === 'partner' ? PARTNER_PLAN_PRICES : CLIENT_PLAN_PRICES;
      const labels = plan_type === 'partner' ? PARTNER_PLAN_LABELS : CLIENT_PLAN_LABELS;
      const amount = prices[plan];
      if (!amount) return Response.json({ error: 'Plano inválido' }, { status: 400 });

      const userEnriched = { ...user, cpf: cpf || user.cpf };
      const customer = await findOrCreateCustomer(userEnriched);

      // Busca referrer — tenta por referrer_email ou referral_code
      let referrer = null;
      let splitPayload = null;

      if (referrer_email) {
        const referrers = await base44.asServiceRole.entities.User.filter({ email: referrer_email });
        if (referrers.length > 0) {
          referrer = referrers[0];
          console.log(`✅ Referrer encontrado por email: ${referrer_email}`);
        }
      } else if (referral_code) {
        const referrers = await base44.asServiceRole.entities.User.filter({ referral_code });
        if (referrers.length > 0) {
          referrer = referrers[0];
          console.log(`✅ Referrer encontrado por código: ${referral_code}`);
        }
      }

      // Configura split se o afiliado tem wallet Asaas
      if (referrer) {
        if (referrer.asaas_wallet_id) {
          const commissionValue = COMMISSION_VALUES[plan_type]?.[plan] || 0;
          if (commissionValue > 0) {
            splitPayload = {
              walletId: referrer.asaas_wallet_id,
              fixedValue: commissionValue,
            };
            console.log(`💰 Split configurado: R$${commissionValue} para wallet ${referrer.asaas_wallet_id}`);
          }
        } else {
          console.log(`⚠️ Referrer ${referrer.email} não tem asaas_wallet_id configurada`);
        }
      }

      const subscriptionPayload = {
        customer: customer.id,
        billingType: billing_type,
        value: amount,
        nextDueDate: getDueDate(1),
        cycle: asaasCycle(plan),
        description: labels[plan],
        externalReference: `${user.email}|${plan}|${plan_type}|${referral_code || ''}`,
      };

      if (splitPayload) {
        subscriptionPayload.split = [splitPayload];
      }

      const subscription = await asaasFetch('/subscriptions', 'POST', subscriptionPayload);

      // Busca a primeira cobrança gerada pela subscription
      let firstPayment = null;
      const paymentsRes = await asaasFetch(`/payments?subscription=${subscription.id}&limit=1`);
      if (paymentsRes.data?.length > 0) {
        firstPayment = paymentsRes.data[0];
      }

      const paymentData = {
        asaas_payment_id: firstPayment?.id || subscription.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: firstPayment?.invoiceUrl || '',
        asaas_subscription_id: subscription.id,
        status: firstPayment?.status || 'PENDING',
      };

      // Busca PIX QR Code se billing_type for PIX
      if (billing_type === 'PIX' && firstPayment?.id) {
        try {
          const pixData = await asaasFetch(`/payments/${firstPayment.id}/pixQrCode`);
          paymentData.pix_qr_code = pixData.encodedImage;
          paymentData.pix_copy_paste = pixData.payload;
        } catch (err) {
          console.warn('Erro ao buscar PIX QR Code:', err.message);
        }
      } else if (billing_type === 'BOLETO' && firstPayment) {
        paymentData.boleto_url = firstPayment.bankSlipUrl;
        paymentData.boleto_barcode = firstPayment.nossoNumero;
      } else if (billing_type === 'CREDIT_CARD' && firstPayment) {
        paymentData.asaas_invoice_url = firstPayment.invoiceUrl;
      }

      // Grava pagamento no banco
      await base44.entities.Payment.create({
        user_email: user.email,
        user_name: user.full_name,
        plan,
        amount,
        billing_type,
        referral_code: referral_code || '',
        due_date: getDueDate(1),
        notes: plan_type,
        ...paymentData,
      });

      // Registra comissão pendente — somente no 1º pagamento do indicado
      if (referrer) {
        const commissionValue = COMMISSION_VALUES[plan_type]?.[plan] || 0;
        if (commissionValue > 0) {
          // Verifica se já existe comissão paga para esse indicado (bloqueia renovações)
          const existingCommissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
            referred_email: user.email,
          });
          const alreadyPaid = existingCommissions.some(c =>
            ['confirmada', 'transferida'].includes(c.status)
          );

          if (!alreadyPaid) {
            await base44.asServiceRole.entities.AffiliateCommission.create({
              referrer_email: referrer.email,
              referred_email: user.email,
              referrer_name: referrer.full_name,
              referred_name: user.full_name,
              user_type: plan_type === 'partner' ? 'parceiro' : 'cliente',
              plan_type: plan,
              commission_value: commissionValue,
              asaas_payment_id: paymentData.asaas_payment_id,
              status: 'pendente',
            });
            console.log(`✅ Comissão criada: R$${commissionValue} para ${referrer.email} (${referrer.full_name}) pela indicação de ${user.email} (${plan_type} ${plan})`);
          } else {
            console.log(`⏭️ Comissão ignorada para ${user.email} — renovação (já houve pagamento anterior)`);
          }
        }
      } else {
        console.log(`ℹ️ Nenhum referrer encontrado para plan_type=${plan_type}, referral_code=${referral_code}`);
      }

      return Response.json({ success: true, payment: paymentData });
    }

    // ──────────────────────────────────────────────────
    // CHECK STATUS — polling manual
    // ──────────────────────────────────────────────────
    if (action === 'check_status') {
      const { asaas_payment_id } = body;
      if (!asaas_payment_id) return Response.json({ error: 'asaas_payment_id obrigatório' }, { status: 400 });

      const payment = await asaasFetch(`/payments/${asaas_payment_id}`);

      if (['RECEIVED', 'CONFIRMED'].includes(payment.status)) {
        const parts = (payment.externalReference || '').split('|');
        const email    = parts[0];
        const plan     = parts[1];
        const planType = parts[2] || 'client';

        if (email) {
          await activateSubscription(base44, email, plan, planType, asaas_payment_id, payment.value);

          // Confirma comissões pendentes
          const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
            asaas_payment_id,
            status: 'pendente',
          });
          for (const comm of commissions) {
            await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
              status: 'confirmada',
              payment_date: new Date().toISOString(),
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
                sent_at: new Date().toISOString(),
                created_by: comm.referrer_email,
              });
            }
          }
        }
      }

      // Atualiza status no DB
      const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id });
      if (payments.length > 0) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: payment.status });
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
    // ADMIN SYNC — re-sincroniza pagamentos PENDING
    // ──────────────────────────────────────────────────
    if (action === 'admin_sync_payments') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const pendingPayments = await base44.asServiceRole.entities.Payment.filter({ status: 'PENDING' }, '-created_date', 100);
      let synced = 0;

      for (const p of pendingPayments) {
        if (!p.asaas_payment_id) continue;
        try {
          const asaasPayment = await asaasFetch(`/payments/${p.asaas_payment_id}`);
          if (asaasPayment.status !== p.status) {
            await base44.asServiceRole.entities.Payment.update(p.id, { status: asaasPayment.status });

            if (['RECEIVED', 'CONFIRMED'].includes(asaasPayment.status) && !p.subscription_activated) {
              const parts = (asaasPayment.externalReference || '').split('|');
              const email = parts[0];
              const plan  = parts[1];
              const planType = parts[2] || 'client';
              if (email) {
                await activateSubscription(base44, email, plan, planType, p.asaas_payment_id, asaasPayment.value);
              }
            }
            synced++;
          }
        } catch (err) {
          console.warn(`Erro ao sincronizar pagamento ${p.asaas_payment_id}:`, err.message);
        }
      }

      return Response.json({ success: true, synced, total: pendingPayments.length });
    }

    // ──────────────────────────────────────────────────
    // EXPIRE SUBSCRIPTIONS — chamado por automação agendada
    // ──────────────────────────────────────────────────
    if (action === 'expire_subscriptions') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const now = new Date();
      let expired = 0;

      // Busca todos os tipos de assinatura pagos
      const subTypes = ['premium_mensal', 'premium_anual', 'partner_monthly', 'partner_annual'];
      const allPaidUsers = [];
      for (const st of subTypes) {
        const batch = await base44.asServiceRole.entities.User.filter({ subscription_type: st }, '-created_date', 500);
        allPaidUsers.push(...batch);
      }

      for (const u of allPaidUsers) {
        // Usa subscription_expires_at se existir, senão calcula pelo subscription_date (legado)
        let expiry;
        if (u.subscription_expires_at) {
          expiry = new Date(u.subscription_expires_at);
        } else if (u.subscription_date) {
          expiry = new Date(u.subscription_date);
          ['premium_anual', 'partner_annual'].includes(u.subscription_type)
            ? expiry.setFullYear(expiry.getFullYear() + 1)
            : expiry.setMonth(expiry.getMonth() + 1);
        } else continue;

        if (now > expiry) {
          await base44.asServiceRole.entities.User.update(u.id, {
            subscription_type: null,
            subscription_date: null,
            subscription_expires_at: null,
          });
          await base44.asServiceRole.entities.UserNotification.create({
            title: '⚠️ Sua assinatura expirou',
            message: 'Sua assinatura Sou Brasil expirou. Renove para continuar aproveitando os benefícios!',
            type: 'alert',
            read: false,
            sent_at: now.toISOString(),
            created_by: u.email,
          });
          expired++;
        }
      }

      return Response.json({ success: true, expired });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('ASAAS Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});