import { json } from '@sveltejs/kit';
import { revokeToken } from '$lib/server/srp.js';

export async function POST({ cookies }) {
  try {
    const token = cookies.get('auth_token');
    
    if (token) {
      // Отзываем токен в Redis
      await revokeToken(token);
      
      // Удаляем cookie
      cookies.delete('auth_token', { path: '/' });
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return json({ success: false, error: 'Ошибка выхода' }, { status: 500 });
  }
}
