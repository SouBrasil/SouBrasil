# Implementação Completa — Sistema de Pagamento e Comissionamento de Parceiros

**Data:** 22/03/2026  
**Status:** ✅ Todas as correções implementadas

---

## 🔧 Correções Realizadas

### 1. **CheckoutModal — CPF vs CNPJ para Parceiros**
**Problema:** Modal exigia CPF mesmo para parceiros (deveria ser CNPJ)

**Solução:**
- Alterado de `cpf` para `docValue` (genérico)
- Adiciona validação: se `planType === 'partner'` → CNPJ (14 dígitos)
- Se `planType === 'client'` → CPF (11 dígitos)
- Função `formatDoc()` formata ambos corretamente
- Placeholder dinâmico: "00.000.000/0000-00" (parceiro) vs "000.000.000-00" (cliente)

**Código:**
```javascript
const [docValue, setDocValue] = useState(user?.cpf || user?.cnpj || '');

const formatDoc = (v) => {
  const digits = v.replace(/\D/g, '');
  if (planType === 'partner') {
    // CNPJ: 14 dígitos (XX.XXX.XXX/XXXX-XX)
    const cnpj = digits.slice(0, 14);
    return cnpj
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  } else {
    // CPF: 11 dígitos (XXX.XXX.XXX-XX)
    const cpf = digits.slice(0, 11);
    return cpf
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
};
```

---

### 2. **asaasPayment — Aceitar CNPJ para Parceiros**
**Problema:** Função `findOrCreateCustomer` só aceitava CPF

**Solução:**
- Adicionado parâmetro `doc` à função
- Usa `cpf || cnpj` como fallback
- Busca por CPF/CNPJ indistintamente no Asaas
- Compatível com ambos os tipos

**Código:**
```javascript
async function findOrCreateCustomer(user, doc) {
  const docClean = (doc || user.cpf || user.cnpj || '').replace(/\D/g, '');
  
  // 1. Tenta por CPF/CNPJ
  if (docClean) {
    const byDoc = await asaasFetch(`/customers?cpfCnpj=${docClean}`);
    if (byDoc.data?.length > 0) return byDoc.data[0];
  }
  // ... resto da lógica
}

// Na ação 'create_payment':
const userEnriched = { ...user, cpf: cpf || user.cpf, cnpj: cpf || user.cpf };
const customer = await findOrCreateCustomer(userEnriched, cpf);
```

---

### 3. **Referrer Email — Passagem Correta**
**Problema:** `referrer_email` não estava sendo passado do PricingPartner para CheckoutModal

**Solução:**
- PricingPartner agora passa `user.referrer_email` explicitamente
- CheckoutModal envia para `asaasPayment` se existir
- Vale para cliente E parceiro (mesma lógica)

**Código em PricingPartner:**
```javascript
{showCheckout && (
  <CheckoutModal
    plan={selectedPlan}
    planType="partner"
    user={{
      ...partner,
      referrer_email: partner?.referrer_email || null,
    }}
    onClose={(activated) => {
      setShowCheckout(false);
      if (activated) navigate('/PartnerPortal');
    }}
  />
)}
```

**Código em CheckoutModal:**
```javascript
// Se for parceiro ou cliente, inclui referrer_email se existir
if (user?.referrer_email) {
  payload.referrer_email = user.referrer_email;
  console.log(`✅ ${planType === 'partner' ? 'Parceiro' : 'Cliente'} pagando com referrer: ${user.referrer_email}`);
}
```

---

### 4. **Comissionamento de Parceiro = Comissionamento de Cliente**
**Problema:** Parceiros não estavam ganhando comissão como clientes quando eram indicados

**Solução:**
- Mesma regra de `COMMISSION_VALUES` para ambos
- Parceiro recebe comissão se for indicado por outro usuário
- Usa `plan_type` para diferenciar na AffiliateCommission (parceiro vs cliente)
- Bloqueia duplicação: verifica `referrer_email + referred_email` (não só `referred_email`)

**Tabela de Comissão:**
```javascript
const COMMISSION_VALUES = {
  client:  { monthly: 10,  annual: 10  },
  partner: { monthly: 100, annual: 200 },
};
```

**Lógica da Comissão:**
```javascript
if (referrer) {
  const commissionValue = COMMISSION_VALUES[plan_type]?.[plan] || 0;
  if (commissionValue > 0) {
    // Bloqueia renovações (mesma indicação 2x)
    const existingCommissions = await base44.asServiceRole.entities.AffiliateCommission.filter({
      referred_email: user.email,
      referrer_email: referrer.email,  // ← incluir referrer para evitar duplicação
    });
    const alreadyPaid = existingCommissions.some(c =>
      ['confirmada', 'transferida'].includes(c.status)
    );

    if (!alreadyPaid) {
      const userType = plan_type === 'partner' ? 'parceiro' : 'cliente';
      
      await base44.asServiceRole.entities.AffiliateCommission.create({
        referrer_email: referrer.email,
        referred_email: user.email,
        referrer_name: referrer.full_name,
        referred_name: user.full_name,
        user_type: userType,  // 'parceiro' ou 'cliente'
        plan_type: plan,
        commission_value: commissionValue,
        asaas_payment_id: paymentData.asaas_payment_id,
        status: 'pendente',
      });
    }
  }
}
```

---

### 5. **PartnerPortal — Acesso Direto a Planos**
**Já implementado:** Botão "Ver Planos de Parceiro" navega direto para `/PricingPartner` sem pedir novo cadastro.

