// ⚠️ FUNÇÃO DE TESTE — use apenas em desenvolvimento
// Simula webhook do ASAAS para testar comissionamento

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode testar
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem testar' }, { status: 403 });
    }

    const body = await req.json();
    const { asaas_payment_id, test = true } = body;

    if (!asaas_payment_id) {
      return Response.json({
        error: 'asaas_payment_id obrigatório',
        example: {
          asaas_payment_id: '123456789',
          test: true,
        },
      }, { status: 400 });
    }

    console.log(`🧪 Teste de Webhook iniciado para: ${asaas_payment_id}`);

    // Simula webhook do ASAAS
    const webhookPayload = {
      event: 'PAYMENT_RECEIVED', // ou PAYMENT_CONFIRMED
      data: {
        id: asaas_payment_id,
        status: 'RECEIVED',
        value: 19.90,
        externalReference: 'user@example.com|monthly|client|REF123456',
      },
    };

    // Chama a função de processamento do webhook
    const webhookRes = await fetch(
      `${Deno.env.get('BASE44_APP_URL')}/functions/asaasWebhookTransfer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': Deno.env.get('ASAAS_WEBHOOK_TOKEN'),
        },
        body: JSON.stringify(webhookPayload),
      }
    ).catch(err => {
      console.warn('⚠️ Erro ao chamar webhook:', err.message);
      return { ok: false, status: 500 };
    });

    if (!webhookRes.ok) {
      return Response.json({
        success: false,
        error: 'Webhook retornou erro',
        status: webhookRes.status,
      }, { status: 500 });
    }

    const webhookData = await webhookRes.json();

    console.log(`✅ Webhook testado com sucesso`);

    return Response.json({
      success: true,
      test: true,
      message: 'Webhook processado com sucesso em modo de teste',
      payload: webhookPayload,
      response: webhookData,
    });

  } catch (error) {
    console.error('❌ Teste Webhook Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});