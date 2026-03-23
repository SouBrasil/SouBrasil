# ✅ CHECKLIST FINAL PARA PRODUÇÃO
**Status:** Em andamento | **Último atualizado:** 23/03/2026

---

## 📌 RESUMO: O QUE FALTA

```
┌─────────────────────────────────────────────────────┐
│  ETAPA 1: CONFIGURAÇÃO ASAAS (HOJE)                │
│  ├─ [TODO] Ativar 3 Webhooks no painel ASAAS       │
│  └─ [TODO] Confirmar ASAAS_ENV = production        │
│                                                     │
│  ETAPA 2: TESTES (HOJE)                            │
│  ├─ [TODO] Teste de pagamento PIX                  │
│  ├─ [TODO] Teste de pagamento Boleto              │
│  ├─ [TODO] Teste de comissão (afiliado)           │
│  └─ [TODO] Validar emails automáticos             │
│                                                     │
│  ETAPA 3: SEGURANÇA & MONITORING (HOJE)           │
│  ├─ [TODO] Revisar logs de segurança              │
│  ├─ [TODO] Configurar alertas (opcional)          │
│  └─ [TODO] Backup de configuração                 │
│                                                     │
│  ETAPA 4: LANÇAMENTO (AMANHÃ)                     │
│  ├─ [TODO] Teste de carga (simular 10 usuários)   │
│  ├─ [TODO] Validar performance (< 2s por página)  │
│  └─ [TODO] Go-live ✅                             │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 ETAPA 1: CONFIGURAÇÃO ASAAS (Tempo: 15 min)

**Referência:** Ver arquivo `GUIA_ATIVACAO_WEBHOOKS_ASAAS.md`

### Checklist de Ativação:

```
[ ] 1. Acessei painel ASAAS (asaas.com)
[ ] 2. Fui para Configurações > Integrações > Webhooks
[ ] 3. Criei Webhook 1 (Principal de Pagamentos)
      URL: https://[dominio]/api/functions/asaasWebhook?token=[TOKEN]
      Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_REFUNDED
[ ] 4. Criei Webhook 2 (Parceiros)
      URL: https://[dominio]/api/functions/asaasWebhookPartner
      Header: X-Webhook-Token: [TOKEN]
      Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED
[ ] 5. Criei Webhook 3 (Transferências/Comissões)
      URL: https://[dominio]/api/functions/asaasWebhookTransfer
      Header: X-Webhook-Token: [TOKEN]
      Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
[ ] 6. Confirmei que todos 3 webhooks estão com status "ATIVO"
[ ] 7. Testei cada webhook (Logs > Status 200)
[ ] 8. Verifiquei ASAAS_ENV = "production" no Dashboard Base44
[ ] 9. Aguardei 2 minutos para deploy das mudanças
```

---

## 🧪 ETAPA 2: TESTES (Tempo: 20-30 min)

### 2.1 Teste de Pagamento Cliente - PIX

```
1. Acesse: https://[seu-dominio]/Pricing
2. Clique em "Assinar Agora" (Plano Mensal)
3. Preencha CPF: 07367642677
4. Forma de pagamento: PIX
5. Clique "Gerar Pagamento"

Resultado esperado:
✅ QR Code PIX gerado
✅ Pix Copia e Cola exibido
✅ Mensagem: "Aguardando confirmação automática do banco..."
✅ Botão "Já paguei, verificar agora" disponível

Próxima ação:
- OU pague o PIX (R$ 19,90)
- OU clique "Já paguei" e simule webhook no Asaas (Passo 2.5)
```

### 2.2 Teste de Pagamento Parceiro - Boleto

```
1. Acesse: https://[seu-dominio]/PricingPartner
2. Clique em "Assinar Agora" (Plano Anual)
3. Preencha CNPJ: 11222333000181
4. Forma de pagamento: BOLETO
5. Clique "Gerar Pagamento"

