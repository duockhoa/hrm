import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { OAUTH_SCOPES, randomToken } from '../modules/mcp-oauth/oauth.config';

async function main() {
  const args = process.argv.slice(2);
  const values = (flag: string) =>
    args.flatMap((value, index) =>
      value === flag && args[index + 1] ? [args[index + 1]] : [],
    );
  const id = values('--client-id')[0] || 'dkpharma-gemini';
  const name = values('--name')[0] || 'Gemini';
  const redirects = [...new Set(values('--redirect-uri'))];
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(id) ||
    name.length > 255 ||
    !redirects.length
  ) {
    throw new Error(
      'Usage: npm run oauth:client -- --client-id dkpharma-gemini --name Gemini --redirect-uri https://<exact-callback-uri>',
    );
  }
  for (const raw of redirects) {
    const url = new URL(raw);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.hash ||
      !(url.protocol === 'https:' || (loopback && url.protocol === 'http:'))
    )
      throw new Error(
        'Callback must use HTTPS (HTTP is allowed only for loopback). Do not use wildcards or fragments.',
      );
    if (raw.includes('*'))
      throw new Error('Callback URIs must be exact, without wildcards.');
  }
  const prisma = new PrismaClient();
  try {
    const secret = randomToken();
    await prisma.oAuthClients.create({
      data: {
        id,
        name,
        secret_hash: await hash(secret, 12),
        redirect_uris: redirects,
        scopes: OAUTH_SCOPES,
      },
    });
    // The database stores only the hash; the full secret is shown once here.
    process.stdout.write(
      `OAuth client created. Store the secret securely.\nclient_id: ${id}\nclient_secret: ${secret}\nredirect_uris: ${redirects.join(', ')}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  process.stderr.write(
    'Could not create OAuth client. Check arguments, run migrations, and choose a new client ID if it already exists.\n',
  );
  process.exitCode = 1;
});
