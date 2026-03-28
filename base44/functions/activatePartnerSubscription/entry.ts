import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { payment_id, user_email, plan_type } = await req.json();

    if (!payment_id || !user_email || !plan_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the payment to verify it's confirmed
    const payments = await base44.asServiceRole.entities.Payment.filter({ 
      asaas_payment_id: payment_id,
      user_email: user_email,
      status: 'RECEIVED'
    });

    if (payments.length === 0) {
      return Response.json({ 
        success: false,
        message: 'Payment not found or not confirmed' 
      }, { status: 404 });
    }

    const payment = payments[0];

    // Find the partner associated with this user
    const partners = await base44.asServiceRole.entities.PartnerAccess.filter({ 
      email: user_email 
    });

    if (partners.length === 0) {
      return Response.json({ 
        success: false,
        message: 'No partner found for this user' 
      }, { status: 404 });
    }

    const partnerAccess = partners[0];
    const partner_id = partnerAccess.partner_id;

    // Calculate subscription expiration dates
    const now = new Date();
    let subscription_expires_at;
    
    if (plan_type === 'annual') {
      subscription_expires_at = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      subscription_expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Update PartnerAccess with subscription info
    await base44.asServiceRole.entities.PartnerAccess.update(partnerAccess.id, {
      subscription_type: plan_type === 'annual' ? 'partner_annual' : 'partner_monthly',
      subscription_expires_at: subscription_expires_at.toISOString(),
    });

    // Also update the Partner record
    await base44.asServiceRole.entities.Partner.update(partner_id, {
      subscription_type: plan_type === 'annual' ? 'partner_annual' : 'partner_monthly',
      subscription_expires_at: subscription_expires_at.toISOString(),
    });

    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: '✅ Assinatura confirmada — Portal Parceiro Premium',
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f0;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);"><tr><td style="background:linear-gradient(135deg,#22a85a,#16a34a);padding:32px 24px;text-align:center;"><img src="https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png" alt="Sou Brasil" style="height:60px;width:auto;margin-bottom:8px;" /><br/><span style="color:#f0c040;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">Assinatura Confirmada</span></td></tr><tr><td style="background:linear-gradient(135deg,#22a85a,#16a34a);padding:28px 24px;text-align:center;"><div style="font-size:48px;margin-bottom:8px;">✅</div><h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px;">Bem-vindo ao Premium!</h1><p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Sua assinatura foi ativada com sucesso!</p></td></tr><tr><td style="padding:32px 24px;"><p style="color:#1a3a1a;font-size:16px;font-weight:bold;margin:0 0 16px;">Parabéns!</p><p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 24px;">Sua assinatura <strong>${plan_type === 'annual' ? 'anual' : 'mensal'}</strong> foi confirmada e seu portal está 100% ativo!</p><div style="background:#e8f5e9;border:2px solid #4caf50;border-radius:12px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#1b5e20;font-size:14px;"><strong>✨ Benefícios liberados:</strong></p><ul style="margin:8px 0 0;padding-left:20px;color:#1b5e20;font-size:13px;"><li>Dashboard completo com análises</li><li>Gerenciamento de benefícios</li><li>Sorteios e ofertas exclusivas</li><li>Acesso a relatórios detalhados</li><li>Suporte prioritário</li></ul></div><div style="text-align:center;margin:0 0 24px;"><a href="${Deno.env.get('APP_URL') || 'https://soubrasilapp.com'}/PartnerPortal" style="display:inline-block;background:linear-gradient(135deg,#22a85a,#16a34a);color:#ffffff;font-size:16px;font-weight:bold;padding:14px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(34,168,90,0.4);">ACESSAR PORTAL</a></div><p style="color:#666;font-size:12px;line-height:1.6;margin:0;">Sua assinatura expira em ${plan_type === 'annual' ? '365 dias' : '30 dias'}. Você receberá um aviso antes da expiração.</p></td></tr><tr><td style="background:#f8fdf8;border-top:1px solid #e8f5e9;padding:20px 24px;text-align:center;"><p style="color:#22a85a;font-size:15px;font-weight:bold;margin:0 0 4px;">Equipe <em>Sou Brasil</em></p></td></tr></table></td></tr></table></body></html>`,
    });

    return Response.json({
      success: true,
      message: 'Partner subscription activated',
      partner_id,
      subscription_type: plan_type === 'annual' ? 'partner_annual' : 'partner_monthly',
      expires_at: subscription_expires_at.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});