import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path, method, body) {
  if (!method) method = 'GET';
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = (data.errors && data.errors[0] && data.errors[0].description)
      || data.message || JSON.stringify(data);
    throw new Error(errMsg);
  }
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!ASAAS_API_KEY) {
      return Response.json({ error: 'ASAAS_API_KEY nao configurada.' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, cpf_cnpj, birth_date, email, phone, pix_key, cep, address, address_number, province } = body;

    if (!cpf_cnpj || !name) {
      return Response.json({ error: 'name e cpf_cnpj sao obrigatorios' }, { status: 400 });
    }

    const docClean = cpf_cnpj.replace(/\D/g, '');

    // 1. Verificar se já existe subconta com esse CPF/CNPJ
    const existing = await asaasFetch(`/accounts?cpfCnpj=${docClean}`);
    if (existing.data && existing.data.length > 0) {
      const existingAccount = existing.data[0];
      // Já existe — salvar o walletId real
      await base44.auth.updateMe({ asaas_wallet_id: existingAccount.walletId });
      // Gerar referral_code se não tiver
      if (!user.referral_code) {
        const refCode = 'REF' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
        await base44.auth.updateMe({ referral_code: refCode });
      }
      return Response.json({
        success: true,
        wallet_id: existingAccount.walletId,
        message: 'Conta Asaas ja existente vinculada.',
        account: existingAccount
      });
    }

    // 2. Criar subconta real no Asaas
    const accountPayload = {
      name: name,
      email: email || user.email,
      cpfCnpj: docClean,
      birthDate: birth_date || undefined,
      mobilePhone: phone ? phone.replace(/\D/g, '') : undefined,
      postalCode: cep ? cep.replace(/\D/g, '') : undefined,
      address: address || undefined,
      addressNumber: address_number || undefined,
      province: province || undefined,
      companyType: docClean.length === 14 ? 'MEI' : undefined,
    };

    // Remove campos undefined
    Object.keys(accountPayload).forEach(k => accountPayload[k] === undefined && delete accountPayload[k]);

    console.log('Criando subconta Asaas para:', docClean);
    const account = await asaasFetch('/accounts', 'POST', accountPayload);

    console.log('Subconta criada:', JSON.stringify(account));

    if (!account.walletId) {
      return Response.json({ error: 'Asaas nao retornou walletId', details: account }, { status: 500 });
    }

    // 3. Configurar chave PIX na subconta (se informada)
    if (pix_key) {
      try {
        await asaasFetch('/pix/addressKeys', 'POST', {
          type: 'CPF',
          key: pix_key.replace(/\D/g, ''),
        });
        console.log('Chave PIX configurada:', pix_key);
      } catch (pixErr) {
        console.warn('Erro ao configurar PIX (nao critico):', pixErr.message);
      }
    }

    // 4. Salvar walletId e gerar referral_code
    const refCode = 'REF' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
    await base44.auth.updateMe({
      asaas_wallet_id: account.walletId,
      referral_code: refCode,
    });

    return Response.json({
      success: true,
      wallet_id: account.walletId,
      referral_code: refCode,
      message: 'Subconta Asaas criada com sucesso!',
    });

  } catch (error) {
    console.error('AsaasSetupWallet Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});