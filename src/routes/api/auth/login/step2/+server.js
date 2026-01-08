import { json } from '@sveltejs/kit';
import { verifyClientProof } from '$lib/server/srp.js';

export async function POST({ request, cookies }) {
  try {
    const { sessionId, clientProof } = await request.json();
    
    // Валидация
    if (!sessionId || !clientProof) {
      return json({ success: false, error: 'Отсутствуют необходимые параметры' }, { status: 400 });
    }
    
    // Проверяем клиентское доказательство
    const result = await verifyClientProof(sessionId, clientProof);
    
    if (!result.success) {
      return json({ success: false, error: result.error || 'Неверные учетные данные' }, { status: 401 });
    }
    
    // Устанавливаем httpOnly cookie с токеном
    cookies.set('auth_token', result.token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 дней
    });
    
    return json({
      success: true,
      serverProof: result.serverProof,
      token: result.token
    });
  } catch (error) {
    console.error('Login step2 error:', error);
    return json({ success: false, error: 'Ошибка авторизации' }, { status: 500 });
  }
}
