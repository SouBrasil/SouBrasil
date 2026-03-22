// Subscription helper utilities
export function getSubscriptionStatus(user) {
  if (!user) return { active: false, type: null, daysLeft: 0, isTrial: false, isAnnual: false };

  const trialStartDate = user.trial_start_date ? new Date(user.trial_start_date) : null;
  const subscriptionType = user.subscription_type || null;
  const subscriptionExpiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const subscriptionDate = user.subscription_date ? new Date(user.subscription_date) : null;

  // Tipos anuais
  const annualTypes = ['annual', 'premium_anual', 'partner_annual'];
  // Tipos mensais
  const monthlyTypes = ['monthly', 'premium_mensal', 'partner_monthly'];
  // Todos os tipos pagos
  const paidTypes = [...annualTypes, ...monthlyTypes];

  // Check if user has a paid subscription
  if (subscriptionType && paidTypes.includes(subscriptionType)) {
    const now = new Date();
    let expiry;

    if (subscriptionExpiresAt) {
      // Nova lógica: usa subscription_expires_at diretamente
      expiry = subscriptionExpiresAt;
    } else if (subscriptionDate) {
      // Legado: calcula pela subscription_date
      expiry = new Date(subscriptionDate);
      if (annualTypes.includes(subscriptionType)) {
        expiry.setFullYear(expiry.getFullYear() + 1);
      } else {
        expiry.setMonth(expiry.getMonth() + 1);
      }
    } else {
      expiry = now; // sem data, considera expirado
    }

    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    const isAnnual = annualTypes.includes(subscriptionType);

    return {
      active: daysLeft > 0,
      type: subscriptionType,
      daysLeft: Math.max(0, daysLeft),
      isTrial: false,
      isAnnual,
      expiryDate: expiry,
    };
  }

  // Check trial
  if (trialStartDate) {
    const now = new Date();
    const trialEnd = new Date(trialStartDate);
    trialEnd.setDate(trialEnd.getDate() + 7);
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return {
      active: daysLeft > 0,
      type: 'trial',
      daysLeft: Math.max(0, daysLeft),
      isTrial: true,
      isAnnual: false,
      expiryDate: trialEnd,
    };
  }

  return { active: false, type: null, daysLeft: 0, isTrial: false, isAnnual: false };
}