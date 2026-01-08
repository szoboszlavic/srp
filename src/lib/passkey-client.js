import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Проверяет, поддерживает ли браузер WebAuthn
 */
export function isPasskeySupported() {
  return window.PublicKeyCredential !== undefined;
}

/**
 * Проверяет, доступна ли платформенная аутентификация (Touch ID, Face ID, Windows Hello)
 */
export async function isPlatformAuthenticatorAvailable() {
  if (!isPasskeySupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Проверяет, подходит ли текущий origin для работы с passkey
 * WebAuthn не работает с IP-адресами, только с доменами (включая localhost)
 */
export function isPasskeyAvailableForOrigin() {
  if (!isPasskeySupported()) return false;
  
  const hostname = window.location.hostname;
  
  // Localhost всегда работает
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  
  // Проверяем, что это не IP-адрес (простая проверка)
  // IP v4: цифры и точки
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IP v6: hex и двоеточия
  const ipv6Pattern = /^[\da-fA-F:]+$/;
  
  if (ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname)) {
    return false;
  }
  
  // Это домен
  return true;
}

/**
 * Получает список passkeys пользователя
 */
export async function getPasskeys() {
  try {
    const response = await fetch('/api/auth/passkey');
    if (!response.ok) return { passkeys: [] };
    return await response.json();
  } catch {
    return { passkeys: [] };
  }
}

/**
 * Регистрирует новый passkey
 */
export async function registerPasskey() {
  try {
    // Шаг 1: Получаем опции с сервера
    const optionsRes = await fetch('/api/auth/passkey', { method: 'POST' });
    
    if (!optionsRes.ok) {
      const error = await optionsRes.json();
      return { success: false, error: error.error || 'Ошибка получения опций' };
    }
    
    const { options } = await optionsRes.json();
    
    // Шаг 2: Запускаем регистрацию в браузере
    let attestationResponse;
    try {
      attestationResponse = await startRegistration({ optionsJSON: options });
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Регистрация отменена' };
      }
      return { success: false, error: 'Ошибка регистрации passkey' };
    }
    
    // Шаг 3: Отправляем ответ на сервер для верификации
    const verifyRes = await fetch('/api/auth/passkey/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attestationResponse)
    });
    
    const result = await verifyRes.json();
    
    if (!result.success) {
      return { success: false, error: result.error || 'Ошибка верификации' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Register passkey error:', error);
    return { success: false, error: 'Ошибка регистрации' };
  }
}

/**
 * Вход по passkey
 * @param {string} username 
 */
export async function loginWithPasskey(username) {
  try {
    // Шаг 1: Получаем опции с сервера
    const optionsRes = await fetch('/api/auth/passkey/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!optionsRes.ok) {
      const error = await optionsRes.json();
      return { success: false, error: error.error || 'Ошибка получения опций' };
    }
    
    const { options } = await optionsRes.json();
    
    // Шаг 2: Запускаем аутентификацию в браузере
    let assertionResponse;
    try {
      assertionResponse = await startAuthentication({ optionsJSON: options });
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Аутентификация отменена' };
      }
      return { success: false, error: 'Ошибка аутентификации passkey' };
    }
    
    // Шаг 3: Отправляем ответ на сервер для верификации
    const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, response: assertionResponse })
    });
    
    const result = await verifyRes.json();
    
    if (!result.success) {
      return { success: false, error: result.error || 'Неверные учетные данные' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Login with passkey error:', error);
    return { success: false, error: 'Ошибка аутентификации' };
  }
}

/**
 * Удаляет passkey
 * @param {string} credentialID 
 */
export async function deletePasskey(credentialID) {
  try {
    const response = await fetch('/api/auth/passkey', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialID })
    });
    
    return await response.json();
  } catch {
    return { success: false, error: 'Ошибка удаления' };
  }
}
