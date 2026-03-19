import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { title, message, type, target, target_email, partner_id, action_url } = await req.json();

    if (!title || !message) {
      return Response.json({ error: 'title e message são obrigatórios' }, { status: 400 });
    }

    // Get all users to send to
    const allUsers = await base44.asServiceRole.entities.User.list();

    let targetUsers = [];
    const now = new Date().toISOString();

    if (target === 'specific' && target_email) {
      targetUsers = allUsers.filter((u) => u.email === target_email);
    } else if (target === 'premium') {
      targetUsers = allUsers.filter((u) => u.subscription_type === 'monthly' || u.subscription_type === 'annual');
    } else if (target === 'trial') {
      targetUsers = allUsers.filter((u) => {
        if (!u.trial_start_date) return false;
        const days = Math.floor((Date.now() - new Date(u.trial_start_date).getTime()) / 86400000);
        return days < 7;
      });
    } else {
      // all
      targetUsers = allUsers;
    }

    // Create notification record for each user
    const notifications = targetUsers.map((u) => ({
      notification_id: crypto.randomUUID(),
      title,
      message,
      type: type || 'info',
      read: false,
      partner_id: partner_id || null,
      action_url: action_url || null,
      sent_at: now,
      created_by: u.email,
    }));

    // Bulk create
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.UserNotification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      sent_to: targetUsers.length,
      message: `Notificação enviada para ${targetUsers.length} usuário(s)`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});