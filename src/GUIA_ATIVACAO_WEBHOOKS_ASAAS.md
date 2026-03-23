# 📡 GUIA PASSO A PASSO: Ativação de Webhooks ASAAS
**Data:** 23/03/2026 | **Tempo estimado:** 10-15 minutos

---

## 🔐 PASSO 1: Acessar Painel ASAAS Oficial

1. Abra: **https://www.asaas.com**
2. Faça login com suas credenciais **OFICIAIS do Clube Sou Brasil**
3. No menu lateral, vá para: **Configurações > Integrações > Webhooks**

---

## 📋 PASSO 2: Verificar Webhooks Já Cadastrados

Ao entrar em Webhooks, você verá uma lista de webhooks já configurados (se houver).

**Se HOUVER webhooks:**
- ✅ Clique em cada um para visualizar a URL e eventos
- ✅ Confirme se as URLs começam com seu domínio do app
- ✅ Anote o **status** (ativo/inativo)

**Se NÃO houver:**
- Você vai ver um botão **"+ Novo Webhook"** ou **"Adicionar Webhook"**
- Prossiga para o Passo 3

---

## 🚀 PASSO 3: Criar Webhook Principal (Pagamentos)

### 3.1 Clique em "+ Novo Webhook"

### 3.2 Preencha os campos:

**Nome (opcional):**
```
Webhook de Pagamentos - Clube Sou Brasil
```

**URL:**
```
https://[SEU_DOMINIO].app.base44.com/api/functions/asaasWebhook?token=[ASAAS_WEBHOOK_TOKEN]
```

**Substitua:**
- `[SEU_DOMINIO]` → Seu domínio real (ex: `clube-soul-brasil` ou `soubrasilapp`)
- `[ASAAS_WEBHOOK_TOKEN]` → O valor exato da sua variável de ambiente

### 3.3 Selecione os Eventos (marque com ✓):

```
☑️ PAYMENT_RECEIVED      (Pagamento recebido)
☑️ PAYMENT_CONFIRMED     (Pagamento confirmado)
☑️ PAYMENT_OVERDUE       (Pagamento vencido)
☑️ PAYMENT_REFUNDED      (Pagamento estornado)
☑️ PAYMENT_CHARGEBACK_REQUESTED    (Chargeback solicitado)
☑️ PAYMENT_CHARGEBACK_DISPUTE      (Chargeback em disputa)
```

### 3.4 Clique em **Salvar** ou **Criar Webhook**

**Resultado esperado:** ✅ Webhook criado com status **ATIVO**

---

## 📲 PASSO 4: Criar Webhook para Parceiros (Opcional mas Recomendado)

### 4.1 Clique novamente em "+ Novo Webhook"

**Nome:**
```
Webhook de Assinatura Parceiros
```

**URL:**
```
https://[SEU_DOMINIO].app.base44.com/api/functions/asaasWebhookPartner
```

**Header (na seção de headers, se disponível):**
```
X-Webhook-Token: [ASAAS_WEBHOOK_TOKEN]
```

### 4.2 Selecione os Eventos:

```
☑️ PAYMENT_RECEIVED       (Para ativar assinatura parceiro)
☑️ PAYMENT_CONFIRMED      (Para confirmar comissão)
```

### 4.3 Clique em **Salvar**

---

## 💰 PASSO 5: Criar Webhook para Transferências (Comissões)

### 5.1 Clique em "+ Novo Webhook"

**Nome:**
```
Webhook de Transferência de Comissões
```

**URL:**
```
https://[SEU_DOMINIO].app.base44.com/api/functions/asaasWebhookTransfer
```

**Header:**
```
X-Webhook-Token: [ASAAS_WEBHOOK_TOKEN]
```

### 5.2 Selecione os Eventos:

```
☑️ PAYMENT_CONFIRMED      (Confirmar comissão e transferir)
☑️ PAYMENT_RECEIVED       (Para fallback)
```

### 5.3 Clique em **Salvar**

---

## ✅ PASSO 6: Testar os Webhooks

### 6.1 No painel ASAAS, em cada webhook criado:
- Localize o botão **"Testar Webhook"** ou **"Reenviar"**
- Clique para enviar um evento de teste

### 6.2 Verifique os Logs:
- Vá para **Logs de Webhook** no painel ASAAS
- Confirme que recebeu **status 200** em cada teste

### 6.3 Verifique no Base44:
- Dashboard > **Code > Functions > asaasWebhook**
- Clique em **Logs** (lado direito)
- Procure por mensagens como: `"ASAAS Webhook: PAYMENT_RECEIVED"`

---

