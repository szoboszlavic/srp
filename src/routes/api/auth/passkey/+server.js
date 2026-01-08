import { json } from '@sveltejs/kit';
import { generatePasskeyRegistrationOptions, verifyPasskeyRegistration, getUserPasskeys, deletePasskey } from '$lib/server/passkey.js';

// GET - получить список passkeys пользователя
export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }
  
  const passkeys = await getUserPasskeys(locals.user.username);
  
  // Возвращаем безопасную информацию (без ключей)
  const safePasskeys = passkeys.map(p => ({
    id: p.credentialID,
    deviceType: p.deviceType,
    backedUp: p.backedUp,
    createdAt: p.createdAt
  }));
  
  return json({ passkeys: safePasskeys });
}

// POST - начать регистрацию нового passkey
export async function POST({ locals, request }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }
  
  try {
    const origin = request.headers.get('origin') || request.headers.get('referer');
    const options = await generatePasskeyRegistrationOptions(locals.user.username, origin);
    return json({ options });
  } catch (error) {
    console.error('Passkey registration options error:', error);
    return json({ error: 'Ошибка генерации опций' }, { status: 500 });
  }
}

// DELETE - удалить passkey
export async function DELETE({ request, locals }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }
  
  const { credentialID } = await request.json();
  
  if (!credentialID) {
    return json({ error: 'Не указан ID passkey' }, { status: 400 });
  }
  
  await deletePasskey(locals.user.username, credentialID);
  
  const passkeys = await getUserPasskeys(locals.user.username);
  const safePasskeys = passkeys.map(p => ({
    id: p.credentialID,
    deviceType: p.deviceType,
    backedUp: p.backedUp,
    createdAt: p.createdAt
  }));
  
  return json({ success: true, passkeys: safePasskeys });
}
