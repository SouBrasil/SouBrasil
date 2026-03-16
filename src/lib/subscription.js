// Subscription helper utilities
export function getSubscriptionStatus(user) {
  if (!user) return { active: false, type: null, daysLeft: 0, isTrial: false };

  const trialStartDate = user.trial_start_date ? new Date(user.trial_start_date) : null;
  const subscriptionType = user.subscription_type || null; // 'monthly' | 'annual' | null
  const subscriptionDate = user.subscription_date ? new Date(user.subscription_date) : null;

  // Check if user has a paid subscription
  if (subscriptionType && subscriptionDate) {
    const now = new Date();
    const expiry = new Date(subscriptionDate);
    if (subscriptionType === 'monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (subscriptionType === 'annual') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    }
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return {
      active: daysLeft > 0,
      type: subscriptionType,
      daysLeft: Math.max(0, daysLeft),
      isTrial: false,
      expiryDate: expiry
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
      expiryDate: trialEnd
    };
  }

  return { active: false, type: null, daysLeft: 0, isTrial: false };
}