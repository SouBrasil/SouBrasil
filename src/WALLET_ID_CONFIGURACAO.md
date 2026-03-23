# 💰 WALLET ID - Configuração
**Data:** 23/03/2026 | **Status:** ✅ Documentado

---

## 🔑 Wallet ID Principal

```
WALLET_ID: be7a2da0-50fd-4994-af6e-c76f66a06a37
Conta: Clube Sou Brasil (Principal)
Função: Receber fundos e transferir comissões
```

---

## 📌 ONDE USAR

### 1. **Transferências Automáticas de Comissões**
Arquivo: `functions/asaasWebhookTransfer`

```javascript
// Quando comissão é confirmada, usa este wallet para:
walletId: 'be7a2da0-50fd-4994-af6e-c76f66a06a37'
// Transferir dinheiro para conta do afiliado
```

### 2. **Split Payment (Dividir Pagamentos)**
Arquivo: `functions/asaasPayment`

```javascript
// Se configurar split no futuro:
splits: [
  {
    walletId: 'be7a2da0-50fd-4994-af6e-c76f66a06a37',
    percentualValue: 95, // 95% para conta principal
  },
  {
    walletId: '[WALLET_OUTRO_PARCEIRO]',
    percentualValue: 5, // 5% para outro
  }
]
```

### 3. **Rastreamento de Fundos**
```javascript
// Saldo dessa wallet:
GET /wallets/be7a2da0-50fd-4994-af6e-c76f66a06a37/balance
```

---

## 🔐 Adicionar como Variável de Ambiente (Opcional)

Se quiser segurança extra, pode adicionar como secret:

**Dashboard > Configurações > Variáveis de Ambiente**

Adicione:
```
ASAAS_WALLET_ID_PRINCIPAL = be7a2da0-50fd-4994-af6e-c76f66a06a37
```

Depois, use no código:
```javascript
const walletId = Deno.env.get('ASAAS_WALLET_ID_PRINCIPAL');
```

---

## 📊 Funções que Usam Este ID

| Função | Uso | Status |
|--------|-----|--------|
| asaasWebhookTransfer | Transferir comissões | ✅ Pronto |
| asaasPayment | Rastrear fundos | ✅ Disponível |
| asaasWallet | Consultar saldo | ✅ Disponível |

---

## ✅ Próximas Ações

- [x] Wallet ID documentado
- [ ] Adicionar como variável de ambiente (opcional)
- [ ] Testar primeira transferência de comissão
- [ ] Validar saldo após pagamentos

---

**Guardado com segurança! Pronto para usar nos webhooks.** 🚀