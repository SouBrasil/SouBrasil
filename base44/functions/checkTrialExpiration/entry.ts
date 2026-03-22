import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Verifica expiração de trials e desativa automaticamente usuários/parceiros inativos
// - Usuários: 7 dias de trial
// - Parceiros: 90 dias de trial
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
      usersDeactivated: 0,
      partnersDeactivated: 0,
      notificationsSeized: 0,
    };

    // ──────────────────────────────────────
    // 1. USUÁRIOS PESSOA FÍSICA — TRIAL 7 DIAS
    // ──────────────────────────────────────
    console.log('🔍 Verificando expiração de trials de usuários...');
    
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 5000);
    
    for (const u of allUsers) {
      // Pula se já está inativo ou tem assinatura paga
      if (!u.active || (u.subscription_type && u.subscription_type !== 'trial' && u.subscription_type !== 'none')) {
        continue;
      }

      // Se tem trial_start_date, calcular expiração
      if (u.trial_start_date) {
        const trialStart = new Date(u.trial_start_date);
        const trialDays = u.trial_days || 7; // Default 7 dias para pessoa física
        const trialExpiration = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

        // Se expirou e não contratou plano pago
        if (now > trialExpiration && (!u.subscription_type || u.subscription_type === 'trial' || u.subscription_type === 'none')) {
          console.log(`⏸️ Desativando usuário: ${u.email} (trial expirou em ${trialExpiration.toISOString()})`);

          // Desativa usuário
          await base44.asServiceRole.entities.User.update(u.id, {
            active: false,
            subscription_type: 'none',
          });

          // Envia notificação
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: u.email,
              subject: '⏸️ Sua conta Sou Brasil foi inativada',
              body: `Olá ${u.full_name || 'cliente'}!\n\nSeu período de teste de 7 dias expirou e você não contratou nenhum plano.\n\nSua conta foi inativada. Para reativar e continuar desfrutando dos descontos exclusivos do Clube Sou Brasil, acesse:\n\n${process.env.BASE44_APP_URL || ''}/Pricing\n\nVocê pode contratar um plano mensal (R$ 19,90) ou anual (R$ 179,88).\n\nAté logo!\n— Equipe Sou Brasil 💚`,
            });
          } catch (e) {
            console.warn(`⚠️ Erro ao enviar email para ${u.email}:`, e.message);
          }

          results.usersDeactivated++;
        }
      }
    }

    // ──────────────────────────────────────
    // 2. PARCEIROS COMERCIAIS — TRIAL 90 DIAS
    // ──────────────────────────────────────
    console.log('🔍 Verificando expiração de trials de parceiros...');
    
    const allPartners = await base44.asServiceRole.entities.Partner.list('-created_date', 5000);
    
    for (const p of allPartners) {
      // Pula se já está inativo ou tem assinatura paga
      if (!p.active || (p.subscription_type && p.subscription_type !== 'none')) {
        continue;
      }

      // Se tem trial_start_date, calcular expiração
      if (p.trial_start_date) {
        const trialStart = new Date(p.trial_start_date);
        const trialDays = p.trial_days || 90; // Default 90 dias para parceiro
        const trialExpiration = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

        // Se expirou e não contratou plano pago
        if (now > trialExpiration && (!p.subscription_type || p.subscription_type === 'none')) {
          console.log(`⏸️ Desativando parceiro: ${p.name} (trial expirou em ${trialExpiration.toISOString()})`);

          // Desativa parceiro
          await base44.asServiceRole.entities.Partner.update(p.id, {
            active: false,
            subscription_type: 'none',
          });

          // Busca email do parceiro via PartnerAccess
          try {
            const access = await base44.asServiceRole.entities.PartnerAccess.filter(
              { partner_id: p.id },
              '-created_date',
              1
            );

            if (access && access.length > 0 && access[0].email) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: access[0].email,
                subject: '⏸️ Sua empresa foi inativada na Sou Brasil',
                body: `Olá ${p.name}!\n\nSeu período gratuito de 90 dias na plataforma Sou Brasil foi encerrado.\n\nComo você não contratou nenhum plano, sua empresa está agora INATIVA e invisível para os clientes.\n\nPara reativar e voltar a receber clientes, escolha um plano:\n\n- Mensal PRO: R$ 300/mês\n- Anual Premium: R$ 3.000/ano (12x R$ 250)\n\nAcesse: ${process.env.BASE44_APP_URL || ''}/PartnerPortal\n\nNão perca mais oportunidades!\n— Equipe Sou Brasil 💚`,
              });
            }
          } catch (e) {
            console.warn(`⚠️ Erro ao enviar email para parceiro ${p.name}:`, e.message);
          }

          results.partnersDeactivated++;
        }
      }
    }

    console.log('✅ Verificação de trials concluída:', results);
    return Response.json({ success: true, results });

  } catch (error) {
    console.error('❌ Check Trial Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});