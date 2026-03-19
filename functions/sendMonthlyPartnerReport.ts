import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by automation - use service role
    const allAccesses = await base44.asServiceRole.entities.PartnerAccess.list();

    let sent = 0;
    for (const access of allAccesses) {
      if (!access.active || !access.email) continue;

      // Send in-app notification
      await base44.asServiceRole.entities.Notification.create({
        title: '📊 Relatório Mensal Disponível',
        message: 'Seu relatório mensal de desempenho como parceiro Sou Brasil está disponível. Acesse o Portal do Parceiro para ver seus dados.',
        type: 'info',
        target: 'specific',
        target_email: access.email,
        action_url: '/PartnerPortal',
        sent_at: new Date().toISOString(),
        read: false,
      });

      // Send email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: access.email,
        subject: '📊 Seu relatório mensal está disponível — Sou Brasil',
        body: `Olá, ${access.partner_name || 'Parceiro'}!\n\nSeu relatório mensal de desempenho no Clube de Benefícios Sou Brasil está disponível.\n\nAcesse o Portal do Parceiro no app para visualizar:\n• Vouchers utilizados\n• Cadastros gerados via seu link\n• Avaliações dos clientes\n• Comissões acumuladas\n\nAcesse agora: ${Deno.env.get('APP_URL') || 'o app Sou Brasil'} → Portal do Parceiro\n\nEquipe Sou Brasil 🇧🇷`,
      });

      sent++;
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});