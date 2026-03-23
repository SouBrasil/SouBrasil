import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────
    // SETUP ASAAS WALLET
    // ──────────────────────────────────────────────────
    if (action === 'setup_asaas_wallet') {
      const { cpf, pix_key, birth_date, cep } = body;

      if (!cpf || !pix_key || !birth_date || !cep) {
        return Response.json({ error: 'Faltam dados obrigatórios' }, { status: 400 });
      }

      const cpfClean = cpf.replace(/\D/g, '');
      const cepClean = cep.replace(/\D/g, '');

      if (cpfClean.length !== 11 || cepClean.length !== 8) {
        return Response.json({ error: 'CPF ou CEP inválidos' }, { status: 400 });
      }

      try {
        // Aqui você faria a chamada à API ASAAS para criar a subconta
        // Por enquanto, apenas salvamos os dados e geramos um ID de carteira
        const walletId = `ASAAS_${user.email.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;

        await base44.auth.updateMe({
          asaas_wallet_id: walletId,
          cpf: cpfClean,
          birth_date: birth_date,
          cep: cepClean,
          pix_key: pix_key.trim(),
        });

        console.log(`✅ Carteira Asaas configurada para ${user.email}`);
        return Response.json({ 
          success: true, 
          wallet_id: walletId,
          message: 'Carteira digital ativada com sucesso!'
        });
      } catch (err) {
        console.error('Erro ao configurar carteira:', err.message);
        return Response.json({ error: 'Erro ao configurar carteira: ' + err.message }, { status: 500 });
      }
    }

    // ──────────────────────────────────────────────────
    // GENERATE REFERRAL CODE
    // ──────────────────────────────────────────────────
    if (action === 'generate_referral_code') {
      // Verifica se já tem código
      if (user.referral_code) {
        return Response.json({ error: 'Código já foi gerado', code: user.referral_code });
      }

      // Gera código único
      const referralCode = `REF${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Atualiza usuário
      await base44.auth.updateMe({
        referral_code: referralCode,
      });

      console.log(`✅ Código de indicação gerado: ${referralCode} para ${user.email}`);
      return Response.json({ success: true, referral_code: referralCode });
    }

    // ──────────────────────────────────────────────────
    // GET MY COMMISSIONS
    // ──────────────────────────────────────────────────
    if (action === 'get_my_commissions') {
      const commissions = await base44.entities.AffiliateCommission.filter(
        { referrer_email: user.email },
        '-created_date',
        100
      );

      const totalEarnings = commissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
      const pendingAmount = commissions
        .filter(c => c.status === 'pendente')
        .reduce((sum, c) => sum + (c.commission_value || 0), 0);
      const confirmedAmount = commissions
        .filter(c => c.status === 'confirmada')
        .reduce((sum, c) => sum + (c.commission_value || 0), 0);
      const transferredAmount = commissions
        .filter(c => c.status === 'transferida')
        .reduce((sum, c) => sum + (c.commission_value || 0), 0);

      return Response.json({
        success: true,
        commissions,
        stats: {
          total: totalEarnings,
          pending: pendingAmount,
          confirmed: confirmedAmount,
          transferred: transferredAmount,
          count: commissions.length,
        },
      });
    }

    // ──────────────────────────────────────────────────
    // ADMIN: GET AFFILIATE STATS
    // ──────────────────────────────────────────────────
    if (action === 'admin_get_affiliate_stats') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const allCommissions = await base44.entities.AffiliateCommission.list('-created_date', 1000);
      const allUsers = await base44.entities.User.list('-created_date', 1000);

      // Agrupa por afiliado
      const affiliateStats = {};
      for (const comm of allCommissions) {
        if (!affiliateStats[comm.referrer_email]) {
          const aff = allUsers.find(u => u.email === comm.referrer_email);
          affiliateStats[comm.referrer_email] = {
            email: comm.referrer_email,
            name: comm.referrer_name,
            total: 0,
            pending: 0,
            confirmed: 0,
            transferred: 0,
            conversions: 0,
            asaasWallet: aff?.asaas_wallet_id ? true : false,
          };
        }
        affiliateStats[comm.referrer_email].total += comm.commission_value || 0;
        affiliateStats[comm.referrer_email].conversions += 1;

        if (comm.status === 'pendente') {
          affiliateStats[comm.referrer_email].pending += comm.commission_value || 0;
        } else if (comm.status === 'confirmada') {
          affiliateStats[comm.referrer_email].confirmed += comm.commission_value || 0;
        } else if (comm.status === 'transferida') {
          affiliateStats[comm.referrer_email].transferred += comm.commission_value || 0;
        }
      }

      const stats = Object.values(affiliateStats).sort((a, b) => b.total - a.total);

      return Response.json({
        success: true,
        affiliates: stats,
        totals: {
          totalPaid: allCommissions.reduce((sum, c) => sum + (c.commission_value || 0), 0),
          pendingAmount: allCommissions
            .filter(c => c.status === 'pendente')
            .reduce((sum, c) => sum + (c.commission_value || 0), 0),
          confirmedAmount: allCommissions
            .filter(c => c.status === 'confirmada')
            .reduce((sum, c) => sum + (c.commission_value || 0), 0),
          transferredAmount: allCommissions
            .filter(c => c.status === 'transferida')
            .reduce((sum, c) => sum + (c.commission_value || 0), 0),
          totalCommissions: allCommissions.length,
          totalAffiliates: stats.length,
        },
      });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Affiliate System Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});