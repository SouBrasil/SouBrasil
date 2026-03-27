import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Webhook para transferências de comissão do Asaas.
 * Processa eventos de TRANSFER_DONE para marcar comissões como "transferida".
 * NÃO faz transferência automática — isso é feito sob demanda pelo asaasWallet.
 */
Deno.serve(async (req) => {
  try {
    // ── Validação do token ──
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (expectedToken) {
      const headerToken = req.headers.get('asaas-access-token');
      const url = new URL(req.url);
      const queryToken = url.searchParams.get('token');
      if (headerToken !== expectedToken && queryToken !== expectedToken) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const event = await req.json();
    const { event: eventType, transfer } = event;

    console.log('TransferWebhook recebido:', eventType, transfer?.id);

    if (!transfer) return Response.json({ received: true });

    // ── Transferência concluída ──
    if (eventType === 'TRANSFER_DONE' && transfer.id) {
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
        asaas_transfer_id: transfer.id,
      });
      for (const comm of commissions) {
        if (comm.status !== 'transferida') {
          await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
            status: 'transferida',
            transfer_date: new Date().toISOString(),
          });
          await base44.asServiceRole.entities.UserNotification.create({
            title: '💸 Comissão transferida!',
            message: `R$ ${(comm.commission_value || 0).toFixed(2)} enviado via PIX para sua conta. Prazo: até 2 dias úteis.`,
            type: 'benefit', read: false,
            sent_at: new Date().toISOString(),
            created_by: comm.referrer_email,
          });
          console.log('Comissão marcada como transferida:', comm.id, 'transfer:', transfer.id);
        }
      }
    }

    // ── Transferência falhou ──
    if (eventType === 'TRANSFER_FAILED' && transfer.id) {
      const commissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
        asaas_transfer_id: transfer.id,
      });
      for (const comm of commissions) {
        // Reverte para confirmada para poder tentar novamente
        await base44.asServiceRole.entities.AffiliateCommission.update(comm.id, {
          status: 'confirmada',
          asaas_transfer_id: null,
        });
        await base44.asServiceRole.entities.UserNotification.create({
          title: '⚠️ Falha na transferência',
          message: 'Houve um erro ao transferir sua comissão. Verifique sua chave PIX e tente o saque novamente.',
          type: 'alert', read: false,
          sent_at: new Date().toISOString(),
          created_by: comm.referrer_email,
        });
        console.warn('Transferência falhou:', comm.id, transfer.failReason);
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('TransferWebhook Error:', error.message);
    return Response.json({ received: true, warning: error.message });
  }
});