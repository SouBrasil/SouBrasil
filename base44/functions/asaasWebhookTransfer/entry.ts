import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

// Processa confirmação de pagamento do webhook ASAAS
async function processPaymentConfirmation(base44, paymentData) {
  const { event, data: payment } = paymentData;
  
  // Busca comissões pendentes vinculadas a este pagamento
  const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
    asaas_payment_id: payment.id,
    status: 'pendente',
  });

  for (const comm of commissions) {
    // 1. Confirma a comissão
    await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
      status: 'confirmada',
      payment_date: new Date().toISOString(),
    });

    // 2. Busca wallet ID do referrer
    const referrers = await base44.asServiceRole.entities.User.filter({
      email: comm.referrer_email,
    });

    if (referrers.length > 0) {
      const referrer = referrers[0];
      
      // 3. Atualiza total_earned
      const newTotal = (referrer.total_earned || 0) + comm.commission_value;
      await base44.asServiceRole.entities.User.update(referrer.id, {
        total_earned: newTotal,
      });

      // 4. Se tem wallet, faz transferência automática via ASAAS
      if (referrer.asaas_wallet_id) {
        try {
          // Cria transfer para a wallet do referrer
          const transfer = await asaasFetch('/transfers', 'POST', {
            walletId: referrer.asaas_wallet_id,
            bankAccount: {
              bank: referrer.asaas_bank_code || '001', // Banco do Brasil por padrão
              accountNumber: referrer.asaas_account_number,
              accountCheckNumber: referrer.asaas_account_check,
              agencyNumber: referrer.asaas_agency,
              cpfCnpj: referrer.cpf ? referrer.cpf.replace(/\D/g, '') : null,
              name: referrer.full_name,
              type: 'CHECKING',
            },
            amount: comm.commission_value,
            description: `Comissão pela indicação de ${comm.referred_name}`,
            scheduleDate: new Date().toISOString().split('T')[0], // Hoje
          });

          // Registra a transferência
          await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
            asaas_transfer_id: transfer.id,
            status: 'transferida',
            transfer_date: new Date().toISOString(),
          });

          console.log(`✅ Transferência criada: R$${comm.commission_value} para ${comm.referrer_email}`);

          // Notifica usuário
          await base44.asServiceRole.entities.UserNotification.create({
            title: '💰 Comissão transferida!',
            message: `R$ ${comm.commission_value.toFixed(2)} foi transferida para sua conta. Chegará em até 2 dias úteis.`,
            type: 'benefit',
            read: false,
            sent_at: new Date().toISOString(),
            created_by: comm.referrer_email,
          });

        } catch (err) {
          console.warn(`⚠️ Erro ao transferir comissão para ${comm.referrer_email}:`, err.message);
          // Mantém status como "confirmada" para tentar novamente depois
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Valida token do webhook (set no header X-Webhook-Token)
    const webhookToken = req.headers.get('X-Webhook-Token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    
    if (webhookToken !== expectedToken) {
      console.warn('❌ Webhook token inválido');
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { event } = body;

    console.log(`📨 Webhook ASAAS recebido: ${event}`);

    // Processa confirmação de pagamento
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      await processPaymentConfirmation(base44, body);
      return Response.json({ success: true, processed: true });
    }

    // Ignora outros eventos
    return Response.json({ success: true, processed: false });

  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    // Retorna 200 mesmo com erro para não causar retry infinito
    return Response.json({ error: error.message, processed: false }, { status: 200 });
  }
});