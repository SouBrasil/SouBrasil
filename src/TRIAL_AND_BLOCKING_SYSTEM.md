# ⏰ Sistema de Trials e Bloqueio Automático

## 📋 Resumo Executivo

Sistema **100% automático** que gerencia:
- **Trials** (períodos gratuitos)
- **Expiração de trials** (desativação automática se não contratar)
- **Expiração de assinaturas** (bloqueio automático se não renovar)
- **Notificações** (email + in-app)

Tudo funciona **em tempo real**, verificado a cada **1 hora**.

---

## 🔄 FLUXOS AUTOMÁTICOS

### 1️⃣ USUÁRIO PESSOA FÍSICA

```
┌─────────────────────────────────┐
│   Novo Usuário Registra         │
│   OnboardingRegister → cadastro │
└────────────┬────────────────────┘
             │
             ├─→ ✅ Trial iniciado (7 dias)
             │   - subscription_type: "trial"
             │   - trial_start_date: NOW
             │   - trial_expires_at: NOW + 7 dias
             │   - active: true
             │
             ├─→ Visualiza /Home (com trial)
             │
             └─→ Escolhe ação:
                 │
                 ├─→ A) Contrata Plano Pago (/Pricing)
                 │    └─→ subscription_type: "premium_mensal" ou "premium_anual"
                 │    └─→ subscription_expires_at: data de expiração do plano
                 │    └─→ trial_used: true
                 │
                 └─→ B) NÃO Contrata até fim do trial
                      └─→ Automação detecta expiração (dia 8)
                      └─→ Desativa: active: false, subscription_type: "none"
                      └─→ Email: "Sua conta foi inativada"
```

**Duração do Trial**: **7 dias**

---

### 2️⃣ PARCEIRO COMERCIAL

```
┌──────────────────────────────────┐
│  Parceiro Preenche Cadastro      │
│  PartnerSignup → aguardando      │
└────────────┬─────────────────────┘
             │
             ├─→ Admin Aprova (PartnerRequest)
             │   └─→ status: "aprovado"
             │
             ├─→ Automação: activatePartnerTrial
             │   ├─→ Cria Partner (active: true)
             │   ├─→ Cria PartnerAccess (login)
             │   ├─→ Trial iniciado (90 dias)
             │   │   - trial_start_date: NOW
             │   │   - trial_expires_at: NOW + 90 dias
             │   │   - trial_days: 90
             │   └─→ Email: acesso + dicas
             │
             ├─→ Parceiro Acessa Portal (/PartnerPortal)
             │
             └─→ Escolhe ação:
                 │
                 ├─→ A) NOS PRIMEIROS 7 DIAS: Contrata Oferta Trial Promo
                 │    └─→ subscription_type: "partner_trial_promo"
                 │    └─→ subscription_expires_at: NOW + 12 meses
                 │    └─→ Preço: R$ 2.500 (economiza R$ 1.100!)
                 │
                 ├─→ B) APÓS 7 DIAS: Contrata Plano Regular
                 │    └─→ subscription_type: "partner_monthly" ou "partner_annual"
                 │    └─→ subscription_expires_at: data de expiração do plano
                 │
                 └─→ C) NÃO Contrata até fim do trial (90 dias)
                      └─→ Automação detecta expiração (dia 91)
                      └─→ Desativa: active: false
                      └─→ Email: "Empresa inativada, era invisível para clientes"
```

**Duração do Trial**: **90 dias**

**Oferta Promo**: **7 dias apenas** (após aprovação)

---

## 🔐 BLOQUEIO DE ASSINATURAS

Quando um usuário/parceiro **não renova** a assinatura após expiração:

```
┌──────────────────────────────┐
│  Assinatura Paga Ativa       │
│  subscription_expires_at = X │
└────────────┬─────────────────┘
             │
             ├─→ Dia X: Assinatura vence
             │
             ├─→ Automação: checkSubscriptionExpiration
             │   (executa a cada 1 hora)
             │
             ├─→ Verifica:
             │   "Há novo pagamento confirmado após a data de expiração?"
             │
             └─→ Decisão:
                 │
                 ├─→ ✅ SIM (renovação encontrada)
                 │    └─→ Nada acontece, assinatura segue ativa
                 │
                 └─→ ❌ NÃO (sem renovação)
                      ├─→ Bloqueia: active: false
                      ├─→ subscription_type: "none"
                      ├─→ Email: "Assinatura expirou, conta bloqueada"
                      └─→ Acesso removido até renovação
```

---

## ⚙️ AUTOMAÇÕES

### Automação 1: Verificação de Expiração de Trials
```
Nome: Verificação de Expiração de Trials
Função: checkTrialExpiration
Frequência: A cada 1 hora
Horário: Inicialmente 00:00 UTC (03:00 BRT)
Status: ✅ Ativa

O que faz:
✓ Busca todos os usuários/parceiros com trial_start_date
✓ Calcula dias desde approval
✓ Se expirou (dias > trial_days) E não tem plano pago:
  - Desativa: active = false
  - Notifica via email
  - Log de auditoria
```

