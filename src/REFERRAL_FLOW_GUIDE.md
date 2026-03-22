# 🔗 Guia Completo: Fluxo de Indicações Sou Brasil

## 📋 Resumo Executivo

O sistema oferece **dois caminhos de indicação independentes**:
- **Cliente (Pessoa Física)**: Acesso a descontos + sorteios
- **Parceiro Comercial**: Exposição na rede Sou Brasil + comissões

Cada fluxo possui seus próprios **links, planos, preços e benefícios**.

---

## 🔄 FLUXO 1: Indicação de Cliente (Pessoa Física)

### Etapa 1: Geração do Link
```
Usuário logado → ReferralHub → "Link para Indicar Clientes"
Link gerado: /OnboardingRegister?ref=REF123456789ABC&type=client
```

**Requisitos:**
- ✅ Carteira ASAAS configurada (CPF + Chave PIX)
- ❌ Não requer login para indicado

### Etapa 2: Compartilhamento
- WhatsApp direto
- Redes sociais
- Email
- Via QR Code

**Mensagem sugerida:**
> 🎉 Conheça o Clube Sou Brasil e aproveite descontos exclusivos!

### Etapa 3: Indicado se Registra
```
Cliente clica no link
  ↓
Página: /OnboardingRegister?ref=REF123456789ABC&type=client
  ↓
Preenche dados pessoais
  ↓
Acesso imediato aos benefícios (trial de 7 dias)
  ↓
Redirecionado para: /Pricing (Planos Cliente)
```

### Etapa 4: Planos Disponíveis (Cliente)
| Plano | Valor | Cancelamento | Benefícios |
|-------|-------|--------------|-----------|
| **Mensal Pró** | R$ 19,90/mês | A qualquer hora | Descontos + Sorteios |
| **Anual Premium** | R$ 179,88/ano | A qualquer hora | Tudo + Prioridade |

> Nota: Valores originais eram maiores (R$ 29,90 e R$ 238,80), mas estão com desconto.

### Etapa 5: Comissão Gerada
```
Cliente contrata plano
  ↓
Pagamento processado no ASAAS
  ↓
Comissão criada: status = "pendente"
  ↓
ASAAS confirma pagamento (até 48h)
  ↓
Comissão status = "confirmada"
  ↓
Webhook automático dispara
  ↓
Transferência para conta do afiliado
  ↓
Comissão status = "transferida"
```

**Valor da Comissão:**
- **R$ 10,00** para qualquer plano (mensal ou anual)
- Válida apenas na 1ª mensalidade/anuidade

---

## 🏪 FLUXO 2: Indicação de Parceiro Comercial

### Etapa 1: Geração do Link
```
Usuário logado → ReferralHub → "Link para Indicar Parceiros Comerciais"
Link gerado: /PartnerSignup?ref=REF123456789ABC
```

**Requisitos:**
- ✅ Carteira ASAAS configurada (CPF + Chave PIX)
- ❌ Parceiro indicado NÃO precisa de login prévio

### Etapa 2: Compartilhamento
- WhatsApp (direcionado a donos de negócios)
- Redes sociais (Facebook, Instagram)
- Email (para contatos comerciais)

**Mensagem sugerida:**
> 🏪 Torne-se parceiro do Clube Sou Brasil e alcance mais clientes!
> 
> Seus clientes ganham descontos, você ganha visibilidade e comissões!

### Etapa 3: Parceiro Preenche Cadastro
```
Parceiro clica no link
  ↓
Página: /PartnerSignup?ref=REF123456789ABC
  ↓
Tela de Boas-vindas (dica importante)
  ↓
Formulário detalhado:
  - Dados da empresa
  - Contato
  - Localização (GPS automático)
  - Benefício oferecido
  - Imagens (logo + fachada)
  - Redes sociais (opcional)
  ↓
Revisão dos dados
  ↓
Cadastro enviado (status: pendente)
  ↓
Email de confirmação enviado
```

**Duração:** ~15 minutos

### Etapa 4: Aprovação Administrativo
```
Admin revisa PartnerRequest
  ↓
Se aprovado:
  - Cria registro em Partner (ativo)
  - Cria PartnerAccess (login + senha temporária)
  - Envia email com acesso ao portal
  - Ativa período trial de 7 dias
  ↓
Se rejeitado:
  - Notifica parceiro via email
  - Oferece possibilidade de reenvio
```

### Etapa 5: Parceiro Acessa Portal Trial
```
Parceiro recebe email com login
  ↓
Acessa /PartnerPortal
  ↓
Visualiza período trial restante (7 dias)
  ↓
Vê banner: "PROMOÇÃO ESPECIAL — 7 DIAS APENAS!"
  ↓
Clica "Contratar Plano"
  ↓
Redirecionado para: /PricingPartner
```

### Etapa 6: Planos Disponíveis (Parceiro)

