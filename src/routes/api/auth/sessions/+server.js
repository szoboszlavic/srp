import { json } from '@sveltejs/kit';
import { getUserSessions, revokeSession, revokeOtherSessions } from '$lib/server/srp.js';

export async function GET({ cookies, locals }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }
  
  const token = cookies.get('auth_token');
  const sessions = await getUserSessions(locals.user.username, token);
  
  return json({ sessions });
}

export async function DELETE({ request, cookies, locals }) {
  if (!locals.user) {
    return json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { sessionId, allOthers } = await request.json();
  const token = cookies.get('auth_token');

  try {
    if (allOthers) {
      await revokeOtherSessions(locals.user.username, token);
    } else if (sessionId) {
      await revokeSession(sessionId, locals.user.username);
    } else {
      return json({ error: 'Не указан ID сессии' }, { status: 400 });
    }
    
    // Возвращаем обновленный список сессий
    const sessions = await getUserSessions(locals.user.username, token);
    return json({ success: true, sessions });
  } catch (error) {
    console.error('Session revocation error:', error);
    return json({ error: 'Ошибка при отзыве сессии' }, { status: 500 });
  }
}
