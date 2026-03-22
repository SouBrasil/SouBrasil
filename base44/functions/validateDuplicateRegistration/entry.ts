import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { cpf, cnpj, email, type } = body; // type: 'client' ou 'partner'

    if (!cpf && !cnpj && !email) {
      return Response.json({ success: false, error: 'Informe CPF, CNPJ ou email' }, { status: 400 });
    }

    const duplicates = {
      cpf_duplicates: [],
      cnpj_duplicates: [],
      email_duplicates: [],
    };

    // Verifica CPF
    if (cpf && cpf.trim()) {
      // Clientes (User entity)
      const usersByCP = await base44.asServiceRole.entities.User.filter({ cpf });
      if (usersByCP && usersByCP.length > 0) {
        duplicates.cpf_duplicates.push(...usersByCP.map(u => ({ type: 'user', id: u.id, name: u.full_name, email: u.email })));
      }

      // Parceiros (Partner entity)
      const partnersByCPF = await base44.asServiceRole.entities.Partner.filter({ cpf, active: true });
      if (partnersByCPF && partnersByCPF.length > 0) {
        duplicates.cpf_duplicates.push(...partnersByCPF.map(p => ({ type: 'partner', id: p.id, name: p.name })));
      }

      // Solicitações de parceiros
      const requestsByCPF = await base44.asServiceRole.entities.PartnerRequest.filter({ cpf });
      if (requestsByCPF && requestsByCPF.length > 0) {
        duplicates.cpf_duplicates.push(...requestsByCPF.map(r => ({ type: 'partner_request', id: r.id, name: r.business_name, status: r.status })));
      }
    }

    // Verifica CNPJ
    if (cnpj && cnpj.trim()) {
      // Parceiros ativos
      const partnersByCNPJ = await base44.asServiceRole.entities.Partner.filter({ cnpj, active: true });
      if (partnersByCNPJ && partnersByCNPJ.length > 0) {
        duplicates.cnpj_duplicates.push(...partnersByCNPJ.map(p => ({ type: 'partner', id: p.id, name: p.name })));
      }

      // Solicitações de parceiros
      const requestsByCNPJ = await base44.asServiceRole.entities.PartnerRequest.filter({ cnpj });
      if (requestsByCNPJ && requestsByCNPJ.length > 0) {
        duplicates.cnpj_duplicates.push(...requestsByCNPJ.map(r => ({ type: 'partner_request', id: r.id, name: r.business_name, status: r.status })));
      }
    }

    // Verifica Email
    if (email && email.trim()) {
      const usersByEmail = await base44.asServiceRole.entities.User.filter({ email });
      if (usersByEmail && usersByEmail.length > 0) {
        duplicates.email_duplicates.push(...usersByEmail.map(u => ({ type: 'user', id: u.id, name: u.full_name })));
      }

      const partnersByEmail = await base44.asServiceRole.entities.PartnerRequest.filter({ owner_email: email });
      if (partnersByEmail && partnersByEmail.length > 0) {
        duplicates.email_duplicates.push(...partnersByEmail.map(r => ({ type: 'partner_request', id: r.id, name: r.business_name, status: r.status })));
      }
    }

    // Se houver duplicatas, retorna detalhes
    const hasDuplicates = duplicates.cpf_duplicates.length > 0 || 
                         duplicates.cnpj_duplicates.length > 0 || 
                         duplicates.email_duplicates.length > 0;

    return Response.json({
      success: !hasDuplicates,
      duplicates: hasDuplicates ? duplicates : null,
      message: hasDuplicates ? 'Duplicata(s) encontrada(s)' : 'Nenhuma duplicata',
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});