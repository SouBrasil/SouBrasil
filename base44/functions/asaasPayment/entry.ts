import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path, method, body) {
  if (!method) method = 'GET';
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
    const errMsg = (data.errors && data.errors[0] && data.errors[0].description) || data.message || JSON.stringify(data);
    throw new Error(errMsg);
  }
  return data;
}

async function findOrCreateCustomer(user, doc) {
  const docClean = (doc || user.cpf || user.cnpj || '').replace(/\D/g, '');
  console.log('findOrCreateCustomer: email=' + user.email + ', docClean=' + docClean);
  
  if (docClean && docClean.length >= 11) {
    try {
      const byDoc = await asaasFetch(`/customers?cpfCnpj=${docClean}`);
      if (byDoc.data && byDoc.data.length > 0) {
        console.log('Cliente encontrado por CPF/CNPJ: ' + byDoc.data[0].id);
        return byDoc.data[0];
      }
    } catch (e) {
      console.warn('Erro ao buscar cliente por CPF: ' + e.message);
    }
  }
  
  try {
    const byEmail = await asaasFetch(`/customers?email=${encodeURIComponent(user.email)}`);
    if (byEmail.data && byEmail.data.length > 0) {
      console.log('Cliente encontrado por email: ' + byEmail.data[0].id);
      return byEmail.data[0];
    }
  } catch (e) {
    console.warn('Erro ao buscar cliente por email: ' + e.message);
  }
  
  console.log('Criando novo cliente: ' + user.email);
  return asaasFetch('/customers', 'POST', {
    name: user.full_name || user.email,
    email: user.email,
    cpfCnpj: docClean || undefined,
    mobilePhone: user.phone ? user.phone.replace(/\D/g, '') : undefined,
    externalReference: user.email,
  });
}

const CLIENT_PLAN_PRICES  = { monthly: 19.90,  annual: 179.88 };
const CLIENT_PLAN_LABELS  = {
  monthly: 'Assinatura Mensal — Clube Sou Brasil',
  annual:  'Assinatura Anual — Clube Sou Brasil',
};
const PARTNER_PLAN_PRICES = { monthly: 299.90, annual: 2500.00 };
const PARTNER_PLAN_LABELS = {
  monthly: 'Plano Parceiro Mensal — Sou Brasil',
  annual:  'Plano Parceiro Anual — Sou Brasil',
};
const COMMISSION_VALUES = {
  client:  { monthly: 10,  annual: 10  },
  partner: { monthly: 100, annual: 200 },
};

function asaasCycle(plan) {
  return plan === 'annual' ? 'YEARLY' : 'MONTHLY';
}

