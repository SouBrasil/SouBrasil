import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Verifica expiração de assinaturas pagas e bloqueia automaticamente
// - Se subscription_expires_at já passou e não há renovação → bloqueado
// - Usuários e Parceiros são bloqueados (active: false)
// Executa a cada 1 hora via automação

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const results = {
      usersBlocked: 0,
      partnersBlocked: 0,
      notificationsSent: 0,
    };

    // ──────────────────────────────────────
    // 1. USUÁRIOS COM ASSINATURA EXPIRADA
    // ──────────────────────────────────────
    console.log('🔍 Verificando assinaturas expiradas de usuários...');
    
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 5000);
    
    for (const u of allUsers) {
      // Verifica se tem assinatura paga e expirada
      if (!u.subscription_expires_at || !u.subscription_type || u.subscription_type === 'trial' || u.subscription_type === 'none') {
        continue;
      }

      const expiresAt = new Date(u.subscription_expires_at);
      
      // Se expirou
      if (now > expiresAt) {
        // Verifica se há novo pagamento confirmado após a expiração
        const recentPayments = await base44.asServiceRole.entities.Payment.filter(
          { user_email: u.email },
          '-created_date',
          5
        );
        const hasNewPayment = recentPayments && recentPayments.some(p =>
          ['RECEIVED', 'CONFIRMED'].includes(p.status) &&
          new Date(p.created_date) > expiresAt
        );

        // Se não há novo pagamento, bloqueia
        if (!hasNewPayment) {
          console.log(`🔒 Bloqueando usuário: ${u.email} (assinatura expirou em ${expiresAt.toISOString()})`);

          await base44.asServiceRole.entities.User.update(u.id, {
            active: false,
            subscription_type: 'none',
          });

          // Notifica usuário
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: u.email,
              subject: '⏰ Sua assinatura Sou Brasil expirou',
              body: `Olá ${u.full_name || 'cliente'}!\n\nSua assinatura expirou em ${expiresAt.toLocaleDateString('pt-BR')}.\n\nSua conta foi temporariamente bloqueada. Para continuar desfrutando dos descontos exclusivos, renove seu plano:\n\n${process.env.BASE44_APP_URL || ''}/Pricing\n\n- Mensal Pró: R$ 19,90\n- Anual Premium: R$ 179,88\n\nAte logo!\n— Equipe Sou Brasil 💚`,
            });
          } catch (e) {
            console.warn(`⚠️ Erro ao notificar usuário ${u.email}:`, e.message);
          }

          results.usersBlocked++;
        }
      }
    }

    // ──────────────────────────────────────
    // 2. PARCEIROS COM ASSINATURA EXPIRADA
    // ──────────────────────────────────────
    console.log('🔍 Verificando assinaturas expiradas de parceiros...');
    
    const allPartners = await base44.asServiceRole.entities.Partner.list('-created_date', 5000);
    
    for (const p of allPartners) {
      // Verifica se tem assinatura paga e expirada
      if (!p.subscription_expires_at || !p.subscription_type || p.subscription_type === 'none') {
        continue;
      }

      const expiresAt = new Date(p.subscription_expires_at);
      
      // Se expirou
      if (now > expiresAt) {
        // Busca PartnerAccess para encontrar email do parceiro
        const partnerAccessList = await base44.asServiceRole.entities.PartnerAccess.filter({ partner_id: p.id }, '-created_date', 1);
        const partnerEmail = partnerAccessList.length > 0 ? partnerAccessList[0].email : null;

        // Verifica se há novo pagamento confirmado após a expiração
        let hasNewPayment = false;
        if (partnerEmail) {
          const recentPartnerPayments = await base44.asServiceRole.entities.Payment.filter(
            { user_email: partnerEmail },
            '-created_date',
            5
          );
          hasNewPayment = recentPartnerPayments && recentPartnerPayments.some(pay =>
            ['RECEIVED', 'CONFIRMED'].includes(pay.status) &&
            new Date(pay.created_date) > expiresAt
          );
        }

        // Se não há novo pagamento, bloqueia
        if (!hasNewPayment) {
          console.log(`🔒 Bloqueando parceiro: ${p.name} (assinatura expirou em ${expiresAt.toISOString()})`);

          await base44.asServiceRole.entities.Partner.update(p.id, {
            active: false,
            subscription_type: 'none',
          });

          // Busca email e notifica
          try {
            const access = await base44.asServiceRole.entities.PartnerAccess.filter(
              { partner_id: p.id },
              '-created_date',
              1
            );

            if (access && access.length > 0 && access[0].email) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: access[0].email,
                subject: '⏰ Sua assinatura Sou Brasil expirou',
                body: `Olá ${p.name}!\n\nSua assinatura expirou em ${expiresAt.toLocaleDateString('pt-BR')}.\n\nSua empresa foi bloqueada e está INVISÍVEL para os clientes. Renove agora para continuar recebendo clientes:\n\n${process.env.BASE44_APP_URL || ''}/PartnerPortal\n\n- Mensal PRO: R$ 300/mês\n- Anual Premium: R$ 3.000/ano (12x R$ 250)\n\nNão perca mais oportunidades!\n— Equipe Sou Brasil 💚`,
              });
            }
          } catch (e) {
            console.warn(`⚠️ Erro ao notificar parceiro ${p.name}:`, e.message);
          }

          results.partnersBlocked++;
        }
      }
    }

    console.log('✅ Verificação de assinaturas concluída:', results);
    return Response.json({ success: true, results });

  } catch (error) {
    console.error('❌ Check Subscription Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});