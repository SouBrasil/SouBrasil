import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { action, partner_id, cpf, cnpj } = body;

    if (action === 'before_approve') {
      // Verifica se já existe parceiro ativo com o mesmo CPF/CNPJ
      const duplicates = [];

      if (cpf) {
        const existingPartners = await base44.asServiceRole.entities.Partner.filter({ cpf, active: true });
        if (existingPartners && existingPartners.length > 0) {
          duplicates.push({
            field: 'cpf',
            existing: existingPartners.map(p => ({ id: p.id, name: p.name }))
          });
        }
      }

      if (cnpj) {
        const existingPartners = await base44.asServiceRole.entities.Partner.filter({ cnpj, active: true });
        if (existingPartners && existingPartners.length > 0) {
          duplicates.push({
            field: 'cnpj',
            existing: existingPartners.map(p => ({ id: p.id, name: p.name }))
          });
        }
      }

      return Response.json({
        can_approve: duplicates.length === 0,
        duplicates
      });
    }

    if (action === 'deactivate_duplicates') {
      // Desativa parceiros duplicados mantendo o mais recente ativo
      if (!cpf && !cnpj) {
        return Response.json({ success: false, error: 'Informe CPF ou CNPJ' }, { status: 400 });
      }

      let toDeactivate = [];

      if (cpf) {
        const partners = await base44.asServiceRole.entities.Partner.filter({ cpf, active: true });
        if (partners && partners.length > 1) {
          // Ordena por created_date e desativa os mais antigos
          partners.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          toDeactivate = partners.slice(1); // mantém o mais recente
        }
      }

      if (cnpj && toDeactivate.length === 0) {
        const partners = await base44.asServiceRole.entities.Partner.filter({ cnpj, active: true });
        if (partners && partners.length > 1) {
          partners.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          toDeactivate = partners.slice(1);
        }
      }

      // Desativa os duplicados
      for (const partner of toDeactivate) {
        await base44.asServiceRole.entities.Partner.update(partner.id, { active: false });
      }

      return Response.json({
        success: true,
        deactivated_count: toDeactivate.length,
        kept_active: toDeactivate.length > 0 ? 'parceiro mais recente' : 'nenhuma ação'
      });
    }

    return Response.json({ success: false, error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});