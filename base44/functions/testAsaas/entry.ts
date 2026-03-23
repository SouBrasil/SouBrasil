import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    console.log('testAsaas: iniciando');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('testAsaas: user=', user?.email);
    const body = await req.json().catch(() => ({}));
    console.log('testAsaas: body=', JSON.stringify(body));
    return Response.json({ ok: true, user: user?.email, body });
  } catch (err) {
    console.error('testAsaas error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});