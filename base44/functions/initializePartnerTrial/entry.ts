import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { partner_access_id } = await req.json();

    if (!partner_access_id) {
      return Response.json({ error: 'Missing partner_access_id' }, { status: 400 });
    }

    // Fetch the PartnerAccess record
    const partnerAccesses = await base44.asServiceRole.entities.PartnerAccess.filter({
      id: partner_access_id,
    });

    if (partnerAccesses.length === 0) {
      return Response.json({ error: 'Partner access not found' }, { status: 404 });
    }

    const partnerAccess = partnerAccesses[0];
    const partner_id = partnerAccess.partner_id;

    // Check if partner already has trial initialized
    const partner = await base44.asServiceRole.entities.Partner.filter({
      id: partner_id,
    });

    if (partner.length === 0 || partner[0].trial_start_date) {
      return Response.json({ success: true, message: 'Partner already has trial or not found' });
    }

    // Initialize trial: 90 days from now
    const now = new Date();
    const trial_start_date = now;
    const trial_expires_at = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Update Partner with trial info
    await base44.asServiceRole.entities.Partner.update(partner_id, {
      trial_start_date: trial_start_date.toISOString(),
      trial_expires_at: trial_expires_at.toISOString(),
      trial_days: 90,
      subscription_type: 'none',
    });

    // Update PartnerAccess with trial info
    await base44.asServiceRole.entities.PartnerAccess.update(partnerAccess.id, {
      subscription_type: 'none',
    });

    return Response.json({
      success: true,
      message: 'Partner trial initialized',
      partner_id,
      trial_start_date: trial_start_date.toISOString(),
      trial_expires_at: trial_expires_at.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});