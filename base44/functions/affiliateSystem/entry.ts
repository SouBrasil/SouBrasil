import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

function asaasHeaders(walletId = null) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY,
  };
  if (walletId) headers['asaas-wallet-id'] = walletId;
  return headers;
}

async function asaasFetch(path, method = 'GET', body = null, walletId = null) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: asaasHeaders(walletId),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.description || JSON.stringify(data));
  return data;
}

// Comissões por tipo e plano
const COMMISSION_VALUES = {
  cliente: { monthly: 10, annual: 10 },
  parceiro: { monthly: 100, annual: 200 },
};

// Gera código referral único
function generateReferralCode(email) {
  const part1 = email.split('@')[0].slice(0, 4).toUpperCase();
  const part2 = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${part1}${part2}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────
    // GENERATE REFERRAL CODE
    // ──────────────────────────────────────────────────
    if (action === 'generate_referral_code') {
      const code = generateReferralCode(user.email);
      await base44.auth.updateMe({ referral_code: code });
      return Response.json({ referral_code: code });
    }

    // ──────────────────────────────────────────────────
    // SETUP ASAAS WALLET
    // ──────────────────────────────────────────────────
    if (action === 'setup_asaas_wallet') {
      const { cpf, pix_key } = body;
      if (!cpf || !pix_key) {
        return Response.json({ error: 'CPF e Chave PIX obrigatórios' }, { status: 400 });
      }

      // Monta payload da subconta
      const accountPayload = {
        name: user.full_name || user.email,
        email: user.email,
        loginEmail: user.email,
        cpfCnpj: cpf.replace(/\D/g, ''),
        phone: user.phone ? user.phone.replace(/\D/g, '') : '',
        address: user.address || user.street || 'Não informado',
        addressNumber: user.number || '0',
        complement: '',
        city: user.city || 'São Paulo',
        state: user.state || 'SP',
        postalCode: (user.cep || '').replace(/\D/g, '') || '01310100',
      };

      // Asaas exige birthDate para pessoa física
      if (user.birth_date) {
        // Garante formato YYYY-MM-DD
        accountPayload.birthDate = user.birth_date.slice(0, 10);
      }

      // Cria subconta no Asaas
      const wallet = await asaasFetch('/accounts', 'POST', accountPayload);

      // Salva wallet ID no perfil
      await base44.auth.updateMe({
        asaas_wallet_id: wallet.id,
        asaas_pix_key: pix_key,
      });

      return Response.json({ success: true, wallet_id: wallet.id });
    }

    // ──────────────────────────────────────────────────
    // GET WALLET BALANCE
    // ──────────────────────────────────────────────────
    if (action === 'get_wallet_balance') {
      if (!user.asaas_wallet_id) {
        return Response.json({ error: 'Wallet não configurada' }, { status: 400 });
      }

      const balance = await asaasFetch('/finance/balance', 'GET', null, user.asaas_wallet_id);
      return Response.json(balance);
    }

    // ──────────────────────────────────────────────────
    // PROCESS COMMISSION (chamado pelo webhook)
    // ──────────────────────────────────────────────────
    if (action === 'process_commission') {
      const { referred_email, referred_name, user_type, plan_type, asaas_payment_id, commission_value } = body;

      if (!user.asaas_wallet_id) {
        return Response.json({ error: 'Afiliado não tem wallet configurada' }, { status: 400 });
      }

      // Registra comissão
      const commission = await base44.asServiceRole.entities.AffiliateCommission.create({
        referrer_email: user.email,
        referred_email,
        referrer_name: user.full_name,
        referred_name,
        user_type,
        plan_type,
        commission_value,
        asaas_payment_id,
        status: 'confirmada',
        payment_date: new Date().toISOString(),
      });

      // Atualiza total_earned do usuário
      const currentTotal = user.total_earned || 0;
      await base44.auth.updateMe({
        total_earned: currentTotal + commission_value,
      });

      // Notifica afiliado
      await base44.asServiceRole.entities.UserNotification.create({
        title: '💰 Nova comissão recebida!',
        message: `Parabéns! Você recebeu R$ ${commission_value.toFixed(2)} pela indicação de ${referred_name}. O valor está disponível na sua carteira Asaas.`,
        type: 'benefit',
        read: false,
        sent_at: new Date().toISOString(),
        created_by: user.email,
      });

      return Response.json({ success: true, commission_id: commission.id });
    }

    // ──────────────────────────────────────────────────
    // TRANSFER WALLET TO BANK
    // ──────────────────────────────────────────────────
    if (action === 'transfer_to_bank') {
      if (!user.asaas_wallet_id || !user.asaas_pix_key) {
        return Response.json({ error: 'Wallet ou PIX não configurada' }, { status: 400 });
      }

      const { amount } = body;
      if (!amount || amount <= 0) {
        return Response.json({ error: 'Valor inválido' }, { status: 400 });
      }

      // Faz transferência via PIX na API do Asaas
      const transfer = await asaasFetch('/transfers', 'POST', {
        value: amount,
        pixAddressKey: user.asaas_pix_key,
      }, user.asaas_wallet_id);

      return Response.json({ success: true, transfer_id: transfer.id });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Affiliate Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});