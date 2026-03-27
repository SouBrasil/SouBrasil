import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    const msg = data.errors?.[0]?.description || data.message || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

function detectPixKeyType(key) {
  const clean = (key || '').replace(/\D/g, '');
  if (key && key.includes('@')) return 'EMAIL';
  if (clean.length === 11) return 'CPF';
  if (clean.length === 14) return 'CNPJ';
  if (clean.length === 10 || clean.length === 11) return 'PHONE';
  return 'EVP'; // Chave aleatória
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── GET WALLET BALANCE ──────────────────────────────────────────
    if (action === 'get_balance') {
      // Saldo calculado a partir das comissões confirmadas e transferidas no banco
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

      const availableBalance = Math.max(0, confirmedBalance - transferredOut);

      // Tenta buscar saldo real da subconta Asaas (se tiver walletId válido)
      const walletId = user.asaas_wallet_id;
      if (walletId && !walletId.startsWith('ASAAS_') && ASAAS_API_KEY) {
        try {
          // Busca a subconta pelo walletId para obter o accountNumber
          const accounts = await asaasFetch('/accounts?limit=100');
          const subAccount = accounts?.data?.find(a => a.walletId === walletId);
          if (subAccount) {
            return Response.json({
              success: true,
              balance: availableBalance,
              wallet_id: walletId,
              account_name: subAccount.name,
            });
          }
        } catch (e) {
          console.warn('Erro ao buscar conta Asaas (não crítico):', e.message);
        }
      }

      return Response.json({
        success: true,
        balance: availableBalance,
        wallet_id: walletId || null,
      });
    }

    // ── REQUEST WITHDRAWAL ──────────────────────────────────────────
    if (action === 'request_withdrawal') {
      const pixKey = body.pix_key || user.asaas_pix_key;
      if (!pixKey || !pixKey.trim()) {
        return Response.json({ error: 'Chave PIX não cadastrada. Configure no seu perfil.' }, { status: 400 });
      }

      if (!ASAAS_API_KEY) {
        return Response.json({ error: 'Integração ASAAS não configurada.' }, { status: 500 });
      }

      // Calcula saldo disponível (confirmadas - transferidas)
      const commissionsRes = await base44.entities.AffiliateCommission.filter(
        { referrer_email: user.email },
        '-created_date',
        500
      );
      const confirmedComms = commissionsRes.filter(c => c.status === 'confirmada');
      const confirmedAmount = confirmedComms.reduce((sum, c) => sum + (c.commission_value || 0), 0);

      if (confirmedAmount < 5) {
        return Response.json({
          error: `Saldo insuficiente. Mínimo para saque: R$ 5,00. Saldo atual: R$ ${confirmedAmount.toFixed(2)}`
        }, { status: 400 });
      }

      const cleanPixKey = pixKey.trim();
      const pixType = detectPixKeyType(cleanPixKey);

      console.log(`Iniciando saque: R$${confirmedAmount} para ${user.email} via PIX ${pixType}: ${cleanPixKey}`);

      // Payload correto para transferência PIX via Asaas
      const transferPayload = {
        value: confirmedAmount,
        bankAccount: {
          ownerName: user.full_name || user.email,
          cpfCnpj: (user.cpf || '').replace(/\D/g, '') || undefined,
          pixAddressKey: cleanPixKey,
          pixAddressKeyType: pixType,
        },
        description: `Saque de comissões Sou Brasil — ${user.email}`,
        externalReference: `SAQUE_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      };

      // Remove campos undefined
      Object.keys(transferPayload.bankAccount).forEach(k => {
        if (!transferPayload.bankAccount[k]) delete transferPayload.bankAccount[k];
      });

      let transferResult;
      try {
        transferResult = await asaasFetch('/transfers', 'POST', transferPayload);
      } catch (transferErr) {
        console.error('Erro na transferência Asaas:', transferErr.message);
        return Response.json({
          error: `Erro ao processar saque: ${transferErr.message}`
        }, { status: 500 });
      }

      console.log('Transferência criada:', transferResult.id, 'status:', transferResult.status);

      // Marca comissões confirmadas como transferidas
      for (const comm of confirmedComms) {
        await base44.entities.AffiliateCommission.update(comm.id, {
          status: 'transferida',
          asaas_transfer_id: transferResult.id,
          transfer_date: new Date().toISOString(),
        });
      }

      await base44.auth.updateMe({ asaas_pix_key: cleanPixKey });

      return Response.json({
        success: true,
        transfer_id: transferResult.id,
        transfer_status: transferResult.status,
        amount: confirmedAmount,
        pix_key: cleanPixKey,
        message: `Saque de R$ ${confirmedAmount.toFixed(2)} solicitado com sucesso! Prazo: até 2 dias úteis.`,
      });
    }

    // ── UPDATE PIX KEY ──────────────────────────────────────────────
    if (action === 'update_pix_key') {
      const { pix_key } = body;
      if (!pix_key || !pix_key.trim()) {
        return Response.json({ error: 'Chave PIX inválida' }, { status: 400 });
      }
      const cleanKey = pix_key.trim();
      await base44.auth.updateMe({ asaas_pix_key: cleanKey });
      console.log('Chave PIX atualizada para:', user.email, '->', cleanKey);
      return Response.json({ success: true, pix_key: cleanKey, message: 'Chave PIX atualizada com sucesso!' });
    }

    return Response.json({ error: 'Ação inválida. Use: get_balance, request_withdrawal, update_pix_key' }, { status: 400 });

  } catch (error) {
    console.error('AsaasWallet Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});