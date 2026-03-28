import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOGO = 'https://media.base44.com/images/public/69b9df54d925438cdfbaf0c3/0a241545b_LogoSouBrasilOficial.png';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, to, owner_name, business_name, password, portal_url } = await req.json();

    let subject, body;

    if (type === 'revision') {
      subject = '📝 Ação necessária: Corrija seu cadastro — Sou Brasil';
      body = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f0;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12)">
  <div style="background:linear-gradient(135deg,#0d3320,#145a32,#1a7a42);padding:32px 24px;text-align:center">
    <img src="${LOGO}" style="height:60px;width:auto;margin-bottom:8px" alt="Sou Brasil"/>
    <br/><span style="color:#f0c040;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">Portal do Parceiro</span>
  </div>
  <div style="background:linear-gradient(135deg,#e65c00,#f9d423);padding:28px 24px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">📝</div>
    <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 8px">Revisão necessária no cadastro</h1>
    <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0">Acesse o portal e faça as correções solicitadas</p>
  </div>
  <div style="padding:32px 24px">
    <p style="color:#1a3a1a;font-size:16px;font-weight:bold;margin:0 0 16px">Olá, ${owner_name || business_name}!</p>
    <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px">
      Nossa equipe revisou seu cadastro e identificou pontos que precisam de correção.
      Utilize as credenciais abaixo para acessar o Portal do Parceiro, realizar as correções e reenviar para análise.
    </p>
    <div style="background:#fff8e1;border:2px solid #f5c400;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 6px;color:#555;font-size:13px;font-weight:bold">⚠️ Acesso Provisório — apenas para edição do cadastro</p>
      <p style="margin:0 0 10px;color:#333;font-size:14px">✉️ <strong>E-mail:</strong> ${to}</p>
      <p style="margin:0;color:#333;font-size:14px">🔑 <strong>Senha provisória:</strong> <span style="font-family:monospace;background:#f0f4f0;padding:2px 8px;border-radius:4px;font-weight:bold">${password}</span></p>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="${portal_url}" style="display:inline-block;background:linear-gradient(135deg,#145a32,#1a7a42);color:#ffffff;font-size:16px;font-weight:bold;padding:14px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(20,90,50,0.4)">
        ACESSAR PORTAL E CORRIGIR
      </a>
    </div>
    <div style="background:#f0f7f0;border-radius:8px;padding:16px">
      <p style="color:#145a32;font-size:13px;margin:0;line-height:1.6">
        <strong>📋 Próximos passos:</strong><br/>
        1️⃣ Acesse o Portal do Parceiro com suas credenciais<br/>
        2️⃣ Revise e corrija as informações do cadastro<br/>
        3️⃣ Salve as alterações e reenvie para análise<br/>
        4️⃣ Aguarde nossa aprovação por e-mail
      </p>
    </div>
  </div>
  <div style="background:#1a5c2a;padding:20px 24px;text-align:center">
    <p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 4px">Equipe <em>Sou Brasil</em> 🇧🇷</p>
    <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0">Porque todo Brasileiro merece Desconto!</p>
  </div>
</div>
</body></html>`;
    } else {
      // type === 'approval' (default)
      subject = '🎉 Seu cadastro foi aprovado — Portal Parceiro Sou Brasil!';
      body = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f0f4f0;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12)">
  <div style="background:linear-gradient(135deg,#0d3320,#145a32,#1a7a42);padding:32px 24px;text-align:center">
    <img src="${LOGO}" style="height:60px;width:auto;margin-bottom:8px" alt="Sou Brasil"/>
    <br/><span style="color:#f0c040;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">Portal do Parceiro</span>
  </div>
  <div style="background:linear-gradient(135deg,#1a7a42,#22a85a);padding:28px 24px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">🎉</div>
    <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px">Seu cadastro foi aprovado!</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0">Bem-vindo ao Portal Parceiro Sou Brasil!</p>
  </div>
  <div style="padding:32px 24px">
    <p style="color:#1a3a1a;font-size:16px;font-weight:bold;margin:0 0 16px">Olá, ${owner_name || business_name}!</p>
    <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 24px">
      Sua solicitação foi <strong style="color:#145a32">APROVADA! 🎊</strong><br/>
      Utilize as credenciais abaixo para fazer login no Portal do Parceiro:
    </p>
    <div style="background:#f8fdf8;border:2px solid #c8e6c9;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 10px;color:#333;font-size:14px">✉️ <strong>E-mail:</strong> ${to}</p>
      <p style="margin:0;color:#333;font-size:14px">🔑 <strong>Senha:</strong> <span style="font-family:monospace;background:#e8f5e9;padding:2px 8px;border-radius:4px;font-weight:bold">${password}</span></p>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="${portal_url}" style="display:inline-block;background:linear-gradient(135deg,#145a32,#1a7a42);color:#ffffff;font-size:16px;font-weight:bold;padding:14px 40px;border-radius:50px;text-decoration:none;box-shadow:0 4px 16px rgba(20,90,50,0.4)">
        ACESSAR PORTAL
      </a>
    </div>
    <p style="color:#666;font-size:13px;text-align:center">Recomendamos trocar a senha no primeiro acesso.</p>
  </div>
  <div style="background:#f8fdf8;border-top:1px solid #e8f5e9;padding:20px 24px;text-align:center">
    <p style="color:#145a32;font-size:15px;font-weight:bold;margin:0 0 4px">Equipe <em>Sou Brasil</em> 🇧🇷</p>
    <p style="color:#666;font-size:12px;margin:0">Porque todo Brasileiro merece Desconto!</p>
  </div>
</div>
</body></html>`;
    }

    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});