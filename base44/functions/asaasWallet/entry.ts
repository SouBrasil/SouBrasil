import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data.errors?.[0]?.description) || data.message || JSON.stringify(data);
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── GET WALLET BALANCE ──────────────────────────────────────
    if (action === 'get_balance') {
      const walletId = user.asaas_wallet_id;
      if (!walletId || walletId.startsWith('ASAAS_')) {
        return Response.json({ success: true, balance: 0, no_wallet: true });
      }

      // Busca saldo da subconta usando o walletId como filtro de conta
      const data = await asaasFetch(`/finance/balance`);
      // O balance retornado é da conta principal — para subconta precisamos buscar via accounts
      const accountsRes = await asaasFetch(`/accounts?cpfCnpj=${body.cpf_cnpj || ''}`);
      
      // Alternativa: buscar pelo walletId na listagem de contas
      const allAccounts = await asaasFetch(`/accounts?limit=100`);
      const subAccount = allAccounts?.data?.find(a => a.walletId === walletId);
      
      if (subAccount) {
        // Busca saldo específico da subconta com seu próprio token seria ideal,
        // mas como não temos o token da subconta, buscamos via transferências
        const transfers = await asaasFetch(`/transfers?wallet=${walletId}&limit=100`);
        let balance = 0;
        if (transfers?.data) {
          for (const t of transfers.data) {
            if (t.type === 'CREDIT' && t.status === 'DONE') balance += t.value || 0;
            if (t.type === 'DEBIT' && t.status === 'DONE') balance -= t.value || 0;
          }
        }
        return Response.json({ success: true, balance, wallet_id: walletId });
      }

      // Fallback: busca o saldo somando splits recebidos
      const commissionsRes = await base44.entities.AffiliateCommission.filter(
        { referrer_email: user.email },
        '-created_date',
        500
      );
      const confirmedBalance = commissionsRes
        .filter(c => c.status === 'confirmada')
        .reduce((sum, c) => sum + (c.commission_value || 0), 0);
      const transferredOut = commissionsRes
        .filter(c => c.status === 'transferida')
        .reduce((sum, c) => sum + (c.commission_value || 0), 0);

      return Response.json({ 
        success: true, 
        balance: confirmedBalance - transferredOut,
        wallet_id: walletId,
        note: 'balance_from_commissions'
      });
    }

    // ── REQUEST WITHDRAWAL ──────────────────────────────────────
    if (action === 'request_withdrawal') {
      const walletId = user.asaas_wallet_id;
      if (!walletId || walletId.startsWith('ASAAS_')) {
        return Response.json({ error: 'Carteira Asaas não configurada' }, { status: 400 });
      }

      // Calcula saldo disponível (comissões confirmadas - já transferidas)
      const commissionsRes = await base44.entities.AffiliateCommission.filter(
        { referrer_email: user.email },
        '-created_date',
        500
      );
      const confirmedAmount = commissionsRes
        .filter(c => c.status === 'confirmada')
        .reduce((sum, c) => sum + (c.commission_value || 0), 0);

      if (confirmedAmount <= 0) {
        return Response.json({ 
          error: 'Sem saldo disponível para saque. Aguarde a confirmação das comissões pendentes.' 
        }, { status: 400 });
      }

      const pixKey = user.pix_key;
      if (!pixKey) {
        return Response.json({ error: 'Chave PIX não cadastrada. Configure na ativação da carteira.' }, { status: 400 });
      }

      // Executa transferência via Asaas
      const transferPayload = {
        value: confirmedAmount,
        bankAccount: {
          bank: { ispb: '' },
          accountName: user.full_name,
          ownerName: user.full_name,
          cpfCnpj: (user.cpf || '').replace(/\D/g, ''),
          pixAddressKey: pixKey,
          pixAddressKeyType: detectPixKeyType(pixKey),
        },
        description: `Saque de comissões Sou Brasil - ${user.email}`,
        externalReference: `SAQUE_${user.email}_${Date.now()}`,
      };

      let transferResult;
      try {
        transferResult = await asaasFetch('/transfers', 'POST', transferPayload);
      } catch (transferErr) {
        console.error('Erro na transferência Asaas:', transferErr.message);
        return Response.json({ 
          error: `Erro ao processar saque: ${transferErr.message}` 
        }, { status: 500 });
      }

      // Marca todas as comissões confirmadas como transferidas
      for (const comm of commissionsRes.filter(c => c.status === 'confirmada')) {
        await base44.entities.AffiliateCommission.update(comm.id, {
          status: 'transferida',
          asaas_transfer_id: transferResult.id,
          transfer_date: new Date().toISOString(),
        });
      }

      console.log(`✅ Saque de R$${confirmedAmount} processado para ${user.email}, transfer_id=${transferResult.id}`);
      return Response.json({ 
        success: true, 
        transfer_id: transferResult.id,
        amount: confirmedAmount,
        pix_key: pixKey,
        message: `Saque de R$${confirmedAmount.toFixed(2)} solicitado com sucesso!`
      });
    }

    return Response.json({ error: 'Ação inválida', available: ['get_balance', 'request_withdrawal'] }, { status: 400 });

  } catch (error) {
    console.error('AsaasWallet Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectPixKeyType(key) {
  const clean = key.replace(/\D/g, '');
  if (clean.length === 11) return 'CPF';
  if (clean.length === 14) return 'CNPJ';
  if (key.includes('@')) return 'EMAIL';
  if (/^\+?55?\d{10,11}$/.test(clean)) return 'PHONE';
  return 'EVP'; // Chave aleatória
}