// v3
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password, security_key } = await req.json();

    if (!email || !password || !security_key) {
      return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Usa service role para buscar sem precisar de auth do usuário
    const allAdmins = await base44.asServiceRole.entities.AdminUser.list('-created_date', 100);

    const admin = allAdmins?.find(a =>
      a.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      String(a.password_hash).trim() === String(password).trim() &&
      String(a.security_key).trim() === String(security_key).trim() &&
      a.active === true
    );

    if (!admin) {
      return Response.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Atualiza last_login
    await base44.asServiceRole.entities.AdminUser.update(admin.id, {
      last_login: new Date().toISOString()
    });

    return Response.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});