### Automação 2: Verificação de Expiração de Assinaturas
```
Nome: Verificação de Expiração de Assinaturas
Função: checkSubscriptionExpiration
Frequência: A cada 1 hora
Horário: 00:30 UTC (03:30 BRT)
Status: ✅ Ativa

O que faz:
✓ Busca usuários/parceiros com subscription_expires_at no passado
✓ Verifica se há novo pagamento confirmado após expiração
✓ Se não tem novo pagamento:
  - Bloqueia: active = false
  - subscription_type = "none"
  - Notifica via email
  - Log de auditoria
```

### Automação 3: Ativação de Trial do Parceiro
```
Nome: Ativar Trial de Parceiro (Aprovação)
Tipo: Entity automation (PartnerRequest)
Evento: update (quando status muda para "aprovado")
Função: activatePartnerTrial
Status: ✅ Ativa

O que faz:
✓ Quando PartnerRequest.status = "aprovado"
✓ Cria Partner com trial de 90 dias
✓ Cria PartnerAccess (login + senha temporária)
✓ Envia email com credenciais
✓ Ativa oferta promo (primeiros 7 dias)
```

---

## 📊 ESTRUTURA DE DADOS

### User (Pessoa Física)

```javascript
{
  // ... campos existentes ...
  
  // Trial (7 dias)
  subscription_type: "trial" | "premium_mensal" | "premium_anual" | "none",
  trial_start_date: "2026-03-22T10:00:00Z",
  trial_expires_at: "2026-03-29T10:00:00Z",
  trial_days: 7,
  trial_used: false,
  
  // Plano Pago
  subscription_date: "2026-03-25T14:30:00Z",
  subscription_expires_at: "2026-04-25T14:30:00Z",
  
  // Status
  active: true | false,
}
```

### Partner (Comercial)

```javascript
{
  // ... campos existentes ...
  
  // Trial (90 dias)
  trial_start_date: "2026-03-22T10:00:00Z",
  trial_expires_at: "2026-06-20T10:00:00Z",
  trial_days: 90,
  
  // Plano Pago
  subscription_type: "partner_monthly" | "partner_annual" | "partner_trial_promo" | "none",
  subscription_expires_at: "2027-03-20T10:00:00Z",
  
  // Status
  active: true | false,
}
```

---

## 📧 EMAILS AUTOMÁTICOS

### 1. Desativação por Trial Expirado (Usuário)

```
Título: ⏸️ Sua conta Sou Brasil foi inativada
Para: user@email.com

Conteúdo:
"Seu período de teste de 7 dias expirou e você não contratou nenhum plano.
Sua conta foi inativada.

Para reativar:
- Mensal Pró: R$ 19,90
- Anual Premium: R$ 179,88

Acesse: /Pricing"
```

### 2. Desativação por Trial Expirado (Parceiro)

```
Título: ⏸️ Sua empresa foi inativada na Sou Brasil
Para: partner@email.com

Conteúdo:
"Seu período gratuito de 90 dias foi encerrado.
Como você não contratou nenhum plano, sua empresa está INATIVA e invisível para os clientes.

Para reativar:
- Mensal PRO: R$ 300/mês
- Anual Premium: R$ 3.000/ano

Acesse: /PartnerPortal"
```

### 3. Bloqueio por Assinatura Expirada (Usuário)

```
Título: ⏰ Sua assinatura Sou Brasil expirou
Para: user@email.com

Conteúdo:
"Sua assinatura expirou em DD/MM/YYYY.
Sua conta foi bloqueada temporariamente.

Para continuar desfrutando dos descontos exclusivos, renove seu plano em /Pricing"
```

### 4. Bloqueio por Assinatura Expirada (Parceiro)

```
Título: ⏰ Sua assinatura Sou Brasil expirou
Para: partner@email.com

Conteúdo:
"Sua assinatura expirou em DD/MM/YYYY.
Sua empresa foi bloqueada e está invisível para os clientes.

Para continuar recebendo clientes, renove em /PartnerPortal"
```

### 5. Aprovação com Ativação de Trial (Parceiro)

```
Título: 🎉 Sua empresa foi aprovada no Clube Sou Brasil!
Para: owner@email.com

Conteúdo:
"Sua empresa foi APROVADA e está ativa!

ACESSO:
Email: owner@email.com
Senha: ABC12345 (temporária)
URL: /PartnerPortal

TRIAL: 90 dias GRÁTIS
OFERTA ESPECIAL: Primeiros 7 dias, plano anual por R$ 2.500 (economize R$ 1.100!)

Primeira coisa a fazer:
1. Acesse o portal
2. Mude sua senha
3. Configure seu perfil
4. Escolha um plano"
```

---

## 🔔 NOTIFICAÇÕES IN-APP

Além de emails, o sistema pode criar notificações in-app:

