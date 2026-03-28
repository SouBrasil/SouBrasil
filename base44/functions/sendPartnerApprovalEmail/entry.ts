import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import nodemailer from 'npm:nodemailer@6';

async function buildRawMessage({ from, to, subject, html }) {
  const transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  const info = await transporter.sendMail({ from, to, subject, html });
  const raw = info.message.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return raw;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { type, to, owner_name, business_name, password, portal_url } = body;

  if (!to || !type) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

  // Get sender email
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileRes.json();
  const fromEmail = profile.email || 'noreply@soubrasil.com.br';
  const from = `Sou Brasil <${fromEmail}>`;

  const LOGO = 'https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png';

  let subject, html;

  if (type === 'approval') {
    subject = '🎉 Seu cadastro foi aprovado — Portal Parceiro Sou Brasil!';
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#1a7a3c 0%,#2ecc71 100%);padding:36px 40px;text-align:center;">
          <img src="${LOGO}" alt="Sou Brasil" style="height:56px;margin-bottom:12px;" />
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:800;">Parabéns! Você foi aprovado! 🎉</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Olá, <strong>${owner_name || business_name}</strong>!</p>
          <p style="font-size:15px;color:#555;margin:0 0 24px;">Temos uma ótima notícia: o cadastro de <strong>${business_name}</strong> no <strong>Clube Sou Brasil</strong> foi <span style="color:#1a7a3c;font-weight:700;">aprovado</span>!</p>
          
          <div style="background:#f0f9f4;border:2px solid #a7f3c0;border-radius:12px;padding:24px;margin:0 0 24px;">
            <p style="font-size:14px;color:#333;margin:0 0 12px;font-weight:700;">🔐 Suas credenciais de acesso ao Portal do Parceiro:</p>
            <p style="font-size:14px;color:#555;margin:0 0 8px;">📧 <strong>E-mail:</strong> ${to}</p>
            <p style="font-size:14px;color:#555;margin:0;"><strong>🔑 Senha temporária:</strong> <code style="background:#e8f5e9;padding:4px 10px;border-radius:6px;font-size:15px;color:#1a7a3c;font-weight:700;">${password}</code></p>
          </div>
          
          <p style="font-size:13px;color:#888;margin:0 0 24px;">⚠️ Você será solicitado a criar uma nova senha no primeiro acesso.</p>

          <div style="text-align:center;margin:0 0 24px;">
            <a href="${portal_url}" style="display:inline-block;background:linear-gradient(135deg,#1a7a3c,#2ecc71);color:#fff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
              🚀 Acessar Portal do Parceiro
            </a>
          </div>

          <p style="font-size:13px;color:#999;border-top:1px solid #eee;padding-top:16px;margin:0;">Dúvidas? Entre em contato com nossa equipe. <br>Equipe Sou Brasil 💚</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  } else {
    // revision
    subject = '📝 Ação necessária: Corrija seu cadastro — Sou Brasil';
    html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#d97706 0%,#fbbf24 100%);padding:36px 40px;text-align:center;">
          <img src="${LOGO}" alt="Sou Brasil" style="height:56px;margin-bottom:12px;" />
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:800;">Cadastro em Revisão 📝</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Olá, <strong>${owner_name || business_name}</strong>!</p>
          <p style="font-size:15px;color:#555;margin:0 0 24px;">Seu cadastro de <strong>${business_name}</strong> precisa de alguns ajustes antes de ser aprovado.</p>
          
          <div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:12px;padding:24px;margin:0 0 24px;">
            <p style="font-size:14px;color:#333;margin:0 0 12px;font-weight:700;">🔐 Acesse o portal para corrigir:</p>
            <p style="font-size:14px;color:#555;margin:0 0 8px;">📧 <strong>E-mail:</strong> ${to}</p>
            <p style="font-size:14px;color:#555;margin:0;"><strong>🔑 Senha provisória:</strong> <code style="background:#fef3c7;padding:4px 10px;border-radius:6px;font-size:15px;color:#d97706;font-weight:700;">${password}</code></p>
          </div>

          <div style="text-align:center;margin:0 0 24px;">
            <a href="${portal_url}" style="display:inline-block;background:linear-gradient(135deg,#d97706,#fbbf24);color:#fff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">
              ✏️ Corrigir Meu Cadastro
            </a>
          </div>

          <p style="font-size:13px;color:#999;border-top:1px solid #eee;padding-top:16px;margin:0;">Dúvidas? Entre em contato com nossa equipe. <br>Equipe Sou Brasil 💚</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  const raw = await buildRawMessage({ from, to, subject, html });

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    return Response.json({ error: 'Gmail send failed: ' + err }, { status: 500 });
  }

  return Response.json({ success: true });
});