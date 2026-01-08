import { json } from '@sveltejs/kit';
import { createVerifier, saveUser } from '$lib/server/srp.js';

export async function POST({ request }) {
  try {
    const { username, password } = await request.json();
    
    // Валидация
    if (!username || !password) {
      return json({ success: false, error: 'Имя пользователя и пароль обязательны' }, { status: 400 });
    }
    
    if (username.length < 3 || username.length > 50) {
      return json({ success: false, error: 'Имя пользователя должно быть от 3 до 50 символов' }, { status: 400 });
    }
    
    if (password.length < 8) {
      return json({ success: false, error: 'Пароль должен быть не менее 8 символов' }, { status: 400 });
    }
    
    // Создаем верификатор SRP
    const { salt, verifier } = await createVerifier(username, password);
    
    // Сохраняем пользователя
    await saveUser(username, salt, verifier);
    
    return json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Пользователь уже существует') {
      return json({ success: false, error: error.message }, { status: 409 });
    }
    
    return json({ success: false, error: 'Ошибка регистрации' }, { status: 500 });
  }
}
