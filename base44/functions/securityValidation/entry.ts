import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;
const requestCounts = new Map();

const DOC_REGEX = {
  cpf: /^\d{11}$/,
  cnpj: /^\d{14}$/,
};

const INVALID_CPFS = [
  '00000000000', '11111111111', '22222222222', '33333333333',
  '44444444444', '55555555555', '66666666666', '77777777777',
  '88888888888', '99999999999',
];

// Validação de CPF (Módulo 11)
function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || INVALID_CPFS.includes(cpf)) return false;
  
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
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

// Validação de CNPJ (Módulo 11)
function validateCNPJ(cnpj) {
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
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

// Rate limiting por IP/email
function checkRateLimit(identifier) {
  const now = Date.now();
  if (!requestCounts.has(identifier)) {
    requestCounts.set(identifier, []);
  }
  
  const timestamps = requestCounts.get(identifier);
  const recentRequests = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  requestCounts.set(identifier, recentRequests);
  return true;
}

// Validação de pagamento duplicado
async function checkDuplicatePayment(base44, userEmail, plan, planType) {
  const existingPayments = await base44.asServiceRole.entities.Payment.filter({
    user_email: userEmail,
    plan: plan,
    status: { $in: ['PENDING', 'RECEIVED', 'CONFIRMED'] },
  });
  
  if (existingPayments.length > 0) {
    const lastPayment = existingPayments[existingPayments.length - 1];
    const minutesSince = (Date.now() - new Date(lastPayment.created_date).getTime()) / 60000;
    if (minutesSince < 10) {
      return { isDuplicate: true, lastPaymentId: lastPayment.id };
    }
  }
  
  return { isDuplicate: false };
}

// Validação de fraude - comportamento suspeito
async function checkFraudIndicators(base44, user, planType) {
  const indicators = [];
  
  // Múltiplos pagamentos em curto período
  const recentPayments = await base44.asServiceRole.entities.Payment.filter({
    user_email: user.email,
  }, '-created_date', 20);
  
  if (recentPayments.length > 5) {
    const last24h = recentPayments.filter(p => 
      (Date.now() - new Date(p.created_date).getTime()) < 86400000
    );
    if (last24h.length > 3) {
      indicators.push('múltiplos_pagamentos_24h');
    }
  }
  
  // Dados incompletos ou suspeitos
  if (!user.full_name || user.full_name.length < 3) {
    indicators.push('nome_incompleto');
  }
  
  // Verificar consistência de dados
  const existingUsers = await base44.asServiceRole.entities.User.filter({
    cpf: user.cpf,
  });
  if (existingUsers.length > 1) {
    indicators.push('cpf_duplicado');
  }
  
  return indicators;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    
    // Rate limiting
    if (!checkRateLimit(user.email)) {
      console.warn(`Rate limit exceeded for ${user.email}`);
      return Response.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    
    // VALIDATE CPF/CNPJ
    if (action === 'validate_document') {
      const doc = body.document?.replace(/\D/g, '') || '';
      const type = body.type || 'cpf';
      
      if (type === 'cpf') {
        const isValid = validateCPF(doc);
        return Response.json({ valid: isValid });
      } else if (type === 'cnpj') {
        const isValid = validateCNPJ(doc);
        return Response.json({ valid: isValid });
      }
      
      return Response.json({ error: 'Tipo de documento inválido' }, { status: 400 });
    }
    
    // CHECK DUPLICATE PAYMENT
    if (action === 'check_duplicate_payment') {
      const { plan, plan_type } = body;
      const result = await checkDuplicatePayment(base44, user.email, plan, plan_type);
      return Response.json(result);
    }
    
    // CHECK FRAUD INDICATORS
    if (action === 'check_fraud') {
      const fraudIndicators = await checkFraudIndicators(base44, user, body.plan_type);
      const riskLevel = fraudIndicators.length > 2 ? 'high' : fraudIndicators.length > 0 ? 'medium' : 'low';
      return Response.json({ 
        risk_level: riskLevel,
        indicators: fraudIndicators,
        flagged: riskLevel === 'high',
      });
    }
    
    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Security validation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});