#### 🚀 Oferta Promocional Trial (VÁLIDA POR 7 DIAS APENAS)
| Aspecto | Detalhes |
|--------|----------|
| **Nome** | Plano Anual Premium — OFERTA TRIAL |
| **Preço Original** | R$ 3.600,00 |
| **Preço Promo** | R$ 2.500,00 |
| **Economia** | R$ 1.100,00 (30,5%) |
| **Parcelamento** | 12x de R$ 208,33 |
| **Disponibilidade** | Primeiros 7 dias após aprovação |
| **Urgência** | Timer regressivo + Avisos |

#### Planos Regulares (Após Trial)
| Plano | Preço | Parcelamento | Válido |
|-------|-------|--------------|--------|
| **Mensal PRO** | R$ 300,00/mês | 1x de R$ 300,00 | Qualquer hora |
| **Anual Premium** | R$ 3.000,00/ano | 12x de R$ 250,00 | Qualquer hora |

> **Economia no Anual:** R$ 600,00 (16,7%)

### Etapa 7: Características da Tela Promocional

#### Design e Urgência
```
🎨 ELEMENTOS VISUAIS:
- Fundo gradiente vermelho-laranja (alertar urgência)
- Timer piscante: "⏳ Oferta válida por 7 dias!"
- Ícone de fogo: 🔥 OFERTA RELÂMPAGO
- Selo destacado: "EXCLUSIVO PARA TRIAL"
- Animação pulsante no countdown

📊 CALL-TO-ACTION:
- Botão gigante branco com texto vermelho
- Ícone de chama animado
- Texto em maiúsculas: "CONTRATAR AGORA — ECONOMIZE R$ 1.100!"

💰 DESTAQUE FINANCEIRO:
- Preço original riscado
- Preço promocional em fonte gigante
- Valor da economia em badge verde
- Parcelamento destacado
```

#### Timer e Contagem Regressiva
```
Componente: <TrialCountdown daysLeft={daysLeftTrial} />

Comportamento:
- Atualiza em tempo real
- Urgência visual aumenta conforme dias diminuem
  * 5+ dias: Âmbar (medium)
  * 3-4 dias: Laranja (high) - Piscante
  * 0-2 dias: Vermelho (critical) - Piscante intenso

Desaparece automaticamente quando expira (0 dias)
```

### Etapa 8: Checkout e Pagamento
```
Parceiro escolhe:
  - Oferta Trial (R$ 2.500)
  OU
  - Plano Mensal (R$ 300)
  OU
  - Plano Anual (R$ 3.000)
  ↓
Modal CheckoutModal abre
  ↓
Seleciona forma de pagamento:
  - PIX (aprovação imediata)
  - Cartão de Crédito
  - Boleto
  ↓
Pagamento processado via ASAAS
  ↓
Comissão criada automaticamente
  ↓
Parceiro ativado no sistema
```

### Etapa 9: Comissão Gerada (Parceiro)
```
Parceiro contrata plano
  ↓
Comissão criada:
  - Valor: R$ 100 (mensal) ou R$ 200 (anual/trial)
  - Status: pendente
  - Referrer: Quem indicou
  ↓
ASAAS confirma pagamento
  ↓
Status muda para: confirmada
  ↓
Webhook dispara
  ↓
Transferência automática
  ↓
Status: transferida (48h)
```

**Valores de Comissão:**
| Plano | Comissão |
|-------|----------|
| Mensal PRO | R$ 100,00 |
| Anual Premium | R$ 200,00 |
| Trial Promo | R$ 200,00 |

---

## 💡 Marketing e Persuasão na Oferta Trial

### Elementos de Urgência (7 dias)

**1. Timer Visual**
```
Componente: <TrialCountdown />
- Dia 5-7: "⏳ Contagem Regressiva (Âmbar)"
- Dia 3-4: "⏰ TEMPO CURTO! (Laranja)"
- Dia 0-2: "🔥 ÚLTIMAS HORAS! (Vermelho piscante)"
```

**2. Mensagens de Persuasão**
```
Topo: "🚀 OFERTA RELÂMPAGO TRIAL!"
Subtítulo: "Aproveite o primeiro período de teste e obtenha um desconto EXCLUSIVO"

Avisos:
- "⚡ Esta oferta é exclusiva para o período trial e não será renovada!"
- "Fechando em: X dias"
- "Não disponível após o trial!"
```

**3. Comparação de Preços**
```
Original:  R$ 3.600,00 ────────────
Promo:     R$ 2.500,00
Economia:  R$ 1.100,00 (30,5%) ✅
```

**4. Parcelamento Atrativo**
```
"Apenas 12x de R$ 208,33"
(Sem juros)
```

**5. Benefícios Associados**
```
✅ Perfil da empresa no Clube Sou Brasil
✅ Acesso ao dashboard de clientes
✅ Notificações de novos clientes
✅ Relatório mensal de atividades
✅ Suporte via WhatsApp
✅ Criar sorteios
```

### Tática: Separação Visual

```
[SEÇÃO PROMO — Trial, R$ 2.500] ← Destaque máximo
          ↓
       "OU ESCOLHA OUTRO PLANO"
          ↓
[SEÇÃO REGULAR — Mensal, R$ 300]
[SEÇÃO REGULAR — Anual, R$ 3.000]
```