Resultado esperado:
✅ Botão "Abrir Boleto" gerado
✅ URL do boleto funciona (abre no Asaas)
✅ Código de barras exibido
```

### 2.3 Teste de Comissão de Afiliado

```
Cenário: Um cliente foi indicado por um afiliado
1. Usuário A (afiliado): niviasibe@gmail.com
2. Usuário B (cliente novo): alguem.novo@teste.com
3. Cliente B usa link de indicação de A ao se registrar
4. Cliente B paga assinatura mensal (R$ 19,90)

Resultado esperado após webhook:
✅ Comissão criada na entidade AffiliateCommission
   - referrer_email: niviasibe@gmail.com
   - commission_value: R$ 10,00
   - status: "confirmada"
✅ Total earned atualizado no perfil de A
✅ Notificação enviada: "Sua comissão de R$ 10,00..."
```

### 2.4 Teste de Webhook Manual (Sem Pagar)

```
Se você NÃO quer pagar, simule o webhook:

1. Painel Asaas > Logs de Webhook
2. Procure por um pagamento recente (pay_...)
3. Clique em "Reenviar" ou "Simular"
4. Defina status como "PAYMENT_RECEIVED"
5. Envie o evento

Resultado esperado:
✅ Base44 logs mostram: "Assinatura ativada:"
✅ Usuário aparece com subscription_type ativada
✅ Comissão status muda para "confirmada"
```

### 2.5 Teste de Emails Automáticos

```
Quando um pagamento é confirmado, devem ser enviados:

1. Email do Asaas (confirmação de pagamento)
2. Email Base44 (notificação de assinatura ativada)
3. Email para afiliado (comissão confirmada)

Checar:
✅ Verifique spam/promotions
✅ Procure por emails com subject:
   - "Seu pagamento foi confirmado"
   - "Assinatura ativada"
   - "Comissão confirmada"
```

---

## 🔒 ETAPA 3: SEGURANÇA & MONITORING (Tempo: 10 min)

### 3.1 Revisar Logs de Segurança

```
Base44 Dashboard > Code > Functions > Logs

Procure por:
✅ "CREATE_PAYMENT: plan=..." (criação de pagamento)
✅ "Cliente obtido:" (cliente/parceiro criado)
✅ "Assinatura criada:" (subscription no Asaas)
✅ "Comissao criada:" (comissão registrada)

Verificar erros:
❌ "Tentativa de pagamento duplicado"
❌ "Tentativa de manipulação de valor"
❌ "CPF/CNPJ obrigatório"
→ Se aparecer, significa que segurança está funcionando!
```

### 3.2 Validar Rate Limiting

```
Testar proteção contra abuso:
1. Faça 5 tentativas de pagamento em 1 minuto
2. Na 6ª tentativa, deve aparecer erro:
   "Você já tem um pagamento pendente. Aguarde..."

✅ Se aparecer = Rate limiting ativo
```

### 3.3 Validar Validação de CPF/CNPJ

```
Testar proteção contra documentos inválidos:
1. Tente fazer checkout com CPF: 00000000000
2. Deve aparecer erro: "CPF/CNPJ obrigatório e válido"

✅ Se aparecer = Validação ativa
```

### 3.4 Configurar Alertas (Opcional)

```
Se usar serviço de monitoramento (ex: Sentry, LogRocket):
1. Configure alertas para:
   - Erros em payment creation
   - Erros em webhook processing
   - Taxa de erro > 1%

Recomendação:
✅ Monitorar diariamente por 7 dias
✅ Depois semanalmente por 30 dias
```

---

## 🚀 ETAPA 4: LANÇAMENTO (Próximas 24h)

### 4.1 Teste de Carga (Simulado)

```
Simular 10 usuários pagando simultaneamente:

1. Crie 10 emails de teste:
   teste1@domain.com até teste10@domain.com

2. Em paralelo, acesse Pricing 10 vezes:
   https://[seu-dominio]/Pricing?user=teste1
   https://[seu-dominio]/Pricing?user=teste2
   ... etc

3. Em cada uma, faça checkout simultaneamente (ou próximo)

Resultado esperado:
✅ Todos os 10 pagamentos são criados
✅ Tempo de resposta < 2 segundos
✅ Nenhum erro 500
✅ Nenhuma comissão duplicada
```

### 4.2 Teste de Performance

```
Validar que o app não fica lento:

