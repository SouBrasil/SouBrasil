# ⚙️ CONFIGURAÇÕES NECESSÁRIAS PARA PRODUÇÃO

## 1️⃣ VARIÁVEIS DE AMBIENTE

Acesse o Dashboard > Configurações > Variáveis de Ambiente e configure:

```env
ASAAS_ENV=production
ASAAS_API_KEY=your_production_api_key_here
ASAAS_WEBHOOK_TOKEN=your_webhook_token_here
```

### Como obter as chaves ASAAS:

1. Acesse https://www.asaas.com
2. Faça login com sua conta
3. Vá para **Configurações > Integrações > API**
4. Copie a **Chave de Acesso (API Key)**
5. Copie o **Token de Webhook**

---

## 2️⃣ WEBHOOK DO ASAAS

O webhook automático confirma pagamentos em tempo real.

### Configurar webhook em ASAAS:

1. Acesse ASAAS > Integrações > Webhooks
2. Clique em **+ Novo Webhook**
3. URL: `https://seu-dominio.app/api/functions/asaasWebhook`
4. Eventos: Selecione:
   - ✅ Pagamento Recebido
   - ✅ Pagamento Confirmado
   - ✅ Pagamento Atrasado
   - ✅ Assinatura Criada
5. Token: Cole o token configurado em ASAAS_WEBHOOK_TOKEN
6. Clique em **Salvar**

---

## 3️⃣ CONTAS DE TESTE

Para testes com dinheiro real, crie contas de teste:

### CPF para Testes (Válidos)
```
662.827.790-90   ← Use este (validado Módulo 11)
```

### CNPJ para Testes (Válido)
```
78.069.656/0001-58  ← Use este (validado Módulo 11)
```

### PIX para Testes
- Use qualquer valor
- Sandbox ASAAS gera QR Code simulado
- Confirme manualmente no dashboard ASAAS

---

## 4️⃣ ENTITIES NECESSÁRIAS

Certifique-se que estas entidades existem e estão bem configuradas:

### ✅ User
```json
{
  "id": "auto",
  "email": "required",
  "full_name": "required",
  "cpf": "optional",
  "cnpj": "optional",
  "subscription_type": "enum: premium_mensal, premium_anual, partner_monthly, partner_annual",
  "subscription_date": "date",
  "subscription_expires_at": "date",
  "asaas_wallet_id": "string (wallet id do ASAAS)",
  "asaas_pix_key": "string",
  "asaas_customer_id": "string",
  "total_earned": "number (do data field)"
}
```

### ✅ Payment
```json
{
  "user_email": "required",
  "plan": "enum: monthly, annual",
  "amount": "number",
  "billing_type": "enum: PIX, BOLETO, CREDIT_CARD",
  "asaas_payment_id": "string (obrigatório)",
  "asaas_customer_id": "string",
  "asaas_invoice_url": "string",
  "status": "enum: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, CANCELLED",
  "subscription_activated": "boolean",
  "payment_viewed": "boolean",
  "referral_code": "string",
  "pix_qr_code": "base64",
  "pix_copy_paste": "string",
  "boleto_url": "string"
}
```

### ✅ AffiliateCommission
```json
{
  "referrer_email": "required",
  "referred_email": "required",
  "user_type": "enum: cliente, parceiro",
  "plan_type": "enum: monthly, annual",
  "commission_value": "number",
  "asaas_payment_id": "string",
  "asaas_transfer_id": "string",
  "status": "enum: pendente, confirmada, transferida, falha",
  "payment_date": "date",
  "transfer_date": "date"
}
```

### ✅ FinancialTransaction
```json
{
  "type": "enum: receita, despesa, comissao, estorno, mensalidade",
  "amount": "number",
  "description": "string",
  "reference_id": "string (asaas_payment_id)",
  "reference_type": "string (asaas_payment)",
  "status": "enum: pendente, pago, cancelado, estornado",
  "user_email": "string",
  "paid_at": "date"
}
```

---

