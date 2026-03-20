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

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: employee.email,
      subject: '🎉 Bem-vindo ao Time Sou Brasil!',
      body: `Olá, ${employee.name}! 🌟\n\nÉ com enorme alegria que te damos as boas-vindas ao time Sou Brasil!\n\nVocê agora faz parte de uma família apaixonada por conectar pessoas e negócios, transformando comunidades e gerando valor real para parceiros e clientes em toda a plataforma.\n\nSeu papel aqui é FUNDAMENTAL. Juntos, estamos construindo algo incrível!\n\n🔑 Seus dados de acesso ao Painel Administrativo:\n📧 E-mail: ${employee.email}\n🔒 Perfil: ${employee.role || 'colaborador'}\n\n📍 Acesse em: ${appUrl}\n\nSempre que precisar, conte com nossa equipe. Bem-vindo ao time! 🚀💚\n\n— Equipe Sou Brasil`.trim(),
    });

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