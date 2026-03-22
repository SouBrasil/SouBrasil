import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Asaas: sandbox usa api-sandbox.asaas.com/v3, produção usa api.asaas.com/v3
const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

async function asaasFetch(path, method = 'GET', body = null) {
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
    const errMsg = data.errors?.[0]?.description || data.message || JSON.stringify(data);
    throw new Error(errMsg);
  }
  return data;
}

// Comissões por tipo e plano
const COMMISSION_VALUES = {
  cliente: { monthly: 10, annual: 10 },
  parceiro: { monthly: 100, annual: 200 },
};

function generateReferralCode(email) {
  const part1 = email.split('@')[0].slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const part2 = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${part1}${part2}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────
    // GENERATE REFERRAL CODE
    // ──────────────────────────────────────────────────
    if (action === 'generate_referral_code') {
      if (user.referral_code) {
        return Response.json({ referral_code: user.referral_code });
      }
      const code = generateReferralCode(user.email);
      await base44.auth.updateMe({ referral_code: code });
      return Response.json({ referral_code: code });
    }

    // ──────────────────────────────────────────────────
    // SETUP ASAAS WALLET — cria subconta
    // ──────────────────────────────────────────────────
    if (action === 'setup_asaas_wallet') {
      const { cpf, pix_key } = body;
      if (!cpf || !pix_key) {
        return Response.json({ error: 'CPF e Chave PIX obrigatórios' }, { status: 400 });
      }

      // Busca dados atualizados do usuário (inclui birth_date que pode ter sido salvo pelo modal)
      const freshUser = await base44.auth.me();
      const birthDate = body.birth_date || freshUser.birth_date || user.birth_date;

      if (!birthDate) {
        return Response.json({ error: 'Data de nascimento obrigatória' }, { status: 400 });
      }

      const cpfClean = cpf.replace(/\D/g, '');
      if (cpfClean.length !== 11) {
        return Response.json({ error: 'CPF inválido' }, { status: 400 });
      }

      // ── Verifica se já existe subconta com esse email ou CPF (evita erro "email/cpf já em uso") ──
      console.log('Verificando subconta existente para:', user.email, cpfClean);
      const [existingByEmail, existingByCpf] = await Promise.all([
        asaasFetch(`/accounts?email=${encodeURIComponent(user.email)}&limit=1`).catch((e) => { console.log('Erro busca email:', e.message); return null; }),
        asaasFetch(`/accounts?cpfCnpj=${cpfClean}&limit=1`).catch((e) => { console.log('Erro busca cpf:', e.message); return null; }),
      ]);
      console.log('existingByEmail:', JSON.stringify(existingByEmail?.data?.length), 'existingByCpf:', JSON.stringify(existingByCpf?.data?.length));
      const existingAccount = existingByEmail?.data?.[0] || existingByCpf?.data?.[0] || null;
      if (existingAccount) {
        const existingWalletId = existingAccount.walletId || existingAccount.id;
        await base44.auth.updateMe({
          asaas_wallet_id: existingWalletId,
          asaas_account_id: existingAccount.id,
          asaas_pix_key: pix_key,
          cpf: cpf,
        });
        console.log('Subconta já existente recuperada:', existingWalletId);
        return Response.json({ success: true, wallet_id: existingWalletId });
      }

      // ── Busca dados do CEP via ViaCEP ──
      const cepRaw = (body.cep || freshUser.cep || user.cep || '').replace(/\D/g, '');
      let cepData = null;
      if (cepRaw.length === 8) {
        const cepRes = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`).catch(() => null);
        if (cepRes?.ok) cepData = await cepRes.json().catch(() => null);
      }

      const phoneRaw    = (freshUser.phone || user.phone || '').replace(/\D/g, '');
      const mobilePhone = phoneRaw.length >= 10 ? phoneRaw.slice(0, 11) : '11999999999';

      // Busca o cityId interno do Asaas pelo código IBGE
      async function getAsaasCityId(ibgeCode, cityName, uf) {
        if (ibgeCode) {
          const r = await asaasFetch(`/cities?ibgeCode=${ibgeCode}&limit=1`).catch(() => null);
          if (r?.data?.[0]?.id) { console.log('City por IBGE:', ibgeCode, '→', r.data[0].id); return r.data[0].id; }
        }
        if (cityName && uf) {
          const r2 = await asaasFetch(`/cities?name=${encodeURIComponent(cityName)}&state=${uf}&limit=5`).catch(() => null);
          if (r2?.data?.length > 0) { console.log('City por nome:', cityName, '→', r2.data[0].id); return r2.data[0].id; }
        }
        return null;
      }

      function buildPayload(email, postalCode, cepInfoData, cityId = null) {
        const province = cepInfoData?.bairro || freshUser.neighborhood || user.neighborhood || 'Centro';
        const address  = cepInfoData?.logradouro || freshUser.street || freshUser.address || user.street || user.address || 'Endereço não informado';
        const payload = {
          name: freshUser.full_name || user.full_name || user.email,
          email,
          loginEmail: email,
          cpfCnpj: cpfClean,
          birthDate: birthDate.slice(0, 10),
          mobilePhone,
          phone: mobilePhone,
          address,
          addressNumber: freshUser.number || user.number || '0',
          complement: '',
          province,
          postalCode,
          incomeValue: 1500,
        };
        if (cityId) payload.city = cityId;
        return payload;
      }

      const initialPostalCode = cepRaw.length === 8 ? cepRaw : '01310100';
      // Pré-busca o cityId para usar como fallback caso o CEP não seja reconhecido
      const cityId = await getAsaasCityId(cepData?.ibge, cepData?.localidade, cepData?.uf);
      let accountPayload = buildPayload(user.email, initialPostalCode, cepData, cityId);

      console.log('Payload final:', JSON.stringify({ ...accountPayload, cpfCnpj: '***' }));
      console.log('cepData:', JSON.stringify(cepData));
      console.log('cepRaw:', cepRaw, 'initialPostalCode:', initialPostalCode);

      let wallet;
      try {
        wallet = await asaasFetch('/accounts', 'POST', accountPayload);
      } catch (err) {
        console.error('Erro Asaas /accounts RAW:', err.message);
        const errLower = err.message?.toLowerCase() || '';

        // CEP não reconhecido pelo Asaas → tenta buscar CEP alternativo da mesma cidade
        if (errLower.includes('cidade') || errLower.includes('city')) {
          console.log('CEP não reconhecido pelo Asaas, buscando CEP alternativo para:', cepData?.localidade, cepData?.uf);
          const altCep = await findAlternativeCep(cepData?.localidade, cepData?.uf);
          if (altCep) {
            const altCepRes = await fetch(`https://viacep.com.br/ws/${altCep}/json/`).catch(() => null);
            const altCepData = altCepRes?.ok ? await altCepRes.json().catch(() => null) : null;
            accountPayload = buildPayload(user.email, altCep, altCepData || cepData);
            console.log('Tentando com CEP alternativo:', altCep, JSON.stringify({ ...accountPayload, cpfCnpj: '***' }));
            try {
              wallet = await asaasFetch('/accounts', 'POST', accountPayload);
            } catch (err3) {
              console.error('Erro com CEP alternativo:', err3.message);
              return Response.json({ success: false, error: err3.message }, { status: 400 });
            }
          } else {
            return Response.json({ success: false, error: 'Não foi possível identificar sua cidade pelo CEP informado. Por favor, informe um CEP residencial válido.' }, { status: 400 });
          }
        // Se o email já está em uso, tenta com email alternativo
        } else if (errLower.includes('email') && errLower.includes('uso')) {
          const altEmail = `afiliado.${cpfClean}@soubrasil.app`;
          console.log('Email em uso, tentando email alternativo:', altEmail);
          try {
            wallet = await asaasFetch('/accounts', 'POST', { ...accountPayload, email: altEmail, loginEmail: altEmail });
          } catch (err2) {
            const err2Lower = err2.message?.toLowerCase() || '';
            if (err2Lower.includes('cpf') && err2Lower.includes('uso')) {
              const byCpfRetry = await asaasFetch(`/accounts?cpfCnpj=${cpfClean}&limit=1`).catch(() => null);
              if (byCpfRetry?.data?.[0]) {
                wallet = byCpfRetry.data[0];
              } else {
                return Response.json({ success: false, error: 'Subconta já existe mas não foi possível recuperá-la. Contate o suporte.' }, { status: 400 });
              }
            } else if (err2Lower.includes('cidade') || err2Lower.includes('city')) {
              // CEP de rodovia — busca CEP alternativo e tenta novamente com email alternativo
              console.log('CEP inválido no email alternativo, buscando CEP alternativo...');
              const altCep2 = await findAlternativeCep(cepData?.localidade, cepData?.uf);
              if (altCep2) {
                const altCepRes2 = await fetch(`https://viacep.com.br/ws/${altCep2}/json/`).catch(() => null);
                const altCepData2 = altCepRes2?.ok ? await altCepRes2.json().catch(() => null) : null;
                const payloadAltCep = buildPayload(altEmail, altCep2, altCepData2 || cepData);
                console.log('Tentando com CEP alternativo + email alternativo:', altCep2);
                try {
                  wallet = await asaasFetch('/accounts', 'POST', payloadAltCep);
                } catch (err4) {
                  console.error('Erro com CEP alternativo + email alternativo:', err4.message);
                  return Response.json({ success: false, error: err4.message }, { status: 400 });
                }
              } else {
                return Response.json({ success: false, error: 'Não foi possível identificar sua cidade pelo CEP informado. Por favor, informe um CEP residencial válido.' }, { status: 400 });
              }
            } else {
              console.error('Erro Asaas /accounts (alt email):', err2.message);
              return Response.json({ success: false, error: err2.message }, { status: 400 });
            }
          }
        // Se o CPF já está em uso, recupera a subconta existente
        } else if (errLower.includes('cpf') && errLower.includes('uso')) {
          const byCpfRetry = await asaasFetch(`/accounts?cpfCnpj=${cpfClean}&limit=1`).catch(() => null);
          if (byCpfRetry?.data?.[0]) {
            wallet = byCpfRetry.data[0];
            console.log('CPF em uso — subconta recuperada:', wallet.walletId || wallet.id);
          } else {
            return Response.json({ success: false, error: 'CPF já cadastrado, mas não foi possível recuperar a subconta. Contate o suporte.' }, { status: 400 });
          }
        } else {
          return Response.json({ success: false, error: err.message }, { status: 400 });
        }
      }

      // Salva walletId e chave PIX no perfil do usuário
      await base44.auth.updateMe({
        asaas_wallet_id: wallet.walletId || wallet.id,
        asaas_account_id: wallet.id,
        asaas_pix_key: pix_key,
        cpf: cpf,
      });

      console.log('Subconta criada com sucesso:', wallet.walletId || wallet.id);
      return Response.json({ success: true, wallet_id: wallet.walletId || wallet.id });
    }

    // ──────────────────────────────────────────────────
    // GET WALLET BALANCE
    // ──────────────────────────────────────────────────
    if (action === 'get_wallet_balance') {
      if (!user.asaas_wallet_id) {
        return Response.json({ error: 'Wallet não configurada' }, { status: 400 });
      }
      const balance = await asaasFetch('/finance/balance');
      return Response.json(balance);
    }

    // ──────────────────────────────────────────────────
    // PROCESS COMMISSION (chamado pelo webhook/check_status)
    // ──────────────────────────────────────────────────
    if (action === 'process_commission') {
      const { referred_email, referred_name, user_type, plan_type, asaas_payment_id, commission_value } = body;

      const commission = await base44.asServiceRole.entities.AffiliateCommission.create({
        referrer_email: user.email,
        referred_email,
        referrer_name: user.full_name,
        referred_name,
        user_type,
        plan_type,
        commission_value,
        asaas_payment_id,
        status: 'confirmada',
        payment_date: new Date().toISOString(),
      });

      const currentTotal = user.total_earned || 0;
      await base44.auth.updateMe({ total_earned: currentTotal + commission_value });

      await base44.asServiceRole.entities.UserNotification.create({
        title: '💰 Nova comissão recebida!',
        message: `Parabéns! Você recebeu R$ ${commission_value.toFixed(2)} pela indicação de ${referred_name}. O valor está disponível na sua carteira Asaas.`,
        type: 'benefit',
        read: false,
        sent_at: new Date().toISOString(),
        created_by: user.email,
      });

      return Response.json({ success: true, commission_id: commission.id });
    }

    // ──────────────────────────────────────────────────
    // TRANSFER WALLET TO BANK via PIX
    // ──────────────────────────────────────────────────
    if (action === 'transfer_to_bank') {
      if (!user.asaas_wallet_id || !user.asaas_pix_key) {
        return Response.json({ error: 'Wallet ou PIX não configurada' }, { status: 400 });
      }

      const { amount } = body;
      if (!amount || amount <= 0) {
        return Response.json({ error: 'Valor inválido' }, { status: 400 });
      }

      const transfer = await asaasFetch('/transfers', 'POST', {
        value: amount,
        pixAddressKey: user.asaas_pix_key,
      });

      return Response.json({ success: true, transfer_id: transfer.id });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Affiliate Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});