import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, full_name, partner_id } = await req.json();

    if (!email || !full_name || !partner_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verifica se usuário já existe
    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing.length > 0) {
      // Update existing user with partner_id
      const user = existing[0];
      await base44.asServiceRole.entities.User.update(user.id, { 
        partner_id: partner_id,
        is_commercial_partner: true 
      });
      return Response.json({
        success: true,
        message: 'User already exists, partner linked',
        partner_id,
        user_email: email,
      });
    }

    // Invite the user to the app (creates user record)
    await base44.users.inviteUser(email, 'user');

    // Update the user with partner_id
    const newUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (newUsers.length > 0) {
      await base44.asServiceRole.entities.User.update(newUsers[0].id, { 
        partner_id: partner_id,
        is_commercial_partner: true 
      });
    }

    return Response.json({
      success: true,
      message: 'Partner user created and invited',
      partner_id,
      user_email: email,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});