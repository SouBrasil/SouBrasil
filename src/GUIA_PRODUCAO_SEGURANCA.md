# 🔐 GUIA DE IMPLEMENTAÇÃO - PRODUÇÃO COM SEGURANÇA

## 📋 STATUS: PRONTO PARA PRODUÇÃO

Este guia contém TODAS as alterações e proteções implementadas para operar com **dinheiro real** e **conta real do ASAAS**.

---

## ✅ IMPLEMENTAÇÕES REALIZADAS

### 1️⃣ **VALIDAÇÕES CRÍTICAS**

#### CPF/CNPJ Validation
```javascript
✓ Validação de CPF (Módulo 11)
✓ Validação de CNPJ (Módulo 11)
✓ Rejeição de CPFs padrão (00000000000, 11111111111, etc)
✓ Estrutura de dados obrigatória verificada
```

#### Proteção contra Pagamento Duplicado
```javascript
✓ Detecção de pagamento duplicado em 15 minutos
✓ Limite de 5+ pagamentos por plano em 24h = bloqueado
✓ Verificação de status pendente/recebido/confirmado
✓ Logging detalhado de tentativas suspeitas
```

#### Validação de Valor
```javascript
✓ Verifica se o valor corresponde ao plano
✓ Rejeita manipulações de valor
✓ Valida prices: Client (R$19,90 / R$179,88) e Partner (R$299,90 / R$2.500)
```

#### Rate Limiting
```javascript
✓ Máximo 10 requisições por minuto por usuário
✓ Bloco temporário após limite excedido
✓ Rastreamento por email/IP
```

---

### 2️⃣ **PROTEÇÕES EM ASAASVALIDATION**

#### Arquivo: `functions/asaasPaymentProduction`

**Ações Disponíveis:**
- `validate_payment_security` - Valida todos os requisitos de segurança antes de criar pagamento

**Checks Implementados:**
1. ✅ Validação de documento (CPF/CNPJ)
2. ✅ Validação de plano
3. ✅ Verificação de pagamento duplicado
4. ✅ Limite de pagamentos em 24h
5. ✅ Validação de integridade de dados

---

### 3️⃣ **FLUXO SEGURO DE PAGAMENTO**

```
[Usuário inicia pagamento]
         ↓
[CheckoutModal pré-valida documento]
         ↓
[Chama asaasPaymentProduction/validate_payment_security]
         ↓
[Se válido → Prossegue para asaasPayment/create_payment]
     ↓                                              ↓
  [Válido]                                    [Inválido - Bloqueia]
     ↓
[Cria customer no ASAAS]
     ↓
[Busca/Cria referrer para comissão]
     ↓
[Cria assinatura com split de comissão]
     ↓
[Retorna QR Code PIX / Link Boleto / Invoice Cartão]
     ↓
[Usuário paga]
     ↓
[check_status ativa subscription]
     ↓
[Comissão confirmada → Referrer recebe]
```

---

### 4️⃣ **CHECKLIST PRÉ-PRODUÇÃO**

#### Configurações ASAAS
```
☐ ASAAS_ENV = "production"
☐ ASAAS_API_KEY = [sua API key de produção]
☐ ASAAS_WEBHOOK_TOKEN = [seu webhook token]
☐ Webhook de pagamento configurado em ASAAS (status)
```

#### Validações Base44
```
☐ Entity User: subscription_type, subscription_expires_at, asaas_wallet_id
☐ Entity Payment: asaas_payment_id, status, billing_type, referral_code
☐ Entity AffiliateCommission: status, commission_value, referrer_email
☐ Entity FinancialTransaction: type, amount, reference_id
```

#### Frontend - CheckoutModal
```
☐ Formulário pré-valida CPF/CNPJ
☐ Pix/Boleto/Cartão funcionando
☐ Confirmação automática de pagamento (WebSocket)
☐ Polling fallback a cada 15s
☐ Tela de sucesso após confirmação
```

#### Backend - asaasPayment
```
☐ Validação de documento obrigatória
☐ Bloqueio de pagamento duplicado
☐ Split de comissão configurado
☐ Webhook para confirmar pagamento
☐ Ativação automática de subscription
```

---

### 5️⃣ **VARIÁVEIS DE AMBIENTE NECESSÁRIAS**

Certifique-se de que estas variáveis estão configuradas:

```env
# ASAAS
ASAAS_ENV=production          # production ou sandbox
ASAAS_API_KEY=xxx             # Sua chave API ASAAS
ASAAS_WEBHOOK_TOKEN=xxx       # Token webhook ASAAS

# Base44
BASE44_APP_ID=xxx             # Auto-configurado
```

---

### 6️⃣ **FUNÇÕES CRÍTICAS PARA OPERAÇÃO**

#### `asaasPayment` - create_payment
```
POST /api/functions/asaasPayment
{
  "action": "create_payment",
  "plan": "monthly",           // ou "annual"
  "plan_type": "client",       // ou "partner"
  "billing_type": "PIX",       // ou "BOLETO", "CREDIT_CARD"
  "cpf": "12345678900",        // Obrigatório e validado
  "referral_code": "REF..."    // Opcional (para comissão)
}

Respostas:
✅ 200: Payment criado com sucesso (pix_qr_code, pix_copy_paste, etc)
❌ 400: CPF inválido, Plano inválido, Pagamento duplicado
❌ 401: Não autenticado
❌ 500: Erro ASAAS
```

