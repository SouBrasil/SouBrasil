# 🧪 Plano de Teste Completo — Sistema de Indicações

## 📋 Dados de Teste

### CPFs (Clientes)
```
1. 662.827.790-90  → Indicador (Nívia equivalente)
2. 322.742.900-40  → Indicador
3. 724.840.520-57  → Indicador
4. 814.497.620-77  → Indicador
5. 654.054.130-97  → Indicador
6. 679.652.650-36  → Indicado (usa código de #1)
7. 544.733.100-51  → Indicado (usa código de #2)
8. 654.940.920-97  → Indicado (usa código de #3)
9. 996.554.170-18  → Indicado (usa código de #4)
10. 383.747.060-15 → Indicado (usa código de #5)
```

### CNPJs (Parceiros Comerciais)
```
1. 78.069.656/0001-58   → Parceiro Indicador
2. 51.326.091/0001-90   → Parceiro Indicador
3. 81.842.600/0001-07   → Parceiro Indicador
4. 20.927.864/0001-60   → Parceiro Indicador
5. 66.192.459/0001-42   → Parceiro Indicador
6. 74.119.936/0001-72   → Parceiro Indicado (usa código de CNPJ #1)
7. 56.904.487/0001-91   → Parceiro Indicado (usa código de CNPJ #2)
8. 85.861.108/0001-21   → Parceiro Indicado (usa código de CNPJ #3)
9. 83.253.863/0001-06   → Parceiro Indicado (usa código de CNPJ #4)
10. 23.727.104/0001-06  → Parceiro Indicado (usa código de CNPJ #5)
```

---

## 🎯 Cenário de Teste 1: Indicação de Cliente → Cliente

### Passo 1: Criar Indicador #1 (CPF 662.827.790-90)
Registra no app com:
- Email: `nivia.test@example.com`
- Nome: `Nívia Test`
- CPF: `662.827.790-90`

**Resultado esperado:**
- User criado com `referral_code = REF...` único
- Pode compartilhar link: `/?ref=REF...`

### Passo 2: Criar Indicado #6 (CPF 679.652.650-36)
Registra via link de Nívia: `/?ref=REF662827790...`
- Email: `bruno.test@example.com`
- Nome: `Bruno Test`
- CPF: `679.652.650-36`

**Resultado esperado:**
- User criado com `referral_code_used = REF662827790...` 
- Salvo no campo user.referral_code_used

### Passo 3: Bruno Paga (Plano Mensal)
Clique em Pricing → Escolhe Mensal → Checkout Modal

**Payload enviado:**
```json
{
  "action": "create_payment",
  "plan": "monthly",
  "billing_type": "PIX",
  "cpf": "67965265036",
  "plan_type": "client",
  "referral_code": "REF662827790..."
}
```

**Resultado esperado:**
- ✅ `Payment` criado com status=PENDING
- ✅ `AffiliateCommission` criado:
  - referrer_email: nivia.test@example.com
  - referred_email: bruno.test@example.com
  - commission_value: R$ 50.00 (cliente mensal)
  - status: pendente

### Passo 4: Verificar Pagamento
Após pagar (PIX/Boleto), clique em "Já paguei, verificar agora"

**Resultado esperado:**
- `Payment.status` → RECEIVED/CONFIRMED
- `AffiliateCommission.status` → confirmada
- `User(nívia).total_earned` → +50.00
- `UserNotification` criado para Nívia

---

## 🎯 Cenário de Teste 2: Indicação de Parceiro → Parceiro

### Passo 1: Criar Parceiro Indicador (CNPJ 78.069.656/0001-58)
Se integrado com Partner Portal:
- Email: `partner1@example.com`
- CNPJ: `78.069.656/0001-58`

**Resultado esperado:**
- `Partner` criado
- `PartnerAccess` criado com referral_link contendo código único

### Passo 2: Parceiro Indicado (CNPJ 74.119.936/0001-72)
Registra via link de Partner #1

**Resultado esperado:**
- `Partner` criado com `referral_code_used`
- Email salvo

### Passo 3: Pagamento do Parceiro Indicado
Escolhe plano anual → Checkout

**Payload:**
```json
{
  "action": "create_payment",
  "plan": "annual",
  "billing_type": "PIX",
  "cpf": "74.119.936/0001-72",  // CNPJ aqui
  "plan_type": "partner",
  "referral_code": "REF78069656..."
}
```

**Resultado esperado:**
- ✅ `AffiliateCommission`:
  - commission_value: R$ 200.00 (parceiro anual)
  - status: pendente → confirmada

---

## 🔧 Como Testar via Backend

### 1️⃣ Teste de Criação de Payment + Commission

```bash
curl -X POST http://localhost:5173/api/functions/asaasPayment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "create_payment",
    "plan": "monthly",
    "billing_type": "PIX",
    "cpf": "67965265036",
    "plan_type": "client",
    "referral_code": "REF662827790"
  }'
```

**Verificar resposta:**
- `payment.asaas_payment_id` ✅
- Console log: "Referrer encontrado por codigo" ✅
- Console log: "Comissao criada: R$..." ✅

### 2️⃣ Verificar AffiliateCommission no Admin

```javascript
// No console admin:
const comissions = await base44.asServiceRole.entities.AffiliateCommission.list('-created_date', 10);
console.table(commissions.map(c => ({
  referrer: c.referrer_email,
  referred: c.referred_email,
  value: c.commission_value,
  status: c.status,
  asaas_id: c.asaas_payment_id
})));
```

### 3️⃣ Simular Confirmação de Pagamento

```bash
curl -X POST http://localhost:5173/api/functions/asaasPayment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "action": "check_status",
    "asaas_payment_id": "pay_XXXXX"
  }'
```

---

## ✅ Checklist de Validação

- [ ] Usuário indicador criado com `referral_code`
- [ ] Usuário indicado criado com `referral_code_used` preenchido
- [ ] Checkout envia `referral_code` no payload
- [ ] Backend encontra referrer pelo código
- [ ] `AffiliateCommission` criada com status=pendente
- [ ] Pagamento confirmado → status muda para confirmada
- [ ] `User(referrer).total_earned` atualizado
- [ ] `UserNotification` enviada para indicador

---

## 🐛 Debugging

Se algo não funcionar:

1. **Commission não criada?**
   - Verificar console: "Referrer encontrado por codigo"
   - Se não aparecer, debugar busca no banco

2. **Status não confirma?**
   - Verificar `Payment.asaas_payment_id` correto
   - Testar `check_status` manualmente

3. **Notificação não aparece?**
   - Verificar se `total_earned` foi atualizado
   - Testar criação manual de `UserNotification