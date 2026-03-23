import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // IDs dos usuários a deletar (exceto master clubesoubrasil@gmail.com)
    const userIdsToDelete = [
      '69c13e57921e2d1234d2e2c6', // brunomartins.igreen@gmail.com
      '69c135512197bdbd8ca85a5a', // brunomartins.pr@gmail.com
      '69c0a8950ad43ccd83532bd0', // diogojose715@gmail.com
      '69c06daa5996df427a1e7180', // mineirinhoexpress@gmail.com
      '69c0585b4254331af3009ab0', // niviasibele@gmail.com
    ];

    let deleted = 0;
    const errors = [];

    for (const userId of userIdsToDelete) {
      try {
        // Tenta deletar via SDK
        const result = await base44.asServiceRole.entities.User.delete(userId);
        deleted++;
        console.log(`✅ Usuário deletado: ${userId}`);
      } catch (err) {
        console.warn(`⚠️ Erro ao deletar ${userId}: ${err.message}`);
        errors.push({ userId, error: err.message });
      }
    }

    return Response.json({ 
      success: true, 
      deleted, 
      total: userIdsToDelete.length,
      errors 
    });
  } catch (error) {
    console.error('Delete error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});