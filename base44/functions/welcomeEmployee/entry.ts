import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Called after creating a new employee — sends welcome email + notification
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { employee } = await req.json();
    if (!employee?.email || !employee?.name) {
      return Response.json({ error: 'employee.email and employee.name required' }, { status: 400 });
    }

    const appUrl = `${req.headers.get('origin') || 'https://app.soubrasil.com.br'}/AdminLogin`;

    // Create welcome notification (in-app)
    // Note: Email only works for users registered in the app
    // For admin employees, we store a notification and they see it on login

    // Create in-app notification (system-wide for admin users)
    await base44.asServiceRole.entities.Notification.create({
      title: '🎉 Bem-vindo ao Time Sou Brasil!',
      message: `Olá, ${employee.name}! Você agora é parte do nosso time. Acesse o painel e comece a transformar vidas! 💚`,
      type: 'system',
      target: 'specific',
      target_email: employee.email,
      action_url: '/AdminLogin',
      sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true, message: `Welcome message sent to ${employee.email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});