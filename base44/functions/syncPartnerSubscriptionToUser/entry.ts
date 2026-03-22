import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, subscription_type, subscription_expires_at } = await req.json();

    if (!user_email || !subscription_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the User record to reflect partner subscription
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    
    if (users.length === 0) {
      return Response.json({ 
        success: false,
        message: 'User not found' 
      }, { status: 404 });
    }

    const user = users[0];

    // Update user with partner subscription info
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_type: subscription_type,
      subscription_expires_at: subscription_expires_at,
      is_commercial_partner: true,
    });

    return Response.json({
      success: true,
      message: 'User subscription synchronized',
      user_email,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});