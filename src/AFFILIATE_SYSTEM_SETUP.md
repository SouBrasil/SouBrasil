# 💰 Sistema de Indicação e Comissionamento Sou Brasil

## Visão Geral

O sistema está totalmente integrado com ASAAS para:
1. **Links de Referência**: Usuários geram links únicos para indicar clientes e parceiros
2. **Rastreamento Automático**: Pagamentos são vinculados ao código de referência
3. **Comissionamento Automático**: Comissões são criadas quando o indicado paga
4. **Transferência Automática**: Dinheiro transferido automaticamente para a conta do afiliado
5. **Dashboard Administrativo**: Controle total de todas as indicações e pagamentos

---

## 🔧 Configuração no ASAAS

### 1. Criar Conta Master (Sou Brasil)
- URL: https://asaas.com
- Email: seu_email@soubrasil.com.br
- Configure chave PIX para receber pagamentos

### 2. Obter API Key
1. Dashboard ASAAS → **Integrações**
2. Gere uma **chave de API** com permissões:
   - `POST /subscriptions` (criar assinaturas)
   - `GET /payments` (consultar pagamentos)
   - `GET /transfers` (consultar transferências)
   - `POST /transfers` (criar transferências)
   - `GET /customers` (buscar clientes)

3. Copie a chave em **Secrets** (Base44 Dashboard):
   - `ASAAS_API_KEY`: sua chave privada
   - `ASAAS_ENV`: `production` ou `sandbox`
   - `ASAAS_WEBHOOK_TOKEN`: gerador aleatório (ex: `webhook_token_abc123xyz`)

---

## 📱 Fluxo do Usuário

### Cliente (Pessoa Física)
```
1. Usuário acessa: /Pricing
2. Clica "Contratar Plano"
3. Se tiver referral_code, compartilha: /OnboardingRegister?ref=SEU_CÓDIGO
4. Indicado se registra via link
5. Indicado contrata plano → Comissão criada (status: pendente)
6. ASAAS confirma pagamento → Comissão move para (status: confirmada)
7. Webhook ASAAS dispara transferência → Comissão move para (status: transferida)
```

### Parceiro Comercial
```
1. Usuário acessa: /ReferralHub ou /AffiliateProgram
2. Clica "Gerar Link de Parceiros"
3. Compartilha: /PartnerSignup?ref=SEU_CÓDIGO
4. Parceiro preenche cadastro (sem login obrigatório)
5. Parceiro é aprovado e contrata plano (mensal/anual)
6. Comissão criada e processada automaticamente
```

---

## 💳 Tabela de Comissões

| Tipo | Plano | Comissão | Obs |
|------|-------|----------|-----|
| Cliente | Mensal (R$ 19,90) | R$ 10,00 | 1ª mensalidade |
| Cliente | Anual (R$ 179,88) | R$ 10,00 | 1ª anuidade |
| Parceiro | Mensal (R$ 299,90) | R$ 100,00 | 1ª mensalidade |
| Parceiro | Anual (R$ 2.500,00) | R$ 200,00 | 1ª anuidade |

---

## 🔄 Processo de Sincronização

### Automação Agendada
- **Função**: `asaasPayment` → `admin_sync_payments`
- **Frequência**: A cada 6 horas
- **O que faz**:
  1. Busca pagamentos com status `PENDING`
  2. Consulta status atual no ASAAS
  3. Se confirmado (RECEIVED/CONFIRMED):
     - Ativa assinatura do usuário
     - Confirma comissão (`status: confirmada`)
     - Atualiza `total_earned` do afiliado

### Webhook ASAAS (Automático)
- **Endpoint**: `/functions/asaasWebhookTransfer`
- **Events**: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`
- **O que faz**:
  1. Recebe notificação de pagamento confirmado
  2. Busca comissões associadas ao pagamento
  3. Atualiza status para `transferida`
  4. Cria transfer automático via ASAAS
  5. Notifica afiliado sobre o pagamento

---

## 🎯 Configurar Split de Pagamento (Opcional)

Para descontar automaticamente a comissão no pagamento ASAAS:

```json
{
  "split": [
    {
      "walletId": "wallet_id_do_afiliado",
      "fixedValue": 10.00  // R$ 10 para cliente
    }
  ]
}
```

**Status**: Implementado em `asaasPayment.js` (linhas 209-217)

---

## 📊 Painel Administrativo

### Menu: Afiliados & Comissões
- **Localização**: AdminPanel → Afiliados & Comissões
- **Funcionalidades**:
  - 📈 Dashboard com estatísticas em tempo real
  - 🏆 Top 5 afiliados
  - 🔍 Busca e filtros avançados
  - 📋 Lista completa de comissões
  - 💾 Exportar dados em CSV

### Métricas Exibidas
- Total em comissões (R$)
- Valores pendentes, confirmados e transferidos
- Número de conversões por afiliado
- Status de carteira ASAAS (ativa/inativa)

---

## 🔐 Segurança

### Validações Implementadas
1. **Token do Webhook**: Verificação em `X-Webhook-Token`
2. **Rate Limiting**: Não implementado (ativar se necessário)
3. **Autenticação**: Apenas admins podem acessar estatísticas
4. **Chaves PIX**: Armazenadas na tabela User (campo `asaas_pix_key`)

### Dados Sensíveis
- ❌ Nunca exponha `ASAAS_API_KEY`
- ❌ Nunca exiba chaves PIX inteiras
- ✅ Use apenas em funções backend
- ✅ Valide todas as requisições

---

## 🐛 Troubleshooting

### "Comissão não aparece"
```
1. Verifique se referrer tem asaas_wallet_id cadastrado
2. Confirme que referral_code foi passado no link
3. Verifique status do pagamento em Payment.asaas_payment_id
4. Sincronize manualmente: AdminPanel → Sincronização de Pagamentos
```

### "Transferência não foi feita"
```
1. Verifique se comissão está em status "confirmada"
2. Confirme dados bancários do afiliado no ASAAS
3. Verifique logs de erro em asaasWebhookTransfer
4. Teste webhook manualmente: curl -X POST http://localhost:8000/functions/asaasWebhookTransfer ...
```

### "Webhook não está sendo acionado"
```
1. Copie endpoint da função Base44
2. Configure em ASAAS → Webhooks:
   - URL: https://seu-app.com/functions/asaasWebhookTransfer
   - Events: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
   - Headers: X-Webhook-Token: seu_token_secreto
3. Teste no ASAAS Dashboard
```

---

## 📌 Checklist de Implementação

- [x] Links de referência funcionando (/ReferralHub)
- [x] Rastreamento de referral_code em pagamentos
- [x] Criação automática de comissões
- [x] Sincronização de status (ASAAS → DB)
- [x] Painel administrativo de afiliados
- [x] Transferências automáticas via webhook
- [ ] Testes em production ASAAS
- [ ] Documentação de API pública
- [ ] Relatórios de recebíveis

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique logs em Base44 Dashboard
2. Consulte status do webhook em ASAAS
3. Revise função `asaasPayment` no código
4. Teste manualmente com dados de sandbox

---

**Última atualização**: 22/03/2026
**Status**: ✅ Totalmente Operacional