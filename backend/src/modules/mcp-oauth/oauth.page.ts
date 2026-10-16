import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
const logo = readFileSync(
  join(__dirname, '../../../templates/mcp/logo.png'),
).toString('base64');

export function authorizationPage(
  client: string,
  requestId: string,
  csrf: string,
  error = '',
  scriptNonce = '',
) {
  const invalid = error
    ? ' aria-invalid="true" aria-describedby="authorization-error"'
    : '';
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Đăng nhập và cấp quyền | DKPharma</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #101828; background: #f3f4f6; font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    .page { min-height: 100vh; min-height: 100svh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
    .card { width: 100%; max-width: 448px; padding: 24px; background: #fff; border-radius: 8px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
    .logo { display: block; width: 175px; max-width: 100%; height: auto; margin: 0 auto; padding: 16px; }
    h1 { margin: 0 0 16px; font-size: 24px; line-height: 32px; font-weight: 700; text-align: center; }
    .connection { margin-bottom: 20px; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; font-size: 14px; line-height: 20px; }
    .connection p { margin: 0; overflow-wrap: anywhere; }
    .connection .permissions { margin-top: 8px; color: #6b7280; }
    .field { display: grid; gap: 8px; }
    label { font-size: 14px; line-height: 14px; font-weight: 500; }
    input { width: 100%; min-width: 0; margin: 0 0 16px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; color: inherit; font: inherit; }
    input::placeholder { color: #6b7280; }
    input:focus-visible { outline: 2px solid #9ca3af; outline-offset: 2px; }
    input[aria-invalid="true"] { border-color: #dc2626; }
    .password-field { position: relative; }
    .password-field input { padding-right: 44px; }
    button { cursor: pointer; font-family: inherit; }
    .password-toggle { position: absolute; top: 5px; right: 4px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 4px; border: 0; border-radius: 4px; background: transparent; color: #101828; }
    .password-toggle:hover { background: #f3f4f6; }
    .password-toggle svg { width: 24px; height: 24px; }
    [hidden] { display: none !important; }
    button:focus-visible { outline: 3px solid #9ca3af; outline-offset: 2px; }
    .actions { display: grid; gap: 8px; }
    .action { display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 40px; padding: 8px 24px; border: 1px solid transparent; border-radius: 6px; font-size: 14px; line-height: 20px; font-weight: 500; transition: background-color .15s; }
    .allow { background: #101828; color: #f9fafb; }
    .allow:hover { background: #28303f; }
    .deny { background: #fff; color: #101828; border-color: #e5e7eb; }
    .deny:hover { background: #f3f4f6; }
    .error { margin: 0 0 16px; padding: 12px; border: 1px solid #fecaca; border-radius: 6px; background: #fef2f2; color: #b91c1c; font-size: 14px; line-height: 20px; overflow-wrap: anywhere; }
    .footer { margin: 16px 0 0; color: #6b7280; text-align: center; font-size: 14px; line-height: 20px; }
    .footer p { margin: 0; }
    .footer p + p { margin-top: 8px; }
    @media (max-width: 360px) { .card { padding: 20px; } h1 { font-size: 22px; } }
    @media (prefers-reduced-motion: reduce) { .action { transition: none; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="card" aria-labelledby="login-title">
      <img class="logo" width="175" height="75" alt="DKPharma" src="data:image/png;base64,${logo}">
      <h1 id="login-title">Đăng Nhập Vào DKPharma</h1>
      <div class="connection">
        <p>Đăng nhập để kết nối <strong>${escape(client)}</strong>.</p>
        <p class="permissions">Ứng dụng được đọc dữ liệu theo quyền tài khoản HRM của bạn.</p>
      </div>
      ${error ? `<p id="authorization-error" role="alert" class="error">${escape(error)}</p>` : ''}
      <form method="post" action="/oauth/authorize">
        <input type="hidden" name="request_id" value="${escape(requestId)}">
        <input type="hidden" name="csrf" value="${escape(csrf)}">
        <div class="field">
          <label for="username">Username</label>
          <input id="username" name="username" aria-label="Tên đăng nhập HRM" placeholder="Username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="255" required${invalid}>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="password-field">
            <input id="password" name="password" aria-label="Mật khẩu" placeholder="Password" type="password" autocomplete="current-password" maxlength="1024" required${invalid}>
            <button class="password-toggle" id="password-toggle" type="button" aria-label="Hiện mật khẩu" aria-controls="password" aria-pressed="false" hidden>
              <svg id="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
              <svg id="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden><path d="m2 2 20 20M10.58 10.59a2 2 0 0 0 2.83 2.82M9.88 5.09A10.9 10.9 0 0 1 12 5c5 0 9 7 9 7a15.7 15.7 0 0 1-3.31 3.73M6.61 6.61A16.4 16.4 0 0 0 3 12s4 7 9 7a10.7 10.7 0 0 0 5.39-1.61"/></svg>
            </button>
          </div>
        </div>
        <div class="actions">
          <button class="action allow" type="submit" name="decision" value="allow">Đăng nhập và cấp quyền</button>
          <button class="action deny" type="submit" name="decision" value="deny" formnovalidate>Từ chối</button>
        </div>
      </form>
      <div class="footer">
        <p>Ứng dụng kết nối không nhận mật khẩu HRM của bạn.</p>
        <p>Bạn có thể thu hồi quyền truy cập trong Hồ sơ cá nhân.</p>
      </div>
    </section>
  </main>
  ${
    scriptNonce
      ? `<script nonce="${escape(scriptNonce)}">
    (() => {
    const password = document.getElementById('password');
    const toggle = document.getElementById('password-toggle');
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      toggle.setAttribute('aria-pressed', String(show));
      document.getElementById('eye-open').style.display = show ? 'none' : '';
      document.getElementById('eye-closed').toggleAttribute('hidden', !show);
    });
    })();
  </script>`
      : ''
  }
</body>
</html>`;
}
