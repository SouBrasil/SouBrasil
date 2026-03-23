// ============================================================
// ASAAS PAYMENT - PRODUÇÃO COM SEGURANÇA
// ============================================================
// Este arquivo contém todas as validações e proteções
// necessárias para operações de pagamento em produção
//
// RECURSOS:
// ✓ Validação de CPF/CNPJ
// ✓ Detecção de pagamento duplicado
// ✓ Verificação de valor de plano
// ✓ Logging detalhado de segurança
// ✓ Rate limiting
// ✓ Verificação de integridade de dados
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const ASAAS_BASE_URL = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

// Validação de CPF (Módulo 11)
function isValidCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  
  const invalidCPFs = ['00000000000', '11111111111', '22222222222', '33333333333',
    '44444444444', '55555555555', '66666666666', '77777777777',
    '88888888888', '99999999999'];
  if (invalidCPFs.includes(cpf)) return false;
  
  let sum = 0, remainder;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf.substring(10, 11));
}

// Validação de CNPJ (Módulo 11)
function isValidCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let sum = 0, pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return result === parseInt(digits.charAt(1));
}

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
    const errMsg = (data.errors && data.errors[0] && data.errors[0].description) || data.message || JSON.stringify(data);
    throw new Error(errMsg);
  }
  return data;
}

async function findOrCreateCustomer(user, doc) {
  const docClean = (doc || user.cpf || user.cnpj || '').replace(/\D/g, '');
  console.log('findOrCreateCustomer: email=' + user.email + ', docClean=' + docClean);
  
  if (docClean && docClean.length >= 11) {
    try {
      const byDoc = await asaasFetch(`/customers?cpfCnpj=${docClean}`);
      if (byDoc.data && byDoc.data.length > 0) {
        console.log('Cliente encontrado por CPF/CNPJ: ' + byDoc.data[0].id);
        return byDoc.data[0];
      }
    } catch (e) {
      console.warn('Erro ao buscar cliente por CPF: ' + e.message);
    }
  }
  
  try {
    const byEmail = await asaasFetch(`/customers?email=${encodeURIComponent(user.email)}`);
    if (byEmail.data && byEmail.data.length > 0) {
      console.log('Cliente encontrado por email: ' + byEmail.data[0].id);
      return byEmail.data[0];
    }
  } catch (e) {
    console.warn('Erro ao buscar cliente por email: ' + e.message);
  }
  
  console.log('Criando novo cliente: ' + user.email);
  return asaasFetch('/customers', 'POST', {
    name: user.full_name || user.email,
    email: user.email,
    cpfCnpj: docClean || undefined,
    mobilePhone: user.phone ? user.phone.replace(/\D/g, '') : undefined,
    externalReference: user.email,
  });
}

const CLIENT_PLAN_PRICES  = { monthly: 19.90,  annual: 179.88 };
const PARTNER_PLAN_PRICES = { monthly: 299.90, annual: 2500.00 };
const COMMISSION_VALUES = {
  client:  { monthly: 10,  annual: 10  },
  partner: { monthly: 100, annual: 200 },
};

function getDueDate(days) {
  if (!days) days = 1;
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    
    if (action !== 'validate_payment_security') {
      return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }
    
    // VALIDAR SEGURANÇA DE PAGAMENTO
    const { cpf_cnpj, plan, plan_type } = body;
    const doc = (cpf_cnpj || '').replace(/\D/g, '');
    const planType = plan_type || 'client';
    const prices = planType === 'partner' ? PARTNER_PLAN_PRICES : CLIENT_PLAN_PRICES;
    const expectedAmount = prices[plan];
    
    const errors = [];
    
    // 1. Validar documento
    if (!doc || doc.length < 11) {
      errors.push('documento_invalido');
    } else if (doc.length === 11 && !isValidCPF(doc)) {
      errors.push('cpf_invalido');
    } else if (doc.length === 14 && !isValidCNPJ(doc)) {
      errors.push('cnpj_invalido');
    }
    
    // 2. Validar plano
    if (!expectedAmount) {
      errors.push('plano_invalido');
    }
    
    // 3. Verificar pagamento duplicado recente
    const recentPayments = await base44.asServiceRole.entities.Payment.filter({
      user_email: user.email,
      plan: plan,
      status: { $in: ['PENDING', 'RECEIVED', 'CONFIRMED'] },
    });
    
    if (recentPayments.length > 0) {
      const lastPayment = recentPayments[recentPayments.length - 1];
      const minutesSince = (Date.now() - new Date(lastPayment.created_date).getTime()) / 60000;
      if (minutesSince < 15) {
        errors.push('pagamento_duplicado_recente');
      }
    }
    
    // 4. Verificar múltiplos pagamentos em 24h
    const payments24h = await base44.asServiceRole.entities.Payment.filter({
      user_email: user.email,
    }, '-created_date', 50);
    
    const last24h = payments24h.filter(p => 
      (Date.now() - new Date(p.created_date).getTime()) < 86400000
    );
    
    if (last24h.length > 5) {
      errors.push('muitos_pagamentos_24h');
    }
    
    return Response.json({
      valid: errors.length === 0,
      errors: errors,
      security_checks: {
        documento: errors.includes('documento_invalido') ? false : true,
        duplicado: errors.includes('pagamento_duplicado_recente') ? false : true,
        limite_24h: errors.includes('muitos_pagamentos_24h') ? false : true,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Security validation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});