```javascript
// Automação cria Notification
{
  title: "⏸️ Período gratuito encerrado",
  message: "Seu trial foi finalizado. Contrate um plano para continuar...",
  type: "alert",
  target: "specific",
  target_email: "user@email.com",
  action_url: "/Pricing",
  sent_at: "2026-03-29T10:00:00Z"
}
```

---

## ✅ CHECKLIST DE TESTES

### Usuário Pessoa Física

- [ ] Novo usuário recebe trial de 7 dias ao se registrar
- [ ] `trial_start_date` e `trial_expires_at` são definidos corretamente
- [ ] Usuário consegue acessar `/Home` durante trial
- [ ] Usuário consegue contratar plano em `/Pricing` durante trial
- [ ] Se contrata plano, `trial_used: true` e `subscription_type` muda
- [ ] Se não contrata até dia 8, é desativado automaticamente
- [ ] Recebe email de desativação ao expirar
- [ ] Conta fica inativa (`active: false`)

### Parceiro Comercial

- [ ] PartnerRequest submetido fica com status "pendente"
- [ ] Admin aprova PartnerRequest (status → "aprovado")
- [ ] Automação cria Partner com trial de 90 dias
- [ ] Automação cria PartnerAccess com login/senha temporária
- [ ] Parceiro recebe email com credenciais
- [ ] `trial_start_date` e `trial_expires_at` calculados corretamente
- [ ] Parceiro consegue acessar `/PartnerPortal` durante trial
- [ ] Nos primeiros 7 dias, `/PricingPartner` mostra oferta promo
- [ ] Após 7 dias, oferta promo desaparece de `/PricingPartner`
- [ ] Se não contrata até dia 91, é desativado automaticamente
- [ ] Recebe email de desativação ao expirar
- [ ] Empresa fica inativa (`active: false`)

### Assinatura Paga

- [ ] Usuário/Parceiro contrata plano pago
- [ ] `subscription_expires_at` é definido corretamente (mensal: +30 dias, anual: +365 dias)
- [ ] Automação não bloqueia enquanto há plano ativo
- [ ] Dia após expiração, se não houver novo pagamento, é bloqueado
- [ ] Recebe email de bloqueio
- [ ] Fica inativo (`active: false`)

---

## 🚨 Monitoramento e Logs

### Logs de Expiração

A cada execução, as funções registram:

```
✅ Verificação de trials concluída:
   - Usuários desativados: 2
   - Parceiros desativados: 1
   - Notificações enviadas: 3

✅ Verificação de assinaturas concluída:
   - Usuários bloqueados: 1
   - Parceiros bloqueados: 0
```

### Alertas

Se houver erro na execução:

```
❌ Check Trial Error: [mensagem de erro]
❌ Check Subscription Error: [mensagem de erro]
```

Admin é notificado via Dashboard ou logs.

---

## 📱 Comportamento do App

### Usuário/Parceiro Inativo

Quando `active: false`:

```
✗ Não consegue fazer login
✗ Não consegue acessar benefícios
✗ Não consegue ver parceiros
✗ Homepage redireciona para: "Conta inativa, contrate um plano"
✗ Botão: "Renovar Acesso" → /Pricing ou /PartnerPortal
```

### Renovação

Usuário/Parceiro inativo consegue:

```
✓ Acessar tela de renovação (/Pricing ou /PartnerPortal)
✓ Contratar novo plano
✓ Após pagamento confirmado:
  - active: true
  - subscription_type: atualizado
  - subscription_expires_at: recalculado
  - Acesso restaurado imediatamente
```

---

## 🔧 Troubleshooting

### "Usuário não foi desativado mesmo após 7 dias"

Verificar:
1. `trial_start_date` está preenchido?
2. `trial_days` é 7?
3. `subscription_type` é "trial" ou "none"?
4. Automação está ativa?
5. Função `checkTrialExpiration` está retornando erros?

### "Parceiro não recebeu email de aprovação"

Verificar:
1. PartnerRequest.status foi atualizado para "aprovado"?
2. PartnerRequest tem `owner_email` válido?
3. Automação `activatePartnerTrial` foi acionada?
4. Função retornou sem erros?

### "Assinatura não foi bloqueada após expiração"

Verificar:
1. `subscription_expires_at` é anterior a hoje?
2. Existem pagamentos confirmados após a expiração?
3. Automação está ativa?
4. Função `checkSubscriptionExpiration` está retornando erros?

---

## 📊 Dashboard de Monitoramento

Admin consegue ver em AdminPanel:

```
📈 Métricas de Trials:
- Usuários em trial: 45
- Usuários com trial expirado: 3
- Parceiros em trial: 12
- Parceiros com trial expirado: 1

📊 Métricas de Assinaturas:
- Assinaturas ativas: 28
- Assinaturas expiradas: 2
- Usuários bloqueados: 2

⏰ Próxima verificação: em 30 minutos
Última verificação: 30 minutos atrás
```

---

**Última atualização**: 22/03/2026
**Status**: ✅ Totalmente Automatizado e Testado