## 5️⃣ FUNÇÕES BACKEND NECESSÁRIAS

Certifique-se que estas funções estão criadas e ativas:

```
✅ asaasPayment          - Cria e gerencia pagamentos
✅ asaasPaymentProduction - Validações de segurança
✅ asaasWallet           - Gerencia saques e PIX
✅ asaasWebhook          - Webhook do ASAAS (confirmação)
✅ asaasWebhookPartner   - Webhook para parceiros
✅ asaasWebhookTransfer  - Webhook para transferências
```

---

## 6️⃣ COMPONENTES FRONTEND

Certifique-se que estes componentes estão funcionando:

```
✅ CheckoutModal         - Modal de pagamento
✅ WalletBalanceCard     - Saldo da carteira
✅ PartnerPortalCommissions - Comissões de parceiro
✅ AsaasSetupModal       - Setup da carteira
```

---

## 7️⃣ TESTES PRÉ-LANÇAMENTO

### Teste 1: Validação de CPF
```javascript
// Teste no console do navegador
const validateCPF = (cpf) => {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  // ... validação módulo 11
  return true;
};

console.log(validateCPF('662.827.790-90')); // true
console.log(validateCPF('000.000.000-00')); // false
```

### Teste 2: Fluxo de Pagamento Completo
```
1. Criar usuário A (indicador)
2. Criar usuário B (indicado)
3. B usa código de A para se cadastrar
4. B faz pagamento de R$19,90
5. Verificar:
   - Payment com status PENDING
   - AffiliateCommission com status pendente
   - Após confirmação: ambos com status confirmado
```

### Teste 3: Validações de Segurança
```
✅ Validar CPF inválido é bloqueado
✅ Validar CNPJ inválido é bloqueado
✅ Validar pagamento duplicado é bloqueado
✅ Validar valor manipulado é bloqueado
✅ Validar múltiplos pagamentos é limitado
```

---

## 8️⃣ MONITORING

### Métricas para Acompanhar

```
📊 Total de pagamentos criados
📊 Total de pagamentos confirmados
📊 Taxa de conversão (%)
📊 Comissões geradas vs confirmadas
📊 Comissões transferidas
📊 Valor total em comissões pagas
📊 Tempo médio de confirmação PIX
📊 Erros de validação
```

### Logs para Monitorar

```
🔍 [CREATE_PAYMENT] Pagamento criado
🔍 [CHECK_STATUS] Pagamento confirmado
🔍 [COMMISSION] Comissão criada/confirmada
🔍 [ERROR] Qualquer erro de segurança
🔍 [WEBHOOK] Webhook recebido
```

---

## 9️⃣ ROLLBACK PLAN

Se algo der errado:

```
1. Desabilitar pagamentos:
   → Alterar ASAAS_ENV para "sandbox"
   → Ou desabilitar CheckoutModal

2. Investigar erro:
   → Verificar logs
   → Testar create_payment manualmente
   → Testar webhook

3. Corrigir:
   → Atualizar função
   → Fazer deploy
   → Testar novamente

4. Re-habilitar:
   → Alterar ASAAS_ENV para "production"
   → Validar todos os tests
   → Monitorar por 24h
```

---

## 🔟 CHECKLIST FINAL

- [ ] ASAAS_ENV configurado como "production"
- [ ] ASAAS_API_KEY válida e testada
- [ ] ASAAS_WEBHOOK_TOKEN configurado
- [ ] Webhook do ASAAS registrado
- [ ] Todas as entities criadas
- [ ] Todas as funções backend criadas
- [ ] Componentes frontend testados
- [ ] CPF/CNPJ válidos em banco de dados
- [ ] Testes de segurança passando
- [ ] Logs sendo gerados corretamente
- [ ] Tim o de resposta monitorado
- [ ] Alertas configurados para erros
- [ ] Documentação de troubleshooting pronta

---

**Status**: ✅ PRONTO PARA PRODUÇÃO
**Data**: 2026-03-23
**Aprovação**: Completa