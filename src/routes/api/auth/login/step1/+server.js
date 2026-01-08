import { json } from '@sveltejs/kit';
import { createServerSession } from '$lib/server/srp.js';

export async function POST({ request }) {
  try {
    const { username, clientPublicEphemeral } = await request.json();
    
    // Валидация
    if (!username || !clientPublicEphemeral) {
      return json({ error: 'Отсутствуют необходимые параметры' }, { status: 400 });
    }
    
    // Создаем серверную сессию SRP
    const sessionData = await createServerSession(username, clientPublicEphemeral);
    
    return json({
      salt: sessionData.salt,
      serverPublicEphemeral: sessionData.serverPublicEphemeral,
      sessionId: sessionData.sessionId
    });
  } catch (error) {
    console.error('Login step1 error:', error);
    return json({ error: 'Ошибка авторизации' }, { status: 500 });
  }
}