**Fluxo:**
1. Parceiro no PartnerPortal clica "Ver Planos de Parceiro"
2. Redireciona para `/PricingPartner` (mantém sessão)
3. Seleciona plano
4. Abre CheckoutModal (sem login repetido)
5. Pagamento via Asaas
6. Ativa assinatura

---

### 6. **Link de Indicação — Comissionamento**
**Já implementado:** Cada parceiro tem `referral_link` único gerado em `PartnerAccess` e visível em PartnerPortal.

**Link de Parceiro (em PartnerPortal):**
```
https://app.com/PartnerSignup?ref=ref_12345678_ABCDEF&type=partner
```

**Link de Usuário (em Home/Pricing):**
```
https://app.com/OnboardingRegister?ref=user_referral_code
```

**Regra de Comissionamento:**
- Parceiro indica outro parceiro → Ganha comissão
- Parceiro indica cliente → Ganha comissão  
- Cliente indica cliente → Ganha comissão
- Cliente indica parceiro → Ganha comissão (futura)

---

## 📊 Fluxo Completo de Pagamento (Parceiro Indicado)

```
1. Parceiro A acessa sistema
   └─ Clica "Indicar" e copia seu link: 
      https://app.com/PartnerSignup?ref=ref_A_XYZABC&type=partner

2. Parceiro A compartilha link com Parceiro B
   └─ Parceiro B clica link

3. Parceiro B é criado com:
   └─ referrer_email: "parceiro.a@email.com"

4. Parceiro B vai para PartnerPortal → "Ver Planos de Parceiro"
   └─ Abre `/PricingPartner`

5. Parceiro B seleciona plano e clica "Contratar"
   └─ CheckoutModal abre com:
   - docValue (CNPJ do Parceiro B)
   - referrer_email ("parceiro.a@email.com")
   - planType: "partner"

6. Parceiro B preenche CNPJ e seleciona forma de pagamento

7. Clica "Gerar Pagamento"
   └─ backend `asaasPayment.create_payment()` é acionado com:
   ```json
   {
     "action": "create_payment",
     "plan": "annual",
     "billing_type": "PIX",
     "cpf": "12345678901234",  // CNPJ de B
     "plan_type": "partner",
     "referrer_email": "parceiro.a@email.com"
   }
   ```

8. Backend executa:
   ├─ Busca/cria customer no Asaas (por CNPJ)
   ├─ Busca Parceiro A por referrer_email
   ├─ Configura split se Parceiro A tem asaas_wallet_id
   ├─ Cria subscription no Asaas
   └─ Cria AffiliateCommission (status: pendente)
       - commission_value: R$ 200 (partner annual)

9. Usuário vê QR Code PIX
   └─ Paga via Pix

10. Asaas envia webhook → asaasWebhook()
    ├─ Payment.status → RECEIVED
    └─ Ativa assinatura do Parceiro B

11. Backend `check_status()` é acionado
    ├─ Ativa subscription do Parceiro B
    ├─ AffiliateCommission.status → confirmada
    └─ Atualiza User.total_earned do Parceiro A (+R$ 200)

12. Sucesso! ✅
    ├─ Parceiro A: R$ 200 em comissão
    └─ Parceiro B: Acesso ao portal com plano ativo
```

---

## 🎯 Checklist Final

### CheckoutModal
- [x] CPF/CNPJ dinâmico baseado em planType
- [x] Formatação correta (11 dígitos vs 14 dígitos)
- [x] Placeholder dinâmico
- [x] Validação dinâmica ("Informe seu CNPJ/CPF")
- [x] Passa `referrer_email` para backend

### asaasPayment
- [x] Aceita CNPJ via parâmetro `doc`
- [x] Busca customer por CNPJ indistintamente
- [x] Cria AffiliateCommission para parceiros indicados
- [x] Usa mesma lógica de comissão (client/partner)
- [x] Bloqueia renovações por referrer

### PricingPartner
- [x] Passa `user.referrer_email` ao CheckoutModal
- [x] Sem novo cadastro (reutiliza sessão)
- [x] Mostra planos mesmo em trial

### PartnerPortal
- [x] Botão "Ver Planos de Parceiro" direto para `/PricingPartner`
- [x] Link de indicação único por parceiro
- [x] Mostra comissões ganhas (AffiliateCommission)

### Comissionamento
- [x] Parceiro recebe comissão como cliente
- [x] Mesma tabela COMMISSION_VALUES
- [x] Bloqueia duplicação por (referrer + referred)
- [x] Atualiza total_earned ao confirmar
- [x] Notifica parceiro sobre comissão

---

## 📝 Próximas Melhorias (Opcionais)

1. **Dashboard de Comissões** — Parceiro vê todas as comissões em tempo real
2. **Payout Automático** — Transferir comissão para wallet Asaas quando atinge limiar
3. **Relatório CSV** — Exportar histórico de comissões
4. **SMS Notification** — Notificar por SMS quando parceiro ganha comissão
5. **Histórico de Indicações** — Mostrar quem foi indicado por quem

---

## 🚀 Deployment

Todas as mudanças foram feitas e estão prontas para produção:

✅ CheckoutModal — CPF/CNPJ dinâmico  
✅ asaasPayment — Aceita CNPJ + Comissionamento de parceiro  
✅ PricingPartner — Passa referrer_email  
✅ PartnerPortal — Acesso direto a planos  
✅ AdminPanelPayments — Sincronização automática (já implementado)  

**Nenhuma mudança no banco de dados** — Usa campos existentes

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs em `functions/asaasPayment`
2. Confirme que `ASAAS_API_KEY` está configurada
3. Teste webhook em `functions/asaasWebhook`
4. Verifique se customer foi criado no Asaas (por CNPJ)