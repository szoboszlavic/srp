import { json } from '@sveltejs/kit';
import { verifyPasskeyRegistration } from '$lib/server/passkey.js';

export async function POST({ request, locals, url }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }
  
  try {
    const response = await request.json();
    
    // Получаем origin из заголовка или из URL запроса
    let origin = request.headers.get('origin');
    
    if (!origin) {
      // Fallback: строим origin из URL запроса
      origin = `${url.protocol}//${url.host}`;
    }
    
    console.log('Passkey verify - origin:', origin);
    
    const result = await verifyPasskeyRegistration(locals.user.username, response, origin);
    
    if (!result.success) {
      console.error('Passkey verification failed:', result.error);
      return json({ success: false, error: result.error }, { status: 400 });
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Passkey verify error:', error);
    return json({ error: 'Ошибка верификации' }, { status: 500 });
  }
}
