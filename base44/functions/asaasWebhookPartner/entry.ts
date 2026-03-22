import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('asaas-signature');
    const secret = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    // Validate signature
    if (signature && secret) {
      const crypto = await import('crypto');
      const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (hash !== signature) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const payload = JSON.parse(body);
    const event = payload.event;
    const data = payload.data;

    // Only process payment_received and payment_confirmed events
    if (!['payment_received', 'payment_confirmed'].includes(event)) {
      return Response.json({ success: true, ignored: true });
    }

    const paymentId = data.id;

    // Find the payment in our database
    const payments = await base44.asServiceRole.entities.Payment.filter({
      asaas_payment_id: paymentId,
      status: 'PENDING',
    });

    if (payments.length === 0) {
      return Response.json({ success: true, message: 'Payment not found or already processed' });
    }

    const payment = payments[0];

    // Check if this is a partner payment
    if (!['partner_monthly', 'partner_annual', 'partner_trial_promo'].includes(payment.plan)) {
      return Response.json({ success: true, message: 'Not a partner payment' });
    }

    // Update payment status
    await base44.asServiceRole.entities.Payment.update(payment.id, {
      status: 'RECEIVED',
      subscription_activated: true,
    });

    // Find partner by email
    const partners = await base44.asServiceRole.entities.PartnerAccess.filter({
      email: payment.user_email,
    });

    if (partners.length === 0) {
      console.log('No partner found for email:', payment.user_email);
      return Response.json({ success: true, message: 'No partner found for this user' });
    }

    const partner = partners[0];
    const partner_id = partner.partner_id;

    // Calculate subscription expiration
    const now = new Date();
    let subscription_type = 'partner_monthly';
    let subscription_expires_at;

    if (payment.plan === 'partner_annual' || payment.plan === 'partner_trial_promo') {
      subscription_type = 'partner_annual';
      subscription_expires_at = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      subscription_type = 'partner_monthly';
      subscription_expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Update PartnerAccess
    await base44.asServiceRole.entities.PartnerAccess.update(partner.id, {
      subscription_type: subscription_type,
      subscription_expires_at: subscription_expires_at.toISOString(),
    });

    // Update Partner
    await base44.asServiceRole.entities.Partner.update(partner_id, {
      subscription_type: subscription_type,
      subscription_expires_at: subscription_expires_at.toISOString(),
    });

    // Update User subscription if exists
    const users = await base44.asServiceRole.entities.User.filter({
      email: payment.user_email,
    });

    if (users.length > 0) {
      const user = users[0];
      await base44.asServiceRole.entities.User.update(user.id, {
        subscription_type: subscription_type,
        subscription_expires_at: subscription_expires_at.toISOString(),
        is_commercial_partner: true,
      });
    }

    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: payment.user_email,
      subject: '✅ Assinatura Premium confirmada — Sou Brasil',
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f0;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);"><tr><td style="background:linear-gradient(135deg,#22a85a,#16a34a);padding:32px 24px;text-align:center;"><img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png" alt="Sou Brasil" style="height:60px;width:auto;margin-bottom:8px;" /><br/><span style="color:#f0c040;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">Pagamento Confirmado</span></td></tr><tr><td style="background:linear-gradient(135deg,#22a85a,#16a34a);padding:28px 24px;text-align:center;"><div style="font-size:48px;margin-bottom:8px;">✅</div><h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px;">Parabéns!</h1><p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Sua assinatura foi confirmada com sucesso!</p></td></tr><tr><td style="padding:32px 24px;"><p style="color:#1a3a1a;font-size:16px;font-weight:bold;margin:0 0 16px;">Olá ${payment.user_name || 'Parceiro'},</p><p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 24px;">Seu pagamento foi confirmado e sua assinatura <strong>${subscription_type === 'partner_annual' ? 'anual' : 'mensal'}</strong> está ativa!</p><div style="background:#e8f5e9;border:2px solid #4caf50;border-radius:12px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#1b5e20;font-size:14px;"><strong>✨ Benefícios liberados:</strong></p><ul style="margin:8px 0 0;padding-left:20px;color:#1b5e20;font-size:13px;"><li>Acesso completo ao Portal de Parceiros</li><li>Dashboard com análises em tempo real</li><li>Gerenciamento de benefícios e sorteios</li><li>Relatórios e estatísticas detalhadas</li><li>Suporte prioritário via WhatsApp</li></ul></div><div style="text-align:center;margin:0 0 24px;"><a href="https://soubrasilapp.com/PartnerPortal" style="display:inline-block;background:linear-gradient(135deg,#22a85a,#16a34a);color:#ffffff;font-size:16px;font-weight:bold;padding:14px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(34,168,90,0.4);">ACESSAR PORTAL</a></div><p style="color:#666;font-size:12px;line-height:1.6;margin:0;">Sua assinatura expira em ${subscription_type === 'partner_annual' ? '365' : '30'} dias. Você receberá um aviso antes da expiração.</p></td></tr><tr><td style="background:#f8fdf8;border-top:1px solid #e8f5e9;padding:20px 24px;text-align:center;"><p style="color:#22a85a;font-size:15px;font-weight:bold;margin:0 0 4px;">Equipe <em>Sou Brasil</em></p></td></tr></table></td></tr></table></body></html>`,
    });

    return Response.json({
      success: true,
      message: 'Partner subscription activated',
      partner_id,
      subscription_type,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});