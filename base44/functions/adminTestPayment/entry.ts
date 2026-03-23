import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path, method, body) {
  if (!method) method = 'GET';
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = (data.errors && data.errors[0] && data.errors[0].description) || data.message || JSON.stringify(data);
    const err = new Error(errMsg);
    err.statusCode = res.status;
    err.asaasData = data;
    throw err;
  }
  return data;
}

async function asaasFetchSafe(path, method, body) {
  try {
    return { data: await asaasFetch(path, method, body), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

async function findOrCreateAsaasCustomer(name, email, cpfCnpj) {
  const doc = cpfCnpj.replace(/\D/g, '');
  const byDoc = await asaasFetch(`/customers?cpfCnpj=${doc}`);
  if (byDoc.data && byDoc.data.length > 0) return byDoc.data[0];
  const byEmail = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (byEmail.data && byEmail.data.length > 0) return byEmail.data[0];
  return asaasFetch('/customers', 'POST', { name, email, cpfCnpj: doc });
}

async function createAsaasSubAccount(name, email, cpfCnpj) {
  const doc = (cpfCnpj || '').replace(/\D/g, '');
  const isCompany = doc.length === 14;

  const payload = {
    name,
    email,
    cpfCnpj: doc,
    birthDate: isCompany ? undefined : '1990-01-15',
    companyType: isCompany ? 'MEI' : undefined,
    incomeValue: isCompany ? 5000 : 3000,
    address: 'Rua Teste',
    addressNumber: '123',
    complement: 'Sala 1',
    province: 'Centro',
    postalCode: '01310100',
    city: 'Sao Paulo',
    state: 'SP',
    country: 'BR',
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  // Tentar criar subconta
  console.log('[sub] Tentando criar subconta para doc:', doc, 'isCompany:', isCompany);
  const { data: account, error: createErr } = await asaasFetchSafe('/accounts', 'POST', payload);
  console.log('[sub] POST resultado:', account ? `walletId=${account.walletId}` : `err=${createErr?.message}`);

  if (account && account.walletId) {
    return { walletId: account.walletId, isNew: true };
  }

  // Falhou — buscar subconta existente pelo doc
  const { data: list } = await asaasFetchSafe(`/accounts?cpfCnpj=${doc}`);
  console.log('[sub] Busca existente:', JSON.stringify(list).slice(0, 200));
  if (list && list.data && list.data.length > 0) {
    return { walletId: list.data[0].walletId, isNew: false };
  }

  // Não encontrou de jeito nenhum
  throw createErr || new Error('Nao foi possivel criar ou localizar subconta Asaas para doc=' + doc);
}

function getDueDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + (days || 1));
  return d.toISOString().split('T')[0];
}

async function simulatePayment(base44, log, {
  payerName, payerEmail, payerDoc,
  referrerEmail, planType, plan,
  userIdToActivate
}) {
  const PLAN_PRICES = {
    client:  { monthly: 19.90,  annual: 179.88 },
    partner: { monthly: 299.90, annual: 2500.00 },
  };
  const COMMISSION = {
    client:  { monthly: 10,  annual: 10  },
    partner: { monthly: 100, annual: 200 },
  };

  const amount = PLAN_PRICES[planType][plan];
  const commissionValue = COMMISSION[planType][plan];

  // 1. Buscar referrer e wallet
  let referrer = null;
  let splitPayload = null;
  if (referrerEmail) {
    const referrers = await base44.asServiceRole.entities.User.filter({ email: referrerEmail });
    if (referrers.length > 0) {
      referrer = referrers[0];
      log.push({ step: 'Referrer encontrado', email: referrer.email, wallet: referrer.asaas_wallet_id });
      if (referrer.asaas_wallet_id && !referrer.asaas_wallet_id.startsWith('ASAAS_')) {
        splitPayload = { walletId: referrer.asaas_wallet_id, fixedValue: commissionValue };
        log.push({ step: 'Split configurado', walletId: referrer.asaas_wallet_id, comissao: commissionValue, saldo_soubrasil: amount - commissionValue });
      } else {
        log.push({ step: 'AVISO: Referrer sem wallet real, sem split', wallet: referrer.asaas_wallet_id });
      }
    } else {
      log.push({ step: 'AVISO: Referrer nao encontrado', email: referrerEmail });
    }
  }

  // 2. Criar cliente Asaas
  const customer = await findOrCreateAsaasCustomer(payerName, payerEmail, payerDoc);
  log.push({ step: 'Cliente Asaas', id: customer.id, name: customer.name });

  // 3. Criar assinatura com split (se houver)
  const subscriptionPayload = {
    customer: customer.id,
    billingType: 'PIX',
    value: amount,
    nextDueDate: getDueDate(1),
    cycle: plan === 'annual' ? 'YEARLY' : 'MONTHLY',
    description: `Plano ${planType === 'partner' ? 'Parceiro' : 'Cliente'} ${plan} — Sou Brasil (TESTE)`,
    externalReference: `${payerEmail}|${plan}|${planType}|${referrerEmail || ''}`,
  };
  if (splitPayload) subscriptionPayload.split = [splitPayload];

  const subscription = await asaasFetch('/subscriptions', 'POST', subscriptionPayload);
  log.push({ step: 'Assinatura criada', id: subscription.id });

  // 4. Buscar primeira cobrança e QR Code PIX
  const paymentsRes = await asaasFetch(`/payments?subscription=${subscription.id}&limit=1`);
  const firstPayment = paymentsRes.data && paymentsRes.data.length > 0 ? paymentsRes.data[0] : null;
  log.push({ step: 'Primeira cobrança', payment_id: firstPayment?.id, status: firstPayment?.status, split: firstPayment?.split });

  let pixData = null;
  if (firstPayment?.id) {
    try {
      pixData = await asaasFetch(`/payments/${firstPayment.id}/pixQrCode`);
      log.push({ step: 'QR Code PIX gerado', ok: true });
    } catch (e) {
      log.push({ step: 'AVISO QR PIX', error: e.message });
    }
  }

  // 5. Salvar Payment no banco
  const paymentId = firstPayment?.id || subscription.id;
  await base44.asServiceRole.entities.Payment.create({
    user_email: payerEmail,
    user_name: payerName,
    plan,
    amount,
    billing_type: 'PIX',
    referral_code: referrer?.referral_code || '',
    due_date: getDueDate(1),
    notes: `${planType}|TESTE`,
    asaas_payment_id: paymentId,
    asaas_customer_id: customer.id,
    asaas_invoice_url: firstPayment?.invoiceUrl || '',
    status: firstPayment?.status || 'PENDING',
    pix_qr_code: pixData?.encodedImage || '',
    pix_copy_paste: pixData?.payload || '',
  });
  log.push({ step: 'Payment salvo no banco', payment_id: paymentId });

  // 6. Criar comissão pendente
  if (referrer && commissionValue > 0) {
    const existing = await base44.asServiceRole.entities.AffiliateCommission.filter({
      referred_email: payerEmail,
      referrer_email: referrerEmail,
    });
    if (existing.length === 0) {
      await base44.asServiceRole.entities.AffiliateCommission.create({
        referrer_email: referrer.email,
        referred_email: payerEmail,
        referrer_name: referrer.full_name,
        referred_name: payerName,
        user_type: planType === 'partner' ? 'parceiro' : 'cliente',
        plan_type: plan,
        commission_value: commissionValue,
        asaas_payment_id: paymentId,
        status: 'pendente',
      });
      log.push({ step: 'Comissão pendente criada', valor: commissionValue, para: referrer.email });
    } else {
      log.push({ step: 'Comissão já existia' });
    }
  }

  return { subscription_id: subscription.id, payment_id: paymentId, pix_copy_paste: pixData?.payload };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const log = [];

    // ─────────────────────────────────────────────────────────────
    // TESTE 1: Cafézin Mineiro compra plano via indicação da Nívia
    // ─────────────────────────────────────────────────────────────
    if (action === 'test1_cafezin_buys_via_nivia') {
      log.push({ step: '=== TESTE 1: Cafézin Mineiro compra plano indicado pela Nívia ===' });

      const nivia = (await base44.asServiceRole.entities.User.filter({ email: 'niviasibele@gmail.com' }))[0];
      if (!nivia) return Response.json({ error: 'Nivia nao encontrada' }, { status: 404 });
      log.push({ step: 'Nívia confirmada', wallet: nivia.asaas_wallet_id, referral_code: nivia.referral_code });

      const result = await simulatePayment(base44, log, {
        payerName: 'Cafézin Mineiro',
        payerEmail: 'mineirinhoexpress@gmail.com',
        payerDoc: '41802535000163',
        referrerEmail: 'niviasibele@gmail.com',
        planType: 'partner',
        plan: body.plan || 'monthly',
      });

      log.push({ step: '✅ TESTE 1 CONCLUÍDO', ...result });
      return Response.json({ success: true, test: 'test1', log, ...result });
    }

    // ─────────────────────────────────────────────────────────────
    // TESTE 2A: Criar usuário fictício e ativar wallet Asaas
    // ─────────────────────────────────────────────────────────────
    if (action === 'test2a_setup_fictitious_user_wallet') {
      log.push({ step: '=== TESTE 2A: Configurando usuário fictício com wallet Asaas ===' });

      const fictitiousEmail = 'usuario.ficticio.teste@soubrasil.com.br';
      const fictitiousCpf = '662.827.790-90'; // CPF fake válido para testes

      // Criar subconta Asaas para o usuário fictício
      const { walletId, isNew } = await createAsaasSubAccount(
        'Usuário Fictício Teste', fictitiousEmail, fictitiousCpf);
      log.push({ step: `Subconta Asaas ${isNew ? 'criada' : 'já existia'}`, walletId });

      // Gerar referral code
      const refCode = 'FICTICIO' + Date.now().toString(36).toUpperCase();

      // Salvar no User fictício
      const fictitiousUsers = await base44.asServiceRole.entities.User.filter({ email: fictitiousEmail });
      if (fictitiousUsers.length > 0) {
        await base44.asServiceRole.entities.User.update(fictitiousUsers[0].id, {
          asaas_wallet_id: walletId,
          referral_code: refCode,
        });
        log.push({ step: 'User fictício atualizado', wallet: walletId, referral_code: refCode });
      } else {
        log.push({ step: 'AVISO: User fictício não existe no banco (criar via convite primeiro)', email: fictitiousEmail });
      }

      const appUrl = 'https://app.soubrasil.com.br';
      const clientLink = `${appUrl}/OnboardingRegister?ref=${refCode}`;
      const partnerLink = `${appUrl}/PartnerSignup?ref=${refCode}&type=partner`;

      return Response.json({ success: true, test: 'test2a', walletId, refCode, clientLink, partnerLink, log });
    }

    // ─────────────────────────────────────────────────────────────
    // TESTE 2B: Cliente fictício compra via link do usuário fictício
    // ─────────────────────────────────────────────────────────────
    if (action === 'test2b_fictitious_client_buys') {
      log.push({ step: '=== TESTE 2B: Cliente fictício compra via link do usuário fictício ===' });

      const referrerEmail = body.referrer_email || 'usuario.ficticio.teste@soubrasil.com.br';

      const result = await simulatePayment(base44, log, {
        payerName: 'Cliente Fictício Silva',
        payerEmail: 'cliente.ficticio.silva@teste.com.br',
        payerDoc: '322.742.900-40', // CPF fake válido para testes
        referrerEmail,
        planType: 'client',
        plan: body.plan || 'monthly',
      });

      log.push({ step: '✅ TESTE 2B CONCLUÍDO', ...result });
      return Response.json({ success: true, test: 'test2b', log, ...result });
    }

    // ─────────────────────────────────────────────────────────────
    // TESTE 2C: Parceiro fictício compra via link do usuário fictício
    // ─────────────────────────────────────────────────────────────
    if (action === 'test2c_fictitious_partner_buys') {
      log.push({ step: '=== TESTE 2C: Parceiro fictício compra via link do usuário fictício ===' });

      const referrerEmail = body.referrer_email || 'usuario.ficticio.teste@soubrasil.com.br';

      const result = await simulatePayment(base44, log, {
        payerName: 'Padaria Fictícia Teste',
        payerEmail: 'padaria.ficticia@teste.com.br',
        payerDoc: '78.069.656/0001-58', // CNPJ fake válido para testes
        referrerEmail,
        planType: 'partner',
        plan: body.plan || 'monthly',
      });

      log.push({ step: '✅ TESTE 2C CONCLUÍDO', ...result });
      return Response.json({ success: true, test: 'test2c', log, ...result });
    }

    // ─────────────────────────────────────────────────────────────
    // TESTE 3: Novo usuário compra via link do Cafézin Mineiro
    // ─────────────────────────────────────────────────────────────
    if (action === 'test3_new_user_via_cafezin_link') {
      log.push({ step: '=== TESTE 3: Novo usuário compra via link do Cafézin Mineiro ===' });

      // Primeiro: garantir que Cafézin tem wallet Asaas para receber comissão
      const cafezinUser = (await base44.asServiceRole.entities.User.filter({ email: 'mineirinhoexpress@gmail.com' }))[0];
      log.push({ step: 'Cafézin User', wallet: cafezinUser?.asaas_wallet_id, referral_code: cafezinUser?.referral_code });

      if (!cafezinUser?.asaas_wallet_id) {
        // Criar subconta para o Cafézin (CNPJ de teste válido para Sandbox Asaas)
        const { walletId, isNew } = await createAsaasSubAccount(
          'Cafézin Mineiro', 'mineirinhoexpress@gmail.com', '51.326.091/0001-90'); // CNPJ fake válido para testes
        const refCode = cafezinUser?.referral_code || ('CAFEZIN' + Date.now().toString(36).toUpperCase());
        await base44.asServiceRole.entities.User.update(cafezinUser.id, {
          asaas_wallet_id: walletId,
          referral_code: refCode,
        });
        log.push({ step: `Subconta Asaas ${isNew ? 'criada' : 'vinculada'} para Cafézin`, walletId, refCode });
      }

      // Recarregar usuário Cafézin após possível atualização
      const cafezinUpdated = (await base44.asServiceRole.entities.User.filter({ email: 'mineirinhoexpress@gmail.com' }))[0];
      log.push({ step: 'Cafézin após setup', wallet: cafezinUpdated?.asaas_wallet_id });

      // Simular compra do novo usuário via link do Cafézin
      const result = await simulatePayment(base44, log, {
        payerName: 'Novo Usuário Via Cafézin',
        payerEmail: 'novo.usuario.cafezin@teste.com.br',
        payerDoc: '724.840.520-57', // CPF fake válido para testes
        referrerEmail: 'mineirinhoexpress@gmail.com',
        planType: 'client',
        plan: body.plan || 'monthly',
      });

      log.push({ step: '✅ TESTE 3 CONCLUÍDO', ...result });
      return Response.json({ success: true, test: 'test3', log, ...result });
    }

    // ─────────────────────────────────────────────────────────────
    // VERIFICAR STATUS: checar pagamento e comissões
    // ─────────────────────────────────────────────────────────────
    if (action === 'check_payment_status') {
      const { asaas_payment_id } = body;
      if (!asaas_payment_id) return Response.json({ error: 'asaas_payment_id obrigatorio' }, { status: 400 });

      const payment = await asaasFetch(`/payments/${asaas_payment_id}`);
      log.push({ step: 'Status no Asaas', status: payment.status, value: payment.value, split: payment.split, externalRef: payment.externalReference });

      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({ asaas_payment_id });
      log.push({ step: 'Comissões no banco', total: commissions.length, detalhes: commissions.map(c => ({ referrer: c.referrer_email, valor: c.commission_value, status: c.status })) });

      const dbPayments = await base44.asServiceRole.entities.Payment.filter({ asaas_payment_id });
      log.push({ step: 'Payment no banco', total: dbPayments.length, status: dbPayments[0]?.status, activated: dbPayments[0]?.subscription_activated });

      return Response.json({ payment_status: payment.status, payment_value: payment.value, split_configured: payment.split, commissions, log });
    }

    // ─────────────────────────────────────────────────────────────
    // RESUMO GERAL: listar todas as comissões e pagamentos de teste
    // ─────────────────────────────────────────────────────────────
    if (action === 'get_test_summary') {
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.list('-created_date', 20);
      const payments = await base44.asServiceRole.entities.Payment.filter({ notes: { $regex: 'TESTE' } }, '-created_date', 20);

      const summary = {
        total_commissions: commissions.length,
        commission_breakdown: commissions.map(c => ({
          referrer: c.referrer_email,
          referred: c.referred_email,
          type: c.user_type,
          plan: c.plan_type,
          value: c.commission_value,
          status: c.status,
          payment_id: c.asaas_payment_id,
        })),
        test_payments: payments.map(p => ({
          user: p.user_email,
          plan: p.plan,
          amount: p.amount,
          status: p.status,
          payment_id: p.asaas_payment_id,
          activated: p.subscription_activated,
        })),
      };

      return Response.json({ success: true, summary });
    }

    // ─────────────────────────────────────────────────────────────
    // CORRIGIR WALLET: ação legada mantida
    // ─────────────────────────────────────────────────────────────
    if (action === 'fix_nivia_wallet') {
      const REAL_WALLET_ID = '0ea276dc-f71d-4b84-93e5-2da8bfb1e80c';
      const users = await base44.asServiceRole.entities.User.filter({ email: 'niviasibele@gmail.com' });
      if (users.length === 0) return Response.json({ error: 'Nivia nao encontrada' }, { status: 404 });
      await base44.asServiceRole.entities.User.update(users[0].id, { asaas_wallet_id: REAL_WALLET_ID });
      return Response.json({ success: true, wallet: REAL_WALLET_ID });
    }

    return Response.json({
      error: 'Acao invalida',
      available_actions: [
        'test1_cafezin_buys_via_nivia',
        'test2a_setup_fictitious_user_wallet',
        'test2b_fictitious_client_buys',
        'test2c_fictitious_partner_buys',
        'test3_new_user_via_cafezin_link',
        'check_payment_status',
        'get_test_summary',
        'fix_nivia_wallet',
      ]
    }, { status: 400 });

  } catch (error) {
    console.error('AdminTestPayment Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});