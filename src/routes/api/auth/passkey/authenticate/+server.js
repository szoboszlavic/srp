import { json } from '@sveltejs/kit';
import { generatePasskeyAuthenticationOptions } from '$lib/server/passkey.js';

export async function POST({ request }) {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return json({ error: 'Не указано имя пользователя' }, { status: 400 });
    }
    
    const origin = request.headers.get('origin') || request.headers.get('referer');
    const result = await generatePasskeyAuthenticationOptions(username, origin);
    
    if (result.error) {
      return json({ error: result.error }, { status: 400 });
    }
    
    return json({ options: result.options });
  } catch (error) {
    console.error('Passkey auth options error:', error);
    return json({ error: 'Ошибка генерации опций' }, { status: 500 });
  }
}
