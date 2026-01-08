import * as srp from 'secure-remote-password/client';

/**
 * Выполняет полный процесс регистрации
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function register(username, password) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: 'Ошибка сети' };
  }
}

/**
 * Выполняет полный процесс SRP аутентификации
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function login(username, password) {
  try {
    // Генерируем клиентские эфемерные значения
    const clientEphemeral = srp.generateEphemeral();
    
    // Шаг 1: Отправляем публичный эфемерный ключ клиента (A)
    const step1Response = await fetch('/api/auth/login/step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        clientPublicEphemeral: clientEphemeral.public 
      })
    });
    
    const step1Data = await step1Response.json();
    
    if (!step1Response.ok) {
      return { success: false, error: step1Data.error || 'Ошибка авторизации' };
    }
    
    // Вычисляем приватный ключ из пароля
    const privateKey = srp.derivePrivateKey(step1Data.salt, username.toLowerCase(), password);
    
    // Вычисляем клиентскую сессию и доказательство M1
    const clientSession = srp.deriveSession(
      clientEphemeral.secret,
      step1Data.serverPublicEphemeral,
      step1Data.salt,
      username.toLowerCase(),
      privateKey
    );
    
    // Шаг 2: Отправляем доказательство M1
    const step2Response = await fetch('/api/auth/login/step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: step1Data.sessionId,
        clientProof: clientSession.proof
      })
    });
    
    const step2Data = await step2Response.json();
    
    if (!step2Data.success) {
      return { success: false, error: step2Data.error || 'Неверные учетные данные' };
    }
    
    // Шаг 3: Проверяем серверное доказательство M2
    try {
      srp.verifySession(clientEphemeral.public, clientSession, step2Data.serverProof);
    } catch {
      return { success: false, error: 'Сервер не прошел проверку подлинности' };
    }
    
    return { 
      success: true, 
      token: step2Data.token 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Ошибка сети' };
  }
}

/**
 * Вспомогательная функция для задержки
 * @param {number} ms 
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Выполняет SRP аутентификацию с отображением прогресса
 * @param {string} username 
 * @param {string} password 
 * @param {(step: number, message?: string) => void} onProgress - Колбэк для обновления прогресса
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function loginWithProgress(username, password, onProgress) {
  try {
    // Шаг 1: Подготовка
    onProgress(1);
    await delay(400);
    
    // Шаг 2: Генерация эфемерных ключей
    onProgress(2);
    const clientEphemeral = srp.generateEphemeral();
    await delay(500);
    
    // Шаг 3: Отправка запроса на сервер
    onProgress(3);
    const step1Response = await fetch('/api/auth/login/step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        clientPublicEphemeral: clientEphemeral.public 
      })
    });
    
    const step1Data = await step1Response.json();
    
    if (!step1Response.ok) {
      return { success: false, error: step1Data.error || 'Ошибка авторизации' };
    }
    
    // Шаг 4: Вычисление приватного ключа
    onProgress(4);
    await delay(400);
    const privateKey = srp.derivePrivateKey(step1Data.salt, username.toLowerCase(), password);
    
    // Шаг 5: Вычисление криптографического доказательства
    onProgress(5);
    await delay(500);
    const clientSession = srp.deriveSession(
      clientEphemeral.secret,
      step1Data.serverPublicEphemeral,
      step1Data.salt,
      username.toLowerCase(),
      privateKey
    );
    
    // Шаг 6: Отправка доказательства
    onProgress(6);
    const step2Response = await fetch('/api/auth/login/step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: step1Data.sessionId,
        clientProof: clientSession.proof
      })
    });
    
    const step2Data = await step2Response.json();
    
    if (!step2Data.success) {
      return { success: false, error: step2Data.error || 'Неверные учетные данные' };
    }
    
    // Шаг 7: Верификация сервера
    onProgress(7);
    await delay(300);
    
    try {
      srp.verifySession(clientEphemeral.public, clientSession, step2Data.serverProof);
    } catch {
      return { success: false, error: 'Сервер не прошел проверку подлинности' };
    }
    
    return { 
      success: true, 
      token: step2Data.token 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Ошибка сети' };
  }
}

/**
 * Получает список активных сессий
 */
export async function getSessions() {
  try {
    const response = await fetch('/api/auth/sessions');
    if (!response.ok) return { sessions: [] };
    const data = await response.json();
    return data;
  } catch {
    return { sessions: [] };
  }
}

/**
 * Отзывает сессию
 * @param {string} sessionId ID сессии (опционально)
 * @param {boolean} allOthers Если true, отзывает все сессии кроме текущей
 */
export async function revokeSession(sessionId, allOthers = false) {
  try {
    const response = await fetch('/api/auth/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, allOthers })
    });
    
    return await response.json();
  } catch {
    return { success: false, error: 'Ошибка сети' };
  }
}

/**
 * Выход из системы
 * @returns {Promise<{success: boolean}>}
 */
export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    return { success: true };
  } catch {
    return { success: false };
  }
}
