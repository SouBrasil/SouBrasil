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

      const LOGO = 'https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png';
      const portalUrl = `${Deno.env.get('APP_URL') || 'https://app.soubrasil.com.br'}/PartnerPortal`;
      const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const emailHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f0;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);"><tr><td style="background:linear-gradient(135deg,#0d3320,#145a32,#1a7a42);padding:0;text-align:center;"><div style="background:#f5c400;height:6px;width:100%;"></div><div style="padding:30px 20px 20px;"><img src="${LOGO}" alt="Sou Brasil" style="max-width:180px;height:auto;"></div><div style="padding:20px 20px 0;color:white;text-align:center;"><p style="font-size:26px;font-weight:bold;margin:0;">📊 Relatório Mensal</p><p style="font-size:14px;margin:8px 0 0;opacity:0.95;">${mesAno} — Portal do Parceiro</p></div><div style="background:#f5c400;height:6px;width:100%;margin-top:20px;"></div></td></tr><tr><td style="padding:36px 30px;background:#ffffff;color:#333;"><h2 style="color:#1a2e6b;font-size:22px;margin:0 0 16px;">Olá, ${access.partner_name || 'Parceiro'}!</h2><p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">Seu relatório mensal de desempenho no <strong>Clube de Benefícios Sou Brasil</strong> está disponível. Acesse o Portal do Parceiro para ver todos os dados detalhados.</p><div style="background:linear-gradient(135deg,rgba(26,92,42,0.06),rgba(245,196,0,0.06));border-left:4px solid #1a5c2a;border-radius:8px;padding:20px;margin:0 0 24px;"><p style="font-size:14px;color:#333;margin:0 0 8px;"><strong>📋 O que você encontra no relatório:</strong></p><p style="font-size:13px;color:#555;margin:4px 0;">🎁 Vouchers utilizados pelos clientes</p><p style="font-size:13px;color:#555;margin:4px 0;">👥 Cadastros gerados via seu link de indicação</p><p style="font-size:13px;color:#555;margin:4px 0;">⭐ Avaliações dos clientes</p><p style="font-size:13px;color:#555;margin:4px 0;">💰 Comissões acumuladas</p></div><table style="width:100%;max-width:400px;margin:0 auto 24px;"><tbody><tr><td style="text-align:center;"><a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#145a32,#1a7a42);color:#fff;padding:14px 40px;text-decoration:none;border-radius:25px;font-weight:bold;font-size:15px;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 12px rgba(20,90,50,0.35);">VER MEU RELATÓRIO</a></td></tr></tbody></table></td></tr><tr><td style="background:#1a5c2a;padding:24px 20px;text-align:center;color:#fff;font-size:13px;"><p style="margin:0 0 6px;font-style:italic;font-size:15px;font-weight:500;">Equipe Sou Brasil 🇧🇷</p><p style="margin:0;opacity:0.85;">Porque todo Brasileiro merece Desconto!</p></td></tr></table></td></tr></table></body></html>`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: access.email,
        subject: `📊 Seu relatório mensal está disponível — Sou Brasil`,
        body: emailHTML,
      });

      sent++;
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});