1. Dashboard Base44 > Performance
2. Verifique:
   ✅ Latência das functions < 500ms
   ✅ Uptime > 99.9%
   ✅ Database queries < 100ms

Se estiver fora desses limites:
→ Otimizar queries no asaasPayment
→ Adicionar cache em CommissionConfig
```

### 4.3 Backup de Configuração

```
Antes de fazer go-live, salve:

[ ] Screenshot de cada webhook (URL + eventos)
[ ] Valor de ASAAS_WEBHOOK_TOKEN (em lugar seguro)
[ ] Valor de ASAAS_API_KEY (em lugar seguro)
[ ] Lista de planos e preços
[ ] Valores de comissão por tipo de indicação
```

### 4.4 Comunicado de Lançamento

```
Preparar comunicado para:
- Afiliados (podem começar a indicar)
- Clientes (planos disponíveis)
- Suporte (como processar reembolsos, etc)

Template:
"🎉 Sou Brasil está ao vivo!
Clientes podem agora assinar via PIX, Boleto ou Cartão.
Afiliados podem começar a indicar e ganhar comissões.
Suporte: [contato]"
```

---

## 📊 MATRIZ DE TESTES

| Teste | Status | Data | Responsável |
|-------|--------|------|-------------|
| Webhook Configurado | [ ] | — | — |
| Pagamento PIX | [ ] | — | — |
| Pagamento Boleto | [ ] | — | — |
| Pagamento Cartão | [ ] | — | — |
| Comissão Afiliado | [ ] | — | — |
| Webhook Ativo | [ ] | — | — |
| Emails Automáticos | [ ] | — | — |
| Rate Limiting | [ ] | — | — |
| Validação CPF | [ ] | — | — |
| Teste de Carga | [ ] | — | — |

---

## 🎯 ORDEM RECOMENDADA DE EXECUÇÃO

**HOJE (23/03):**
```
09:00 - Ativar webhooks Asaas (GUIA_ATIVACAO_WEBHOOKS_ASAAS.md)
09:15 - Confirmar ASAAS_ENV = production
09:20 - Teste simples: Criar pagamento PIX
09:30 - Teste webhook: Simular confirmação no Asaas
09:45 - Teste comissão: Validar que criou AffiliateCommission
10:00 - Revisar logs de segurança
10:15 - Testes de rate limiting e validação
10:30 - Pronto! ✅
```

**AMANHÃ (24/03):**
```
14:00 - Teste de carga (10 usuários)
14:30 - Validar performance
15:00 - Go-Live (abrir para afiliados)
16:00 - Monitorar logs por 1 hora
```

---

## 📱 CONTATO EM CASO DE ERRO

Se encontrar erro em qualquer passo:

1. **Erro 401 (Unauthorized)** → Ver seção TROUBLESHOOTING no guia de webhooks
2. **Erro 404 (Not Found)** → Verificar domínio do app
3. **Comissão não criada** → Validar referral_code ou referrer_email
4. **Assinatura não ativada** → Verificar ASAAS_ENV e logs do webhook
5. **Email não chegou** → Verificar spam ou integração SendEmail

---

## ✅ CHECKLIST FINAL

```
Antes de considerar PRONTO para produção:

□ Todos os 3 webhooks estão ativos
□ ASAAS_ENV = "production"
□ Pelo menos 1 pagamento processado com sucesso
□ Webhook recebeu notificação e ativou assinatura
□ Comissão foi criada e confirmada
□ Email de confirmação foi enviado
□ Rate limiting está funcionando
□ Validação de CPF está funcionando
□ Teste de carga passou (10 usuários OK)
□ Performance OK (< 2s por página)
□ Logs não mostram nenhum erro crítico
□ Backup de configuração feito
□ Comunicado preparado
```

**Quando TODOS estiverem marcados → PRONTO PARA PRODUÇÃO! 🚀**

---

**Tempo total estimado:** 2-3 horas

**Dúvidas?** Avise em qual passo você está e corrijo na hora!