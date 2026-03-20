import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// This function checks partner trial periods and handles:
// - 7-day promo reminder notifications (daily)
// - 90-day trial expiration (auto-deactivate)
// - Post-trial 15-day reminder notifications

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const accesses = await base44.asServiceRole.entities.PartnerAccess.list('-created_date', 500);
    
    const results = { promoNotified: 0, trialExpired: 0, trialReminders: 0 };

    for (const access of accesses) {
      if (!access.created_date) continue;
      const createdAt = new Date(access.created_date);
      const daysSinceApproval = Math.floor((now - createdAt) / 86400000);

      // 7-day promo window notifications (days 1-7)
      if (daysSinceApproval < 7 && daysSinceApproval >= 0) {
        const promoDaysLeft = 7 - daysSinceApproval;
        const lastPromoNotif = access.last_promo_notif_date;
        const alreadyNotifiedToday = lastPromoNotif &&
          new Date(lastPromoNotif).toDateString() === now.toDateString();

        if (!alreadyNotifiedToday) {
          const messages = [
            `🔥 DIA ${daysSinceApproval + 1}/7: Sua oferta exclusiva de R$2.000/ano (12x R$166,67) expira em ${promoDaysLeft} dias! Clientes Sou Brasil estão perto de você. Ative AGORA!`,
            `⚡ URGENTE! Apenas ${promoDaysLeft} dias para garantir R$1.000 de desconto no plano anual Sou Brasil. Seja visto por milhares de clientes na sua região!`,
            `💰 Economize R$1.000! Plano anual Sou Brasil por apenas R$2.000 (normalmente R$3.000). Essa condição exclusiva acaba em ${promoDaysLeft} dias!`,
          ];
          const msg = messages[daysSinceApproval % messages.length];

          await base44.asServiceRole.entities.Notification.create({
            title: '⚡ Oferta exclusiva expirando!',
            message: msg,
            type: 'promo',
            target: 'specific',
            target_email: access.email,
            action_url: '/PartnerPortal',
            sent_at: now.toISOString(),
          });

          await base44.asServiceRole.entities.PartnerAccess.update(access.id, {
            last_promo_notif_date: now.toISOString(),
          });
          results.promoNotified++;
        }
      }

      // 90-day trial expiration
      if (daysSinceApproval >= 90 && !access.subscription_type && !access.trial_expired) {
        // Deactivate partner
        if (access.partner_id) {
          await base44.asServiceRole.entities.Partner.update(access.partner_id, { active: false });
        }
        await base44.asServiceRole.entities.PartnerAccess.update(access.id, { trial_expired: true });

        // Send expiration notification
        await base44.asServiceRole.entities.Notification.create({
          title: '⚠️ Período gratuito encerrado',
          message: 'Seu período gratuito de 3 meses na Sou Brasil foi encerrado. Sua empresa ficou invisível para os clientes. Assine um plano para reativar!',
          type: 'alert',
          target: 'specific',
          target_email: access.email,
          action_url: '/PartnerPortal',
          sent_at: now.toISOString(),
        });

        if (access.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: access.email,
            subject: '⚠️ Período gratuito encerrado — Reative sua empresa na Sou Brasil',
            body: `Olá!\n\nSeu período gratuito de 3 meses na plataforma Sou Brasil foi encerrado.\n\nSua empresa está atualmente INVISÍVEL para os clientes. Para continuar sendo encontrado por milhares de pessoas na sua região, assine um dos nossos planos:\n\n${process.env.BASE44_APP_URL || ''}/PartnerPortal\n\nNão perca mais clientes!\n\n— Equipe Sou Brasil 💚`,
          });
        }
        results.trialExpired++;
      }

      // Post-trial reminders every 15 days (days 90-180)
      if (daysSinceApproval >= 90 && !access.subscription_type && daysSinceApproval < 180) {
        const lastReminder = access.last_trial_reminder_date;
        const daysSinceReminder = lastReminder
          ? Math.floor((now - new Date(lastReminder)) / 86400000)
          : 16;

        if (daysSinceReminder >= 15) {
          await base44.asServiceRole.entities.Notification.create({
            title: '📢 Sua empresa está inativa na Sou Brasil',
            message: 'Clientes estão procurando empresas como a sua na plataforma. Reative sua conta com um plano e seja encontrado agora!',
            type: 'alert',
            target: 'specific',
            target_email: access.email,
            action_url: '/PartnerPortal',
            sent_at: now.toISOString(),
          });
          await base44.asServiceRole.entities.PartnerAccess.update(access.id, {
            last_trial_reminder_date: now.toISOString(),
          });
          results.trialReminders++;
        }
      }
    }

    return Response.json({ success: true, results, processed: accesses.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});