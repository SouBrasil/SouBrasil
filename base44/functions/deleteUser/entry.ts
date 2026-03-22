// v2 - aceita sessão admin do painel (AdminUser via sessionStorage)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { userId, userEmail, adminRole } = await req.json();
    if (!userId || !userEmail) {
      return Response.json({ error: 'userId e userEmail são obrigatórios' }, { status: 400 });
    }

    // Aceita admins do painel (AdminUser com role master/administrador)
    // ou usuários da plataforma com role admin
    const allowedAdminRoles = ['master', 'administrador'];
    let authorized = false;

    if (adminRole && allowedAdminRoles.includes(adminRole)) {
      // Sessão do painel administrativo customizado
      authorized = true;
    } else {
      // Fallback: tenta auth da plataforma
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') authorized = true;
      } catch (_) { /* ignorar */ }
    }

    if (!authorized) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não permite excluir admins
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (targetUsers.length > 0 && targetUsers[0].role === 'admin') {
      return Response.json({ error: 'Não é possível excluir um administrador' }, { status: 403 });
    }

    // Apaga todos os registros relacionados
    const [usages, payments, notifications, referrals, referralConversions, referralSignups, participants, issues, favorites, contactMessages, commissions] = await Promise.all([
      base44.asServiceRole.entities.BenefitUsage.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.Payment.filter({ user_email: userEmail }),
      base44.asServiceRole.entities.UserNotification.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.Referral.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.ReferralConversion.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.ReferralSignup.filter({ user_email: userEmail }),
      base44.asServiceRole.entities.RaffleParticipant.filter({ user_email: userEmail }),
      base44.asServiceRole.entities.TechIssue.filter({ user_email: userEmail }),
      base44.asServiceRole.entities.FavoritePartner.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.ContactMessage.filter({ sender_email: userEmail }),
      base44.asServiceRole.entities.AffiliateCommission.filter({ referred_email: userEmail }),
    ]);

    await Promise.all([
      ...usages.map(r => base44.asServiceRole.entities.BenefitUsage.delete(r.id)),
      ...payments.map(r => base44.asServiceRole.entities.Payment.delete(r.id)),
      ...notifications.map(r => base44.asServiceRole.entities.UserNotification.delete(r.id)),
      ...referrals.map(r => base44.asServiceRole.entities.Referral.delete(r.id)),
      ...referralConversions.map(r => base44.asServiceRole.entities.ReferralConversion.delete(r.id)),
      ...referralSignups.map(r => base44.asServiceRole.entities.ReferralSignup.delete(r.id)),
      ...participants.map(r => base44.asServiceRole.entities.RaffleParticipant.delete(r.id)),
      ...issues.map(r => base44.asServiceRole.entities.TechIssue.delete(r.id)),
      ...favorites.map(r => base44.asServiceRole.entities.FavoritePartner.delete(r.id)),
      ...contactMessages.map(r => base44.asServiceRole.entities.ContactMessage.delete(r.id)),
      ...commissions.map(r => base44.asServiceRole.entities.AffiliateCommission.delete(r.id)),
    ]);

    // Deleta o usuário
    await base44.asServiceRole.entities.User.delete(userId);

    console.log(`Usuário ${userEmail} excluído com sucesso pelo painel admin (role: ${adminRole})`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});