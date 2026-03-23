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
    throw new Error(errMsg);
  }
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const log = [];

    // ── Corrigir wallet real da Nivia ──────────────────────────
    if (action === 'fix_nivia_wallet') {
      const REAL_WALLET_ID = '0ea276dc-f71d-4b84-93e5-2da8bfb1e80c';
      
      const users = await base44.asServiceRole.entities.User.filter({ email: 'niviasibele@gmail.com' });
      if (users.length === 0) return Response.json({ error: 'Nivia nao encontrada' }, { status: 404 });
      
      const nivia = users[0];
      log.push({ step: 'Nivia encontrada', atual_wallet: nivia.asaas_wallet_id });
      
      await base44.asServiceRole.entities.User.update(nivia.id, {
        asaas_wallet_id: REAL_WALLET_ID
      });
      log.push({ step: 'Wallet atualizado', novo_wallet: REAL_WALLET_ID });

      // Verificar subconta real no Asaas
      const accounts = await asaasFetch(`/accounts?cpfCnpj=06669485697`);
      log.push({ step: 'Contas Asaas encontradas', total: accounts.totalCount, wallets: (accounts.data || []).map(a => ({ id: a.id, walletId: a.walletId, name: a.name })) });

      return Response.json({ success: true, log });
    }

    // ── Simular pagamento parceiro -> verificar split ──────────
    if (action === 'test_partner_payment') {
      const { plan = 'monthly', referrer_email = 'niviasibele@gmail.com', partner_cnpj = '41802535000163' } = body;
      
      const COMMISSION_VALUES = {
        client:  { monthly: 10,  annual: 10  },
        partner: { monthly: 100, annual: 200 },
      };
      const PARTNER_PLAN_PRICES = { monthly: 299.90, annual: 2500.00 };
      const PARTNER_PLAN_LABELS = {
        monthly: 'Plano Parceiro Mensal — Sou Brasil (TESTE)',
        annual:  'Plano Parceiro Anual — Sou Brasil (TESTE)',
      };

      // Buscar referrer (Nivia)
      const referrers = await base44.asServiceRole.entities.User.filter({ email: referrer_email });
      if (referrers.length === 0) return Response.json({ error: 'Referrer nao encontrado' }, { status: 404 });
      const referrer = referrers[0];
      log.push({ step: 'Referrer encontrado', email: referrer.email, wallet_id: referrer.asaas_wallet_id, referral_code: referrer.referral_code });

      // Verificar wallet
      if (!referrer.asaas_wallet_id || referrer.asaas_wallet_id.startsWith('ASAAS_')) {
        log.push({ step: 'ERRO: Wallet fictício detectado!', wallet: referrer.asaas_wallet_id });
        return Response.json({ success: false, error: 'Wallet ficticio', log });
      }
      log.push({ step: 'Wallet OK - real UUID', wallet: referrer.asaas_wallet_id });

      // Buscar/criar cliente Asaas para o Cafézin Mineiro
      const byDoc = await asaasFetch(`/customers?cpfCnpj=${partner_cnpj}`);
      let customer;
      if (byDoc.data && byDoc.data.length > 0) {
        customer = byDoc.data[0];
        log.push({ step: 'Cliente Asaas encontrado', id: customer.id, name: customer.name });
      } else {
        customer = await asaasFetch('/customers', 'POST', {
          name: 'Cafézin Mineiro TESTE',
          email: 'mineirinhoexpress@gmail.com',
          cpfCnpj: partner_cnpj,
        });
        log.push({ step: 'Cliente Asaas criado', id: customer.id });
      }

      // Calcular split
      const commissionValue = COMMISSION_VALUES['partner'][plan];
      const splitPayload = {
        walletId: referrer.asaas_wallet_id,
        fixedValue: commissionValue,
      };
      log.push({ step: 'Split configurado', walletId: splitPayload.walletId, comissao: commissionValue });

      // Criar assinatura com split
      const due = new Date();
      due.setDate(due.getDate() + 1);
      const dueDate = due.toISOString().split('T')[0];

      const subscriptionPayload = {
        customer: customer.id,
        billingType: 'PIX',
        value: PARTNER_PLAN_PRICES[plan],
        nextDueDate: dueDate,
        cycle: plan === 'annual' ? 'YEARLY' : 'MONTHLY',
        description: PARTNER_PLAN_LABELS[plan],
        externalReference: `mineirinhoexpress@gmail.com|${plan}|partner|${referrer_email}`,
        split: [splitPayload],
      };

      log.push({ step: 'Criando assinatura Asaas', payload: subscriptionPayload });
      const subscription = await asaasFetch('/subscriptions', 'POST', subscriptionPayload);
      log.push({ step: 'Assinatura criada', id: subscription.id, status: subscription.status });

      // Buscar primeira cobrança
      const paymentsRes = await asaasFetch(`/payments?subscription=${subscription.id}&limit=1`);
      const firstPayment = paymentsRes.data && paymentsRes.data.length > 0 ? paymentsRes.data[0] : null;
      log.push({ step: 'Primeira cobrança', payment_id: firstPayment?.id, status: firstPayment?.status, split: firstPayment?.split });

      // Buscar QR Code PIX
      let pixData = null;
      if (firstPayment?.id) {
        try {
          pixData = await asaasFetch(`/payments/${firstPayment.id}/pixQrCode`);
          log.push({ step: 'QR Code PIX gerado', payload_length: pixData?.payload?.length });
        } catch (e) {
          log.push({ step: 'AVISO: Erro ao gerar QR PIX', error: e.message });
        }
      }

      // Salvar Payment no banco
      const paymentRecord = {
        user_email: 'mineirinhoexpress@gmail.com',
        user_name: 'Cafézin Mineiro',
        plan: plan,
        amount: PARTNER_PLAN_PRICES[plan],
        billing_type: 'PIX',
        referral_code: referrer.referral_code || '',
        due_date: dueDate,
        notes: 'partner|TESTE',
        asaas_payment_id: firstPayment?.id || subscription.id,
        asaas_customer_id: customer.id,
        asaas_invoice_url: firstPayment?.invoiceUrl || '',
        status: firstPayment?.status || 'PENDING',
        pix_qr_code: pixData?.encodedImage || '',
        pix_copy_paste: pixData?.payload || '',
      };
      const savedPayment = await base44.asServiceRole.entities.Payment.create(paymentRecord);
      log.push({ step: 'Payment salvo no banco', id: savedPayment.id });

      // Salvar comissão pendente
      const existingCommissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
        referred_email: 'mineirinhoexpress@gmail.com',
        referrer_email: referrer_email,
      });
      if (existingCommissions.length === 0) {
        await base44.asServiceRole.entities.AffiliateCommission.create({
          referrer_email: referrer.email,
          referred_email: 'mineirinhoexpress@gmail.com',
          referrer_name: referrer.full_name,
          referred_name: 'Cafézin Mineiro',
          user_type: 'parceiro',
          plan_type: plan,
          commission_value: commissionValue,
          asaas_payment_id: firstPayment?.id || subscription.id,
          status: 'pendente',
        });
        log.push({ step: 'Comissao pendente criada', valor: commissionValue, para: referrer.email });
      } else {
        log.push({ step: 'Comissao ja existia', existentes: existingCommissions.length });
      }

      return Response.json({
        success: true,
        subscription_id: subscription.id,
        payment_id: firstPayment?.id,
        pix_copy_paste: pixData?.payload,
        commission_value: commissionValue,
        referrer_wallet: referrer.asaas_wallet_id,
        log,
      });
    }

    // ── Verificar status de pagamento e ativar comissão ────────
    if (action === 'check_and_activate') {
      const { asaas_payment_id } = body;
      if (!asaas_payment_id) return Response.json({ error: 'asaas_payment_id obrigatorio' }, { status: 400 });
      
      const payment = await asaasFetch(`/payments/${asaas_payment_id}`);
      log.push({ step: 'Status Asaas', status: payment.status, value: payment.value, split: payment.split });
      
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({ asaas_payment_id });
      log.push({ step: 'Comissoes no banco', total: commissions.length, statuses: commissions.map(c => c.status) });

      return Response.json({ payment_status: payment.status, log });
    }

    return Response.json({ error: 'Acao invalida. Use: fix_nivia_wallet | test_partner_payment | check_and_activate' }, { status: 400 });

  } catch (error) {
    console.error('AdminTestPayment Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});