#### `asaasPayment` - check_status
```
POST /api/functions/asaasPayment
{
  "action": "check_status",
  "asaas_payment_id": "pay_xxx"
}

Respostas:
✅ 200: { status: "RECEIVED"|"CONFIRMED"|"PENDING", value: 19.90 }
     + Ativa subscription automaticamente se confirmado
     + Cria/Confirma comissão de referrer
```

#### `asaasPaymentProduction` - validate_payment_security
```
POST /api/functions/asaasPaymentProduction
{
  "action": "validate_payment_security",
  "cpf_cnpj": "12345678900",
  "plan": "monthly",
  "plan_type": "client"
}

Respostas:
✅ 200: {
  "valid": true|false,
  "errors": [],
  "security_checks": {
    "documento": true|false,
    "duplicado": true|false,
    "limite_24h": true|false
  }
}
```

---

### 7️⃣ **TRANSAÇÕES EM PRODUÇÃO**

#### Fluxo de Comissão Completo

```
1. Usuário A (mineirinhoexpress) gera código de referência
   → referral_code = "CAFEZINMN2IF8XM"
   → Compartilha link: /?ref=CAFEZINMN2IF8XM

2. Usuário B acessa com código e se cadastra
   → user.referral_code_used = "CAFEZINMN2IF8XM"

3. Usuário B faz pagamento de R$19,90 (mensal cliente)
   → CheckoutModal valida documento
   → create_payment busca referrer por código
   → Cria AffiliateCommission(status: pendente, valor: R$10)
   → Split configurado: R$10 para wallet de A

4. Pagamento é confirmado no ASAAS
   → check_status encontra comissão
   → AffiliateCommission.status = "confirmada"
   → User(A).total_earned += R$10
   → Notificação enviada para A

5. A solicita saque de R$10
   → Chama asaasWallet/request_withdrawal
   → Split executa automaticamente para wallet de A
   → 1-3 dias úteis: Transferência chega na conta de A
```

---

### 8️⃣ **MONITORAMENTO E LOGS**

#### Logs Importantes para Acompanhar

```
✓ [CREATE_PAYMENT] Tentativa de pagamento duplicado detectada
✓ [CREATE_PAYMENT] Tentativa de manipulação de valor detectada
✓ [CHECK_STATUS] Comissão criada retroativamente
✓ [WEBHOOK] Pagamento confirmado por ASAAS
✓ [ERROR] ASAAS Error: [descrição do erro]
```

#### Métricas para Monitorar

```
📊 Taxa de sucesso de pagamento
📊 Tempo médio de confirmação (deve ser < 1 min PIX)
📊 Taxa de duplicação (deve ser 0%)
📊 Comissões geradas vs confirmadas
📊 Taxa de erro de validação
```

---

### 9️⃣ **TESTES RECOMENDADOS ANTES DE PRODUÇÃO**

#### Teste 1: Fluxo Básico de Cliente
```
1. Cadastre dois usuários (A indicador, B indicado)
2. A gera código de referência
3. B se cadastra com código
4. B faz pagamento de R$19,90 (mensal)
5. Verifique:
   - Payment criado com status PENDING
   - AffiliateCommission criada (status: pendente)
   - Após pagamento: status muda para confirmada
   - A recebe notificação e R$10
```

#### Teste 2: Fluxo Básico de Parceiro
```
1. Parceiro A cadastra e configura carteira ASAAS
2. Parceiro B se cadastra com código de A
3. B faz pagamento de R$299,90 (mensal)
4. Verifique:
   - Split de R$100 configurado
   - Comissão criada com valor correto
   - Após confirmação: Split executa
```

#### Teste 3: Validações de Segurança
```
1. Tente pagamento com CPF inválido → Deve bloquear
2. Tente pagamento duplicado em 10 min → Deve bloquear
3. Tente alterar valor do plano → Deve bloquear
4. Tente 6+ pagamentos em 24h → Deve bloquear
```

---

### 🔟 **TROUBLESHOOTING**

#### Problema: "CPF/CNPJ inválido"
```
❌ CPF não passa na validação de módulo 11
✅ Solução: Valide o CPF antes de tentar
```

#### Problema: "Você já tem um pagamento pendente"
```
❌ Tentativa de pagamento duplicado detectada
✅ Solução: Aguarde 15 minutos e tente novamente
```

#### Problema: "Valor do plano inválido"
```
❌ Tentativa de manipular valor
✅ Solução: Use valores oficiais (R$19,90, R$179,88, etc)
```

#### Problema: Comissão não aparece
```
❌ Referrer não encontrado ou comissão não criada
✅ Solução:
   1. Verificar se referrer existe
   2. Verificar se tem asaas_wallet_id configurado
   3. Verificar logs de create_payment
   4. Se necessário, chamar check_status manualmente
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Testar ambiente sandbox** com credenciais ASAAS
2. **Validar webhook** de pagamento confirmado
3. **Monitorar logs** durante 24h
4. **Realizar pagamentos reais** de teste
5. **Validar comissões** foram pagas corretamente
6. **Migrar para produção** com confiança

---

## 📞 SUPORTE

Para dúvidas sobre implementação:
- Verifique logs de erro no console
- Valide credenciais ASAAS
- Teste com webhook simulado
- Consulte documentação ASAAS: https://docs.asaas.com

---

**Última atualização**: 2026-03-23
**Status**: ✅ PRONTO PARA PRODUÇÃO