## 🔧 PASSO 7: Confirmar Variável de Ambiente

### 7.1 Acesse Dashboard Base44
- Vá para **Configurações > Variáveis de Ambiente**

### 7.2 Confirme as 3 variáveis:

```
ASAAS_API_KEY = [sua chave API oficial]
ASAAS_WEBHOOK_TOKEN = [seu token de webhook]
ASAAS_ENV = production  ⚠️ CRÍTICO: Deve ser "production" e não "sandbox"
```

Se `ASAAS_ENV=sandbox`, ALTERE para `production` imediatamente.

---

## 🎯 PASSO 8: Teste de Pagamento Real

### 8.1 Acesse a app no navegador:
```
https://[seu-dominio-app]/Pricing
```

### 8.2 Clique em **Assinar Agora** (qualquer plano)

### 8.3 Preencha:
- ✅ CPF: `07367642677` (ou um CPF válido seu)
- ✅ Forma de pagamento: **PIX** (mais rápido para testar)

### 8.4 Clique em **Gerar Pagamento**

### 8.5 Você verá:
```
✅ QR Code PIX
✅ Pix Copia e Cola
✅ Botão: "Já paguei, verificar agora"
```

**⚠️ NÃO PAGUE AINDA!** (a menos que queira testar o fluxo completo)

---

## 🧪 PASSO 9: Teste do Webhook (Sem Pagar)

### 9.1 Acesse o painel ASAAS

### 9.2 Vá para **Logs de Webhook**

### 9.3 Procure por um pagamento recente (`pay_...`)

### 9.4 Clique em **Reenviar Evento** ou **Simular Pagamento**

### 9.5 Defina o status para:
```
PAYMENT_RECEIVED  (ou PAYMENT_CONFIRMED)
```

### 9.6 Clique em **Enviar**

### 9.7 Verifique em **Base44 > Dashboard > Code > Functions > Logs**:
```
✅ Procure por: "Assinatura ativada:"
✅ Procure por: "Comissao confirmada:"
```

---

## 📊 PASSO 10: Validação Final

Faça este checklist antes de considerar a produção PRONTA:

- [ ] **ASAAS_ENV = "production"** (não sandbox)
- [ ] **3 Webhooks criados no painel ASAAS**
  - [ ] Webhook Principal (asaasWebhook)
  - [ ] Webhook Parceiro (asaasWebhookPartner)
  - [ ] Webhook Transferência (asaasWebhookTransfer)
- [ ] **Todos os webhooks com status "ATIVO"**
- [ ] **Teste de webhook enviado com sucesso (status 200)**
- [ ] **Logs do Base44 mostram processamento do webhook**
- [ ] **Pagamento de teste processado (ou simulado)**
- [ ] **Assinatura ativada após webhook**
- [ ] **Comissão criada e confirmada**

---

## 🚨 TROUBLESHOOTING

### Webhook retorna erro 401 (Unauthorized)

**Causa:** Token inválido

**Solução:**
1. Copie novamente `ASAAS_WEBHOOK_TOKEN` do Dashboard
2. Cole na URL do webhook no Asaas
3. Verifique que não tem espaços em branco

---

### Webhook retorna erro 404 (Not Found)

**Causa:** URL incorreta ou domínio errado

**Solução:**
1. Vá em Base44 > **Publicar**
2. Copie o domínio real (ex: `clube-soul-brasil.app.base44.com`)
3. Atualize a URL no webhook Asaas

---

### Webhook envia mas não ativa assinatura

**Causa:** `ASAAS_ENV` está como "sandbox"

**Solução:**
1. Dashboard > Variáveis de Ambiente
2. Altere `ASAAS_ENV` para `production`
3. Aguarde 1 minuto para deploy
4. Teste webhook novamente

---

### Nenhum webhook aparece no painel Asaas

**Causa:** Você está na conta errada ou em ambiente sandbox

**Solução:**
1. Confirme que está logado com a conta **OFICIAL** do Clube Sou Brasil
2. Verifique se a URL tem `asaas.com` (production) e não `sandbox.asaas.com`

---

## 📞 PRÓXIMO PASSO APÓS COMPLETAR

Assim que terminar todos os 10 passos:

1. ✅ Avise que os webhooks estão ativos
2. ✅ Faça um pagamento de teste real (ou simule via Asaas)
3. ✅ Monitore os logs por 24h
4. ✅ App estará **100% PRONTO PARA PRODUÇÃO**

---

**Estimativa:** 15 minutos para completar tudo

**Suporte:** Se encontrar erro em qualquer passo, compartilhe o print/erro e corrijo na hora.