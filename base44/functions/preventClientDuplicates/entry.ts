import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { action, cpf, email } = body;

    if (action === 'check') {
      // Verifica se existe mais de um cliente com o mesmo CPF/Email
      const duplicates = [];

      if (cpf) {
        const users = await base44.asServiceRole.entities.User.filter({ cpf });
        if (users && users.length > 1) {
          duplicates.push({
            field: 'cpf',
            count: users.length,
            users: users.map(u => ({ 
              id: u.id, 
              name: u.full_name, 
              email: u.email, 
              created_date: u.created_date 
            }))
          });
        }
      }

      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users && users.length > 1) {
          duplicates.push({
            field: 'email',
            count: users.length,
            users: users.map(u => ({ 
              id: u.id, 
              name: u.full_name, 
              email: u.email, 
              created_date: u.created_date 
            }))
          });
        }
      }

      return Response.json({
        has_duplicates: duplicates.length > 0,
        duplicates
      });
    }

    if (action === 'list_duplicates') {
      // Lista todos os clientes duplicados no sistema
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 10000);
      const duplicateMap = new Map();

      // Agrupa por CPF
      allUsers.forEach(user => {
        if (user.cpf) {
          if (!duplicateMap.has(`cpf_${user.cpf}`)) {
            duplicateMap.set(`cpf_${user.cpf}`, []);
          }
          duplicateMap.get(`cpf_${user.cpf}`).push(user);
        }
      });

      // Agrupa por Email
      allUsers.forEach(user => {
        if (user.email) {
          if (!duplicateMap.has(`email_${user.email}`)) {
            duplicateMap.set(`email_${user.email}`, []);
          }
          duplicateMap.get(`email_${user.email}`).push(user);
        }
      });

      const duplicates = Array.from(duplicateMap.entries())
        .filter(([_, users]) => users.length > 1)
        .map(([key, users]) => ({
          key,
          field: key.split('_')[0],
          count: users.length,
          users: users.map(u => ({ 
            id: u.id, 
            name: u.full_name, 
            email: u.email, 
            cpf: u.cpf,
            created_date: u.created_date 
          }))
        }));

      return Response.json({
        total_duplicates: duplicates.length,
        duplicates
      });
    }

    return Response.json({ success: false, error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});