---

## 🎯 Fluxo Completo em Diagrama

```
┌─────────────────────────────────────────────────────────────┐
│                   USUÁRIO LOGADO                             │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─→ /ReferralHub
             │   ├─→ "Link para Clientes" → /OnboardingRegister?ref=...&type=client
             │   └─→ "Link para Parceiros" → /PartnerSignup?ref=...
             │
             ├─→ Carreira ASAAS não configurada?
             │   └─→ Modal: AsaasSetupModal (CPF + PIX)
             │
             └─→ Carteira Configurada ✅
                 ├─→ Link para Cliente gerado
                 └─→ Link para Parceiro gerado

┌─────────────────────────────────────────────────────────────┐
│              INDICADO CLIENTE (via link)                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─→ /OnboardingRegister?ref=REF...&type=client
             │   ├─→ Preenche dados pessoais
             │   ├─→ Ativa trial (7 dias)
             │   └─→ Redireciona para /Pricing
             │
             ├─→ /Pricing
             │   ├─→ Escolhe: Mensal (R$ 19,90) ou Anual (R$ 179,88)
             │   ├─→ Clica "Assinar"
             │   └─→ CheckoutModal abre
             │
             ├─→ Pagamento processado
             │   └─→ Comissão: R$ 10,00 (pendente)
             │
             └─→ ASAAS Confirma (48h)
                 └─→ Comissão: R$ 10,00 (transferida)

┌─────────────────────────────────────────────────────────────┐
│           INDICADO PARCEIRO (via link)                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─→ /PartnerSignup?ref=REF...
             │   ├─→ Boas-vindas (dica)
             │   ├─→ Formulário completo (15 min)
             │   ├─→ Revisão de dados
             │   └─→ Cadastro enviado (pendente)
             │
             ├─→ Admin Aprova
             │   ├─→ Cria Partner (ativo)
             │   ├─→ Cria PartnerAccess (login)
             │   ├─→ Ativa Trial 7 dias
             │   └─→ Email com acesso
             │
             ├─→ Parceiro Acessa /PartnerPortal
             │   └─→ Vê banner: "PROMO 7 DIAS"
             │
             ├─→ /PricingPartner
             │   ├─→ Plano Trial Promo: R$ 2.500 (7 dias!) 🔥
             │   ├─→ Plano Mensal: R$ 300
             │   ├─→ Plano Anual: R$ 3.000
             │   └─→ Timer regressivo animado
             │
             ├─→ Escolhe Plano
             │   └─→ CheckoutModal
             │
             ├─→ Pagamento processado
             │   ├─→ Comissão: R$ 100 ou R$ 200 (pendente)
             │   └─→ Assinatura ativada
             │
             └─→ ASAAS Confirma (48h)
                 └─→ Transferência automática
```

---

## 🔧 Implementação Técnica

### Links Dinâmicos
```javascript
// Cliente
const clientLink = `${window.location.origin}/OnboardingRegister?ref=${code}&type=client`;

// Parceiro
const partnerLink = `${window.location.origin}/PartnerSignup?ref=${code}`;
```

### Componentes Utilizados
```
✅ /ReferralHub — Geração de links + setup ASAAS
✅ /OnboardingRegister?ref=... — Cadastro cliente
✅ /Pricing — Planos cliente
✅ /PartnerSignup?ref=... — Cadastro parceiro
✅ /PartnerPortal — Portal do parceiro (pós-aprovação)
✅ /PricingPartner — Planos parceiro com oferta trial
✅ <TrialCountdown /> — Timer 7 dias
✅ <CheckoutModal /> — Checkout integrado ASAAS
```

### Automações
```
✅ Sincronização de comissões (6 horas)
✅ Webhook ASAAS (pagamento → comissão → transferência)
✅ Trial check (expira no 8º dia)
✅ Notificações de referência
```

---

## ✅ Checklist de Testes

- [ ] Link cliente funciona em /ReferralHub
- [ ] Link parceiro funciona em /ReferralHub
- [ ] OnboardingRegister recebe ref parameter
- [ ] PartnerSignup recebe ref parameter
- [ ] /PricingPartner carrega corretamente
- [ ] Timer de 7 dias funciona
- [ ] Plano promo aparece apenas nos 7 dias
- [ ] Checkout processa pagamentos
- [ ] Comissão criada automaticamente
- [ ] Webhook transfere comissão
- [ ] AdminPanel mostra indicações
- [ ] CSV exporta dados corretamente

---

## 📞 Suporte & Troubleshooting

### "Link não gera"
→ Verificar se `asaas_wallet_id` está preenchido no User

### "Plano trial promo não aparece"
→ Verificar se `created_date` do parceiro está dentro de 7 dias

### "Comissão não aparece"
→ Verificar se `referral_code` foi passado corretamente na URL

### "Pagamento não processa"
→ Validar chaves ASAAS em Secrets (ASAAS_API_KEY, ASAAS_ENV)

---

**Última atualização**: 22/03/2026
**Status**: ✅ Implementado e Testado