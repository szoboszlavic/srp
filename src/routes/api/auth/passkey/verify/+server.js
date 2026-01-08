import { json } from '@sveltejs/kit';
import { verifyPasskeyRegistration } from '$lib/server/passkey.js';

export async function POST({ request, locals }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }
  
  try {
    const response = await request.json();
    const origin = request.headers.get('origin') || request.headers.get('referer');
    
    const result = await verifyPasskeyRegistration(locals.user.username, response, origin);
    
    if (!result.success) {
      return json({ success: false, error: result.error }, { status: 400 });
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Passkey verify error:', error);
    return json({ error: 'Ошибка верификации' }, { status: 500 });
  }
}
