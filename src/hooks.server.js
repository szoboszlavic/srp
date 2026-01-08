import { verifyToken, updateSessionActivity } from '$lib/server/srp.js';

/**
 * Handle hook для SvelteKit
 * - Проверяет JWT токен из cookie
 * - Устанавливает locals.user для аутентифицированных пользователей
 * - Обновляет активность сессии
 */
export async function handle({ event, resolve }) {
  // Получаем токен из cookie
  const token = event.cookies.get('auth_token');
  
  if (token) {
    const { valid, payload } = await verifyToken(token);
    
    if (valid && payload) {
      event.locals.user = {
        username: payload.username
      };
      
      // Обновляем активность сессии (асинхронно, не блокируя ответ)
      const ip = event.getClientAddress();
      const userAgent = event.request.headers.get('user-agent');
      
      // Не ждем завершения, чтобы не замедлять ответ
      updateSessionActivity(token, ip, userAgent).catch(err => 
        console.error('Failed to update session activity:', err)
      );
    } else {
      // Токен невалидный, удаляем cookie
      event.cookies.delete('auth_token', { path: '/' });
    }
  }
  
  // Разрешаем запрос и получаем ответ с CSP headers
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html
  });
  
  return response;
}
