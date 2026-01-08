import { json } from '@sveltejs/kit';
import { verifyPasskeyAuthentication } from '$lib/server/passkey.js';

export async function POST({ request, cookies }) {
  try {
    const { username, response } = await request.json();
    
    if (!username || !response) {
      return json({ error: 'Отсутствуют необходимые параметры' }, { status: 400 });
    }
    
    const origin = request.headers.get('origin') || request.headers.get('referer');
    const result = await verifyPasskeyAuthentication(username, response, origin);
    
    if (!result.success) {
      return json({ success: false, error: result.error }, { status: 401 });
    }
    
    // Устанавливаем cookie
    cookies.set('auth_token', result.token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    
    return json({ success: true });
  } catch (error) {
    console.error('Passkey auth verify error:', error);
    return json({ error: 'Ошибка аутентификации' }, { status: 500 });
  }
}