function getDueDate(days) {
  if (!days) days = 1;
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

function calcExpiresAt(plan, currentExpiresAt, currentSubscriptionType) {
  const now = new Date();
  const newDays = plan === 'annual' ? 365 : 30;
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

async function activateSubscription(base44, email, plan, planType, asaasPaymentId, paymentValue) {
  // Para planos de parceiro, tenta encontrar referral_code_used do USUÁRIO vinculado
  // (pois email do pagamento é o email do parceiro/PartnerAccess, não necessariamente o User)
  const isPartner = planType === 'partner';
  let subscriptionType;
  if (isPartner) {
    subscriptionType = plan === 'annual' ? 'partner_annual' : 'partner_monthly';
  } else {
    subscriptionType = plan === 'annual' ? 'premium_anual' : 'premium_mensal';
  }
  const now = new Date().toISOString();

  // GUARD: verifica se este pagamento já foi ativado antes de prosseguir
  if (asaasPaymentId) {
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: asaasPaymentId });
    if (existingPayments.length > 0 && existingPayments[0].subscription_activated === true) {
      console.log('Pagamento ' + asaasPaymentId + ' já ativado. Pulando reativação.');
      return;
    }
  }

  if (isPartner) {
    // ── PARCEIRO COMERCIAL: atualiza APENAS a entidade Partner, NÃO o User ──
    // O User é uma pessoa física (cliente); o Partner é a empresa (CNPJ/PJ)
    try {
      const partnerAccesses = await base44.asServiceRole.entities.PartnerAccess.filter({ email });
      if (partnerAccesses.length > 0) {
        const partnerId = partnerAccesses[0].partner_id;
        const allPartners = await base44.asServiceRole.entities.Partner.list('-created_date', 1000);
        const partnerRecord = allPartners.find(p => p.id === partnerId);
        if (partnerRecord) {
          const newDays = plan === 'annual' ? 365 : 30;
          const nowDate = new Date();
          const paidTypes = ['partner_monthly', 'partner_annual'];
          const hasActivePaid = paidTypes.includes(partnerRecord.subscription_type) && partnerRecord.subscription_expires_at && new Date(partnerRecord.subscription_expires_at) > nowDate;
          const trialExpiry = partnerRecord.trial_expires_at ? new Date(partnerRecord.trial_expires_at) : null;
          const hasActiveTrial = !hasActivePaid && trialExpiry && trialExpiry > nowDate;
          let base = nowDate;
          if (hasActivePaid) base = new Date(partnerRecord.subscription_expires_at);
          else if (hasActiveTrial) base = trialExpiry;
          const expiresAt = new Date(base);
          expiresAt.setDate(expiresAt.getDate() + newDays);
          await base44.asServiceRole.entities.Partner.update(partnerId, {
            subscription_type: subscriptionType,
            subscription_expires_at: expiresAt.toISOString(),
            trial_start_date: null,
            active: true,
          });
          console.log('Partner atualizado (somente Partner, não User): ' + partnerId + ' -> ' + subscriptionType + ' expira: ' + expiresAt.toISOString());
        }
      }
    } catch (partnerErr) {
      console.warn('Erro ao atualizar Partner record: ' + partnerErr.message);
    }
  } else {
    // ── USUÁRIO FINAL: atualiza APENAS o User ──
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
      console.log('User assinatura ativada: ' + email + ' -> ' + subscriptionType + ', expira: ' + expiresAt);
    }
  }

  if (asaasPaymentId) {
    const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: asaasPaymentId });
    if (payments.length > 0 && !payments[0].subscription_activated) {
      await base44.asServiceRole.entities.Payment.update(payments[0].id, {
        status: 'RECEIVED',
        subscription_activated: true,
      });
    }
  }

  if (asaasPaymentId) {
    const existingTx = await base44.asServiceRole.entities.FinancialTransaction.filter({ reference_id: asaasPaymentId });
    if (existingTx.length === 0) {
      await base44.asServiceRole.entities.FinancialTransaction.create({
        type: 'mensalidade',
        amount: paymentValue,
        description: 'Assinatura ' + (planType === 'partner' ? 'Parceiro' : 'Cliente') + ' ' + plan + ' — ' + email,
        reference_id: asaasPaymentId,
        reference_type: 'asaas_payment',
        status: 'pago',
        paid_at: now,
        user_email: email,
      });
    }
  }

  const userRecords = await base44.asServiceRole.entities.User.filter({ email });
  if (userRecords.length > 0) {
    await base44.asServiceRole.entities.UserNotification.create({
      title: '✅ Pagamento confirmado!',
      message: 'Seu plano ' + (plan === 'annual' ? 'Anual' : 'Mensal') + ' foi ativado com sucesso. Aproveite todos os benefícios!',
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
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    
    // Ações que não precisam de autenticação (teste)
    if (action === 'test_create_payment') {
      if (!ASAAS_API_KEY) {
        return Response.json({ error: 'ASAAS_API_KEY nao configurada.' }, { status: 500 });
      }
      const testUser = {
        email: body.user_email || 'test@example.com',
        full_name: body.user_name || 'Teste User',
        cpf: body.cpf || '07367642677',
      };
      const plan = body.plan || 'monthly';
      const billing_type = body.billing_type || 'PIX';
      const plan_type = body.plan_type || 'client';
      
      console.log('TEST_CREATE_PAYMENT: user=' + testUser.email + ', plan=' + plan + ', billing=' + billing_type);
      
      const prices = plan_type === 'partner' ? PARTNER_PLAN_PRICES : CLIENT_PLAN_PRICES;
      const labels = plan_type === 'partner' ? PARTNER_PLAN_LABELS : CLIENT_PLAN_LABELS;
      const amount = prices[plan];
      if (!amount) return Response.json({ error: 'Plano invalido: ' + plan }, { status: 400 });
      
      const customer = await findOrCreateCustomer(testUser, body.cpf);
      const subscriptionPayload = {
        customer: customer.id,
        billingType: billing_type,
        value: amount,
        nextDueDate: getDueDate(1),
        cycle: asaasCycle(plan),
        description: labels[plan],
        externalReference: testUser.email + '|' + plan + '|' + plan_type + '|test',
      };
      
      const subscription = await asaasFetch('/subscriptions', 'POST', subscriptionPayload);
      let firstPayment = null;
      const paymentsRes = await asaasFetch('/payments?subscription=' + subscription.id + '&limit=1');
      if (paymentsRes.data && paymentsRes.data.length > 0) {
        firstPayment = paymentsRes.data[0];
      }
      
      const paymentData = {
        asaas_payment_id: (firstPayment && firstPayment.id) || subscription.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: (firstPayment && firstPayment.invoiceUrl) || '',
        status: (firstPayment && firstPayment.status) || 'PENDING',
      };
      
      if (billing_type === 'PIX' && firstPayment && firstPayment.id) {
        try {
          const pixData = await asaasFetch('/payments/' + firstPayment.id + '/pixQrCode');
          paymentData.pix_qr_code = pixData.encodedImage;
          paymentData.pix_copy_paste = pixData.payload;
        } catch (err) {
          console.warn('Erro ao buscar PIX QR Code: ' + err.message);
        }
      }
      
      console.log('TEST_CREATE_PAYMENT OK: ' + paymentData.asaas_payment_id);
      return Response.json({ success: true, payment: paymentData });
    }
    
    // Demais ações requerem autenticação
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!ASAAS_API_KEY) {
      return Response.json({ error: 'ASAAS_API_KEY nao configurada.' }, { status: 500 });
    }

    // CREATE WALLET ACTIVATION PAYMENT (R$ 14,99)
    if (action === 'create_wallet_activation_payment') {
      const billing_type = body.billing_type;
      const cpf = body.cpf || '';
      const amount = 14.99;

      console.log('CREATE_WALLET_ACTIVATION_PAYMENT: user=' + user.email + ', billing=' + billing_type);

      const docClean = cpf.replace(/\D/g, '');
      if (!docClean || docClean.length < 11) {
        return Response.json({ error: 'CPF obrigatório e válido' }, { status: 400 });
      }

      const userEnriched = Object.assign({}, user, { cpf: cpf || user.cpf });
      let customer;
      try {
        customer = await findOrCreateCustomer(userEnriched, cpf);
        if (!customer || !customer.id) {
          throw new Error('Cliente não foi criado corretamente');
        }
      } catch (e) {
        return Response.json({ error: 'Erro ao encontrar/criar cliente: ' + e.message }, { status: 500 });
      }

      // Cobrança ÚNICA (não recorrente) para taxa de ativação
      let charge;
      try {
        const chargePayload = {
          customer: customer.id,
          billingType: billing_type,
          value: amount,
          dueDate: getDueDate(1),
          description: 'Taxa de Ativação de Carteira Asaas — Sou Brasil',
          externalReference: user.email + '|wallet_activation|' + Date.now(),
        };
        charge = await asaasFetch('/payments', 'POST', chargePayload);
        console.log('Cobrança de ativação criada: ' + charge.id);
      } catch (e) {
        return Response.json({ error: 'Erro ao criar cobrança: ' + e.message }, { status: 500 });
      }

      // Salva CPF no perfil do usuário para criação automática da wallet depois
      try {
        const cpfToSave = (body.cpf || '').replace(/\D/g, '');
        if (cpfToSave.length === 11) await base44.auth.updateMe({ cpf: cpfToSave });
      } catch (_) {}

      const paymentData = {
        asaas_payment_id: charge.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: charge.invoiceUrl || '',
        status: charge.status || 'PENDING',
      };

      if (billing_type === 'PIX') {
        try {
          const pixData = await asaasFetch('/payments/' + charge.id + '/pixQrCode');
          paymentData.pix_qr_code = pixData.encodedImage;
          paymentData.pix_copy_paste = pixData.payload;
          console.log('QR Code PIX obtido');
        } catch (err) {
          console.warn('Erro ao buscar PIX QR Code: ' + err.message);
        }
      } else if (billing_type === 'BOLETO') {
        paymentData.boleto_url = charge.bankSlipUrl;
        paymentData.boleto_barcode = charge.nossoNumero;
      }

      const paymentRecord = {
        user_email: user.email,
        user_name: user.full_name,
        plan: 'wallet_activation',
        amount: amount,
        billing_type: billing_type,
        due_date: getDueDate(1),
        notes: 'wallet_activation',
        asaas_payment_id: paymentData.asaas_payment_id,
        asaas_customer_id: paymentData.asaas_customer_id,
        asaas_invoice_url: paymentData.asaas_invoice_url,
        status: paymentData.status,
      };
      if (paymentData.pix_qr_code) paymentRecord.pix_qr_code = paymentData.pix_qr_code;
      if (paymentData.pix_copy_paste) paymentRecord.pix_copy_paste = paymentData.pix_copy_paste;
      if (paymentData.boleto_url) paymentRecord.boleto_url = paymentData.boleto_url;

      try {
        await base44.entities.Payment.create(paymentRecord);
        console.log('Registro de pagamento de ativação criado: ' + paymentData.asaas_payment_id);
      } catch (e) {
        console.error('Erro ao criar registro: ' + e.message);
      }

      return Response.json({ success: true, payment: paymentData });
    }

    // CREATE PAYMENT
    if (action === 'create_payment') {
      const plan        = body.plan;        // 'monthly' | 'annual'
      const billing_type = body.billing_type; // 'PIX' | 'BOLETO' | 'CREDIT_CARD'
      const cpf_cnpj    = body.cpf || '';
      const planType    = body.plan_type || 'client'; // 'client' | 'partner'
      const referralCode = body.referral_code || null;

      if (!plan || !billing_type) {
        return Response.json({ error: 'plan e billing_type sao obrigatorios' }, { status: 400 });
      }

      const isPartner = planType === 'partner';
      const prices    = isPartner ? PARTNER_PLAN_PRICES : CLIENT_PLAN_PRICES;
      const labels    = isPartner ? PARTNER_PLAN_LABELS : CLIENT_PLAN_LABELS;
      const amount    = prices[plan];
      if (!amount) return Response.json({ error: 'Plano invalido: ' + plan }, { status: 400 });

      const docClean = cpf_cnpj.replace(/\D/g, '');
      if (!docClean || docClean.length < 11) {
        return Response.json({ error: 'CPF/CNPJ obrigatorio e valido' }, { status: 400 });
      }

      const userEnriched = Object.assign({}, user, { cpf: docClean, cnpj: docClean });
      let customer;
      try {
        customer = await findOrCreateCustomer(userEnriched, docClean);
        if (!customer || !customer.id) throw new Error('Cliente nao criado corretamente');
      } catch (e) {
        return Response.json({ error: 'Erro ao encontrar/criar cliente: ' + e.message }, { status: 500 });
      }

      let subscription;
      try {
        const externalRef = user.email + '|' + plan + '|' + planType + '|' + Date.now();
        const subscriptionPayload = {
          customer: customer.id,
          billingType: billing_type,
          value: amount,
          nextDueDate: getDueDate(1),
          cycle: asaasCycle(plan),
          description: labels[plan],
          externalReference: externalRef,
        };
        subscription = await asaasFetch('/subscriptions', 'POST', subscriptionPayload);
        console.log('Assinatura criada: ' + subscription.id + ' externalRef=' + externalRef);
      } catch (e) {
        return Response.json({ error: 'Erro ao criar assinatura: ' + e.message }, { status: 500 });
      }

      let firstPayment = null;
      try {
        const paymentsRes = await asaasFetch('/payments?subscription=' + subscription.id + '&limit=1');
        if (paymentsRes.data && paymentsRes.data.length > 0) {
          firstPayment = paymentsRes.data[0];
          console.log('Primeiro pagamento: ' + firstPayment.id);
        }
      } catch (e) {
        console.warn('Erro ao buscar pagamento: ' + e.message);
      }

      const paymentData = {
        asaas_payment_id: (firstPayment && firstPayment.id) || subscription.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: (firstPayment && firstPayment.invoiceUrl) || '',
        asaas_subscription_id: subscription.id,
        status: (firstPayment && firstPayment.status) || 'PENDING',
      };

      if (billing_type === 'PIX' && firstPayment && firstPayment.id) {
        try {
          const pixData = await asaasFetch('/payments/' + firstPayment.id + '/pixQrCode');
          paymentData.pix_qr_code    = pixData.encodedImage;
          paymentData.pix_copy_paste = pixData.payload;
        } catch (err) {
          console.warn('Erro ao buscar QR PIX: ' + err.message);
        }
      } else if (billing_type === 'BOLETO' && firstPayment) {
        paymentData.boleto_url     = firstPayment.bankSlipUrl;
        paymentData.boleto_barcode = firstPayment.nossoNumero;
      } else if (billing_type === 'CREDIT_CARD' && firstPayment) {
        paymentData.asaas_invoice_url = firstPayment.invoiceUrl;
      }

      // Registrar comissão pendente se veio de referral
      if (referralCode) {
        try {
          const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
          const referrer = allUsers.find(u => u.referral_code === referralCode);
          if (referrer) {
            const commValue = (COMMISSION_VALUES[planType] && COMMISSION_VALUES[planType][plan]) || 0;
            if (commValue > 0) {
              const existing = await base44.asServiceRole.entities.AffiliateCommission.filter({
                referred_email: user.email,
                referrer_email: referrer.email,
              });
              const alreadyPaid = existing.some(c => ['confirmada', 'transferida'].includes(c.status));
              if (!alreadyPaid) {
                await base44.asServiceRole.entities.AffiliateCommission.create({
                  referrer_email: referrer.email,
                  referred_email: user.email,
                  referrer_name: referrer.full_name,
                  referred_name: user.full_name,
                  user_type: planType === 'partner' ? 'parceiro' : 'cliente',
                  plan_type: plan,
                  commission_value: commValue,
                  asaas_payment_id: paymentData.asaas_payment_id,
                  status: 'pendente',
                });
                console.log('Comissao criada para: ' + referrer.email);
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao registrar comissao: ' + e.message);
        }
      }

      // Criar registro de pagamento
      const paymentRecord = {
        user_email:          user.email,
        user_name:           user.full_name,
        plan:                plan,
        amount:              amount,
        billing_type:        billing_type,
        due_date:            getDueDate(1),
        notes:               planType,
        asaas_payment_id:    paymentData.asaas_payment_id,
        asaas_customer_id:   paymentData.asaas_customer_id,
        asaas_invoice_url:   paymentData.asaas_invoice_url,
        status:              paymentData.status,
        referral_code:       referralCode || '',
        subscription_activated: false,
      };
      if (paymentData.pix_qr_code)    paymentRecord.pix_qr_code    = paymentData.pix_qr_code;
      if (paymentData.pix_copy_paste) paymentRecord.pix_copy_paste = paymentData.pix_copy_paste;
      if (paymentData.boleto_url)     paymentRecord.boleto_url     = paymentData.boleto_url;

      try {
        await base44.entities.Payment.create(paymentRecord);
      } catch (e) {
        console.error('Erro ao criar registro Payment: ' + e.message);
      }

      return Response.json({ success: true, payment: paymentData });
    }

    // CHECK STATUS
    if (action === 'check_status') {
      const asaas_payment_id = body.asaas_payment_id;
      if (!asaas_payment_id) return Response.json({ error: 'asaas_payment_id obrigatorio' }, { status: 400 });

      const payment = await asaasFetch('/payments/' + asaas_payment_id);

      if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
        const parts = (payment.externalReference || '').split('|');
        const email    = parts[0];
        const plan     = parts[1];
        const planType = parts[2] || 'client';

        // Identifica se é pagamento de ativação de carteira
        const isWalletActivation = plan === 'wallet_activation';

        if (isWalletActivation) {
          const users = await base44.asServiceRole.entities.User.filter({ email });
          if (users.length > 0) {
            const userData = users[0];
            const updateData = { wallet_activation_paid: true };

            // Auto-criar subconta Asaas se ainda não existe
            if (!userData.asaas_wallet_id) {
              const cpfClean = (userData.cpf || '').replace(/\D/g, '');
              if (cpfClean.length === 11) {
                try {
                  const existing = await asaasFetch('/accounts?cpfCnpj=' + cpfClean);
                  let walletId = null;
                  if (existing && existing.data && existing.data.length > 0) {
                    walletId = existing.data[0].walletId;
                    console.log('Subconta Asaas já existe para: ' + email);
                  } else {
                    const account = await asaasFetch('/accounts', 'POST', {
                      name: userData.full_name || email,
                      email: email,
                      cpfCnpj: cpfClean,
                    });
                    walletId = account.walletId;
                    console.log('Subconta Asaas criada automaticamente: ' + walletId);
                  }
                  if (walletId) updateData.asaas_wallet_id = walletId;
                } catch (walletErr) {
                  console.warn('Auto-create wallet failed (non-critical): ' + walletErr.message);
                }
              }
            }

            // Auto-gerar referral_code se não existe
            if (!userData.referral_code) {
              const refCode = 'REF' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
              updateData.referral_code = refCode;
              console.log('Referral code gerado automaticamente: ' + refCode);
            }

            await base44.asServiceRole.entities.User.update(userData.id, updateData);
            console.log('Ativação de carteira confirmada para: ' + email);

            await base44.asServiceRole.entities.UserNotification.create({
              title: '🎉 Carteira ativada com sucesso!',
              message: 'Pagamento de R$ 14,99 confirmado! Sua carteira Asaas foi criada e seu link de indicação está liberado. Comece a indicar e ganhar!',
              type: 'benefit',
              read: false,
              sent_at: new Date().toISOString(),
              created_by: email,
            });
          }
        } else if (email) {
          await activateSubscription(base44, email, plan, planType, asaas_payment_id, payment.value);

          // Para pagamentos de parceiro, o email pode ser do PartnerAccess
          // Precisamos encontrar o referral_code_used do usuário vinculado
          let referralEmail = email;
          if (planType === 'partner') {
            // Busca o PartnerAccess para encontrar o partner_id
            const accesses = await base44.asServiceRole.entities.PartnerAccess.filter({ email });
            if (accesses.length > 0) {
              const partnerId = accesses[0].partner_id;
              // Busca o Partner para encontrar o referrer_user_email
              const partnerRecords = await base44.asServiceRole.entities.Partner.list('-created_date', 1000);
              const partnerRecord = partnerRecords.find(p => p.id === partnerId);
              if (partnerRecord && partnerRecord.referrer_user_email) {
                // Comissão direta pelo referrer_user_email do parceiro
                const referrerUser = await base44.asServiceRole.entities.User.filter({ email: partnerRecord.referrer_user_email });
                if (referrerUser.length > 0) {
                  const commValue = (COMMISSION_VALUES['partner'] && COMMISSION_VALUES['partner'][plan]) || 0;
                  if (commValue > 0) {
                    const existingComms = await base44.asServiceRole.entities.AffiliateCommission.filter({
                      referred_email: email,
                      referrer_email: partnerRecord.referrer_user_email,
                    });
                    const alreadyPaid = existingComms.some(c => ['confirmada', 'transferida'].includes(c.status));
                    if (!alreadyPaid) {
                      await base44.asServiceRole.entities.AffiliateCommission.create({
                        referrer_email: partnerRecord.referrer_user_email,
                        referred_email: email,
                        referrer_name: referrerUser[0].full_name,
                        referred_name: partnerRecord.name,
                        user_type: 'parceiro',
                        plan_type: plan,
                        commission_value: commValue,
                        asaas_payment_id: asaas_payment_id,
                        status: 'pendente',
                      });
                      console.log('[CHECK_STATUS] Comissão parceiro criada para referrer: ' + partnerRecord.referrer_user_email);
                    }
                  }
                }
              }
            }
          }

          // Primeiro: tentar encontrar commission já existente neste pagamento
          let commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
            asaas_payment_id: asaas_payment_id,
            status: 'pendente',
          });
          
          // Se não encontrou, buscar o referral_code_used do usuário
          if (commissions.length === 0) {
            console.log('[CHECK_STATUS] Nenhuma comissao. Buscando referral_code_used do usuario: ' + email);
            const users = await base44.asServiceRole.entities.User.filter({ email: email });
            if (users.length > 0) {
              const userData = users[0];
              const referralCode = userData.referral_code_used;
              console.log('[CHECK_STATUS] referral_code_used encontrado: ' + referralCode);
              if (referralCode) {
                // Buscar o referrer com esse código
                const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
                const referrer = allUsers.find(u => u.referral_code === referralCode);
                console.log('[CHECK_STATUS] Referrer encontrado: ' + (referrer ? referrer.email : 'NÃO'));
                
                if (referrer) {
                  const COMMISSION_VALUES = {
                    'client':  { 'monthly': 10,  'annual': 10  },
                    'partner': { 'monthly': 100, 'annual': 200 },
                  };
                  const commissionValue = (COMMISSION_VALUES[planType] && COMMISSION_VALUES[planType][plan]) || 0;
                  if (commissionValue > 0) {
                            const existingComms = await base44.asServiceRole.entities.AffiliateCommission.filter({
                              referred_email: email,
                              referrer_email: referrer.email,
                            });
                            const alreadyPaid = existingComms.some(c => ['confirmada', 'transferida'].includes(c.status));
                    if (!alreadyPaid) {
                      const userType = planType === 'partner' ? 'parceiro' : 'cliente';
                      const newComm = await base44.asServiceRole.entities.AffiliateCommission.create({
                        referrer_email: referrer.email,
                        referred_email: email,
                        referrer_name: referrer.full_name,
                        referred_name: userData.full_name,
                        user_type: userType,
                        plan_type: plan,
                        commission_value: commissionValue,
                        asaas_payment_id: asaas_payment_id,
                        status: 'pendente',
                      });
                      console.log('[CHECK_STATUS] Comissao criada retroativamente: ' + newComm.id);
                      commissions = [newComm];
                    }
                  }
                }
              }
            }
          }
          
          // Confirmar todas as comissões
          for (const comm of commissions) {
            await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
              status: 'confirmada',
              payment_date: new Date().toISOString(),
            });
            const referrerList = await base44.asServiceRole.entities.User.filter({ email: comm.referrer_email });
            if (referrerList.length > 0) {
              const userData = referrerList[0].data || {};
              const currentTotal = userData.total_earned || 0;
              await base44.asServiceRole.entities.User.update(referrerList[0].id, {
                data: Object.assign({}, userData, { total_earned: currentTotal + comm.commission_value }),
              });
              await base44.asServiceRole.entities.UserNotification.create({
                title: 'Comissao confirmada!',
                message: 'Sua comissao de R$ ' + comm.commission_value.toFixed(2) + ' pela indicacao de ' + comm.referred_name + ' foi confirmada!',
                type: 'benefit',
                read: false,
                sent_at: new Date().toISOString(),
                created_by: comm.referrer_email,
              });
            }
          }
        }
      }

      const payments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id: asaas_payment_id });
      if (payments.length > 0) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: payment.status });
      }

      return Response.json({ status: payment.status, value: payment.value });
    }

    // GET MY PAYMENTS
    if (action === 'get_my_payments') {
      const payments = await base44.entities.Payment.filter({ user_email: user.email }, '-created_date', 20);
      return Response.json({ payments });
    }

    // ADMIN SYNC
    if (action === 'admin_sync_payments') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const pendingPayments = await base44.asServiceRole.entities.Payment.filter({ status: 'PENDING' }, '-created_date', 20);
      let synced = 0;

      for (const p of pendingPayments) {
        if (!p.asaas_payment_id) continue;
        // Pular pagamentos de ativação de carteira (não têm plano de assinatura)
        if (p.notes === 'wallet_activation' || p.plan === 'wallet_activation') continue;
        try {
          const asaasPayment = await asaasFetch('/payments/' + p.asaas_payment_id);
          if (asaasPayment.status !== p.status) {
            await base44.asServiceRole.entities.Payment.update(p.id, { status: asaasPayment.status });
            if ((asaasPayment.status === 'RECEIVED' || asaasPayment.status === 'CONFIRMED') && !p.subscription_activated) {
              const parts = (asaasPayment.externalReference || '').split('|');
              const email = parts[0];
              const plan  = parts[1];
              const planType = parts[2] || 'client';
              if (email && plan && plan !== 'wallet_activation') {
                await activateSubscription(base44, email, plan, planType, p.asaas_payment_id, asaasPayment.value);
              }
            }
            synced++;
          }
        } catch (err) {
          console.warn('Erro ao sincronizar pagamento ' + p.asaas_payment_id + ': ' + err.message);
        }
      }

      return Response.json({ success: true, synced, total: pendingPayments.length });
    }

    // EXPIRE SUBSCRIPTIONS
    if (action === 'expire_subscriptions') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const now = new Date();
      let expired = 0;

      const subTypes = ['premium_mensal', 'premium_anual', 'partner_monthly', 'partner_annual'];
      const allPaidUsers = [];
      for (const st of subTypes) {
        const batch = await base44.asServiceRole.entities.User.filter({ subscription_type: st }, '-created_date', 500);
        for (const u of batch) allPaidUsers.push(u);
      }

      for (const u of allPaidUsers) {
        let expiry;
        if (u.subscription_expires_at) {
          expiry = new Date(u.subscription_expires_at);
        } else if (u.subscription_date) {
          expiry = new Date(u.subscription_date);
          if (u.subscription_type === 'premium_anual' || u.subscription_type === 'partner_annual') {
            expiry.setFullYear(expiry.getFullYear() + 1);
          } else {
            expiry.setMonth(expiry.getMonth() + 1);
          }
        } else {
          continue;
        }

        if (now > expiry) {
          await base44.asServiceRole.entities.User.update(u.id, {
            subscription_type: null,
            subscription_date: null,
            subscription_expires_at: null,
          });
          await base44.asServiceRole.entities.UserNotification.create({
            title: 'Sua assinatura expirou',
            message: 'Sua assinatura Sou Brasil expirou. Renove para continuar aproveitando os beneficios!',
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

    // CREATE PUSH PAYMENT — cria cobrança no Asaas para notificações push
    if (action === 'create_push_payment') {
      const { quantity, total_price, partner_id, partner_name, radius_km } = body;
      const billing_type = body.billing_type || 'PIX';

      const docClean = (user.cpf || user.cnpj || '').replace(/\D/g, '');
      const customer = await findOrCreateCustomer(user, docClean);

      const charge = await asaasFetch('/payments', 'POST', {
        customer: customer.id,
        billingType: billing_type,
        value: total_price,
        dueDate: getDueDate(2),
        description: `Créditos Push Notification x${quantity} — ${partner_name}`,
        externalReference: `${user.email}|push_notification|partner|${partner_id}|${quantity}|${radius_km}|${Date.now()}`,
      });

      const paymentData = { asaas_payment_id: charge.id, asaas_customer_id: customer.id, asaas_invoice_url: charge.invoiceUrl || '', status: charge.status };
      if (billing_type === 'PIX') {
        try {
          const pixData = await asaasFetch('/payments/' + charge.id + '/pixQrCode');
          paymentData.pix_qr_code = pixData.encodedImage;
          paymentData.pix_copy_paste = pixData.payload;
        } catch (e) { console.warn('PIX push error: ' + e.message); }
      } else if (billing_type === 'BOLETO') {
        paymentData.boleto_url = charge.bankSlipUrl || '';
        paymentData.boleto_barcode = charge.nossoNumero || '';
      }

      // Registrar pedido como pendente_pagamento
      await base44.entities.PushNotificationOrder.create({
        partner_id,
        partner_name,
        quantity,
        unit_price: Math.round(total_price / quantity),
        total_price,
        radius_km: radius_km || 10,
        credits_remaining: 0,
        status: 'pendente_pagamento',
        asaas_payment_id: charge.id,
      });

      return Response.json({ success: true, payment: paymentData });
    }

    // CHECK PUSH PAYMENT — verifica e libera créditos de push
    if (action === 'check_push_payment') {
      const { asaas_payment_id, partner_id, partner_name, quantity, radius_km } = body;
      const payment = await asaasFetch('/payments/' + asaas_payment_id);

      if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
        // Verifica se já foi ativado
        const orders = await base44.asServiceRole.entities.PushNotificationOrder.filter({ asaas_payment_id });
        if (orders.length > 0 && orders[0].status === 'pago') {
          return Response.json({ credits_added: true, already_done: true });
        }

        // Busca pedido existente e atualiza OU soma a pedido ativo
        const existingPending = orders.find(o => o.status === 'pendente_pagamento');
        if (existingPending) {
          // Verifica se já tem pedido pago com créditos
          const paidOrders = await base44.asServiceRole.entities.PushNotificationOrder.filter({ partner_id, status: 'pago' });
          const activeOrder = paidOrders.find(o => (o.credits_remaining || 0) > 0);

          if (activeOrder) {
            // Soma créditos ao pedido ativo existente
            await base44.asServiceRole.entities.PushNotificationOrder.update(activeOrder.id, {
              credits_remaining: (activeOrder.credits_remaining || 0) + quantity,
            });
            await base44.asServiceRole.entities.PushNotificationOrder.update(existingPending.id, { status: 'pago', credits_remaining: 0 });
          } else {
            await base44.asServiceRole.entities.PushNotificationOrder.update(existingPending.id, { status: 'pago', credits_remaining: quantity });
          }
        } else {
          // Cria direto como pago
          await base44.asServiceRole.entities.PushNotificationOrder.create({
            partner_id, partner_name, quantity,
            unit_price: Math.round(payment.value / quantity),
            total_price: payment.value,
            radius_km: radius_km || 10,
            credits_remaining: quantity,
            status: 'pago',
            asaas_payment_id,
          });
        }
        return Response.json({ credits_added: true });
      }
      return Response.json({ credits_added: false, status: payment.status });
    }

    return Response.json({ error: 'Acao invalida' }, { status: 400 });

  } catch (error) {
    console.error('ASAAS Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});