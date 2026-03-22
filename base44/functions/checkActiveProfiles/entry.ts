import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { cpf, cnpj, email, type } = body; // type: 'client' ou 'partner'

    if (!cpf && !cnpj && !email) {
      return Response.json({ active_profiles: [] });
    }

    const activeProfiles = [];

    if (type === 'client') {
      // Verifica múltiplos perfis de cliente
      if (cpf) {
        const users = await base44.asServiceRole.entities.User.filter({ cpf });
        if (users && users.length > 1) {
          activeProfiles.push({
            type: 'client',
            count: users.length,
            cpf,
            users: users.map(u => ({ id: u.id, name: u.full_name, email: u.email, created_date: u.created_date }))
          });
        }
      }
    } else if (type === 'partner') {
      // Verifica múltiplos perfis ativos de parceiro
      if (cpf) {
        const requests = await base44.asServiceRole.entities.PartnerRequest.filter({ cpf, status: 'aprovado' });
        const partners = await base44.asServiceRole.entities.Partner.filter({ cpf, active: true });
        const total = (requests?.length || 0) + (partners?.length || 0);
        if (total > 1) {
          activeProfiles.push({
            type: 'partner',
            field: 'cpf',
            count: total,
            requests: requests?.map(r => ({ id: r.id, name: r.business_name, status: r.status })) || [],
            partners: partners?.map(p => ({ id: p.id, name: p.name, active: p.active })) || []
          });
        }
      }
      
      if (cnpj) {
        const requests = await base44.asServiceRole.entities.PartnerRequest.filter({ cnpj, status: 'aprovado' });
        const partners = await base44.asServiceRole.entities.Partner.filter({ cnpj, active: true });
        const total = (requests?.length || 0) + (partners?.length || 0);
        if (total > 1) {
          activeProfiles.push({
            type: 'partner',
            field: 'cnpj',
            count: total,
            requests: requests?.map(r => ({ id: r.id, name: r.business_name, status: r.status })) || [],
            partners: partners?.map(p => ({ id: p.id, name: p.name, active: p.active })) || []
          });
        }
      }

      if (email) {
        const requests = await base44.asServiceRole.entities.PartnerRequest.filter({ owner_email: email, status: 'aprovado' });
        const partners = await base44.asServiceRole.entities.Partner.filter({ active: true });
        const partnersByEmail = partners.filter(p => p.email === email); // se adicionar email na Partner
        const total = (requests?.length || 0) + (partnersByEmail?.length || 0);
        if (total > 1) {
          activeProfiles.push({
            type: 'partner',
            field: 'email',
            count: total,
            requests: requests?.map(r => ({ id: r.id, name: r.business_name })) || [],
            partners: partnersByEmail?.map(p => ({ id: p.id, name: p.name })) || []
          });
        }
      }
    }

    return Response.json({
      success: activeProfiles.length === 0,
      active_profiles: activeProfiles,
      message: activeProfiles.length === 0 ? 'Nenhum perfil duplicado ativo' : 'Perfil(is) duplicado(s) encontrado(s)'
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});