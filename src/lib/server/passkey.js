import { redis } from './redis.js';
import * as jose from 'jose';
import { JWT_SECRET } from '$env/static/private';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';

// Конфигурация WebAuthn
const rpName = 'SPC - Secure Protocol Center';

// Для локальной разработки используем localhost
// В продакшене нужно установить переменную ORIGIN
const DEFAULT_RPID = 'localhost';
const DEFAULT_ORIGIN = 'https://localhost:5173';

/**
 * Конвертирует base64 в base64url (для совместимости с Edge Runtime)
 */
function base64ToBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Конвертирует ArrayBuffer/Uint8Array в base64url строку
 */
function bufferToBase64Url(buffer) {
  const base64 = Buffer.from(buffer).toString('base64');
  return base64ToBase64Url(base64);
}

/**
 * Генерирует опции для регистрации нового passkey
 * @param {string} username 
 * @param {string} requestOrigin - Origin запроса
 * @returns {Promise<object>}
 */
export async function generatePasskeyRegistrationOptions(username, requestOrigin) {
  const { rpID } = getConfigFromOrigin(requestOrigin);
  
  // Получаем существующие passkeys пользователя
  const existingCredentials = await getUserPasskeys(username);
  
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    userDisplayName: username,
    // Не позволяем повторную регистрацию того же authenticator
    excludeCredentials: existingCredentials.map(cred => ({
      id: cred.credentialID,
      type: 'public-key',
      transports: cred.transports
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform'
    }
  });
  
  // Сохраняем challenge и origin в Redis (TTL 5 минут)
  await redis.setex(`webauthn_challenge:${username}`, 300, JSON.stringify({
    challenge: options.challenge,
    origin: requestOrigin
  }));
  
  return options;
}

/**
 * Верифицирует ответ регистрации passkey
 * @param {string} username 
 * @param {object} response 
 * @param {string} requestOrigin
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyPasskeyRegistration(username, response, requestOrigin) {
  // Получаем сохраненный challenge
  const challengeData = await redis.get(`webauthn_challenge:${username}`);
  
  if (!challengeData) {
    return { success: false, error: 'Challenge истек или не найден' };
  }
  
  const { challenge: expectedChallenge, origin: storedOrigin } = 
    typeof challengeData === 'string' ? JSON.parse(challengeData) : challengeData;
  
  const { rpID, expectedOrigin } = getConfigFromOrigin(storedOrigin || requestOrigin);
  
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID
    });
    
    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Верификация не пройдена' };
    }
    
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    
    // credential.id может быть строкой (base64url) или Uint8Array в зависимости от версии библиотеки
    let credentialID;
    if (typeof credential.id === 'string') {
      credentialID = credential.id;
    } else {
      credentialID = bufferToBase64Url(credential.id);
    }
    
    console.log('Registration - saving credential ID:', credentialID);
    
    // Сохраняем credential в Redis
    const passkeyData = {
      credentialID: credentialID,
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: response.response.transports || [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      createdAt: Date.now()
    };
    
    // Добавляем в список passkeys пользователя
    await redis.lpush(`passkeys:${username}`, JSON.stringify(passkeyData));
    
    // Удаляем challenge
    await redis.del(`webauthn_challenge:${username}`);
    
    return { success: true };
  } catch (error) {
    console.error('Passkey registration error:', error);
    return { success: false, error: 'Ошибка верификации' };
  }
}

/**
 * Получает все passkeys пользователя
 * @param {string} username 
 * @returns {Promise<Array>}
 */
export async function getUserPasskeys(username) {
  const passkeys = await redis.lrange(`passkeys:${username}`, 0, -1);
  return passkeys.map(p => typeof p === 'string' ? JSON.parse(p) : p);
}

/**
 * Генерирует опции для входа по passkey
 * @param {string} username (опционально, для входа без имени)
 * @param {string} requestOrigin
 * @returns {Promise<object>}
 */
export async function generatePasskeyAuthenticationOptions(username, requestOrigin) {
  const { rpID } = getConfigFromOrigin(requestOrigin);
  
  let allowCredentials = [];
  
  if (username) {
    const passkeys = await getUserPasskeys(username);
    allowCredentials = passkeys.map(cred => ({
      id: cred.credentialID,
      type: 'public-key',
      transports: cred.transports
    }));
    
    if (allowCredentials.length === 0) {
      return { error: 'У пользователя нет зарегистрированных passkeys' };
    }
  }
  
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred'
  });
  
  // Сохраняем challenge и origin
  const challengeKey = username ? `webauthn_auth_challenge:${username}` : `webauthn_auth_challenge:${options.challenge}`;
  await redis.setex(challengeKey, 300, JSON.stringify({
    challenge: options.challenge,
    username: username || null,
    origin: requestOrigin
  }));
  
  return { options, challengeKey };
}

/**
 * Верифицирует ответ аутентификации по passkey
 * @param {string} username 
 * @param {object} response 
 * @param {string} requestOrigin
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function verifyPasskeyAuthentication(username, response, requestOrigin) {
  const challengeKey = `webauthn_auth_challenge:${username}`;
  const challengeData = await redis.get(challengeKey);
  
  if (!challengeData) {
    return { success: false, error: 'Challenge истек или не найден' };
  }
  
  const { challenge, origin: storedOrigin } = typeof challengeData === 'string' ? JSON.parse(challengeData) : challengeData;
  const { rpID, expectedOrigin } = getConfigFromOrigin(storedOrigin || requestOrigin);
  
  // Находим credential пользователя
  const passkeys = await getUserPasskeys(username);
  const credentialID = response.id;
  
  console.log('Auth - looking for credential ID:', credentialID);
  console.log('Auth - available passkeys:', passkeys.map(p => p.credentialID));
  
  // Нормализуем ID для сравнения (убираем возможные различия в padding)
  const normalizeId = (id) => id.replace(/=/g, '');
  const normalizedCredentialID = normalizeId(credentialID);
  
  const passkey = passkeys.find(p => normalizeId(p.credentialID) === normalizedCredentialID);
  
  if (!passkey) {
    console.error('Passkey not found. Searched:', normalizedCredentialID);
    return { success: false, error: 'Passkey не найден' };
  }
  
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: Buffer.from(passkey.credentialPublicKey, 'base64'),
        counter: passkey.counter,
        transports: passkey.transports
      }
    });
    
    if (!verification.verified) {
      return { success: false, error: 'Верификация не пройдена' };
    }
    
    // Обновляем counter
    passkey.counter = verification.authenticationInfo.newCounter;
    
    // Обновляем passkey в Redis
    const allPasskeys = await getUserPasskeys(username);
    const updatedPasskeys = allPasskeys.map(p => 
      p.credentialID === credentialID ? passkey : p
    );
    
    await redis.del(`passkeys:${username}`);
    for (const pk of updatedPasskeys.reverse()) {
      await redis.lpush(`passkeys:${username}`, JSON.stringify(pk));
    }
    
    // Удаляем challenge
    await redis.del(challengeKey);
    
    // Создаем JWT токен
    const secret = new TextEncoder().encode(JWT_SECRET);
    const authSessionId = crypto.randomUUID();
    
    const token = await new jose.SignJWT({ 
      username: username,
      iat: Math.floor(Date.now() / 1000),
      authMethod: 'passkey'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);
    
    // Сохраняем токен в Redis
    await redis.setex(`auth_token:${token}`, 7 * 24 * 60 * 60, JSON.stringify({
      username: username,
      sessionId: authSessionId,
      createdAt: Date.now()
    }));
    
    // Добавляем сессию в список
    await redis.sadd(`user_sessions:${username}`, authSessionId);
    
    // Сохраняем метаданные сессии
    await redis.setex(`session_meta:${authSessionId}`, 7 * 24 * 60 * 60, JSON.stringify({
      token: token,
      username: username,
      createdAt: Date.now(),
      lastActive: Date.now(),
      authMethod: 'passkey'
    }));
    
    return { success: true, token };
  } catch (error) {
    console.error('Passkey authentication error:', error);
    return { success: false, error: 'Ошибка аутентификации' };
  }
}

/**
 * Удаляет passkey пользователя
 * @param {string} username 
 * @param {string} credentialID 
 */
export async function deletePasskey(username, credentialID) {
  const passkeys = await getUserPasskeys(username);
  const filtered = passkeys.filter(p => p.credentialID !== credentialID);
  
  await redis.del(`passkeys:${username}`);
  for (const pk of filtered.reverse()) {
    await redis.lpush(`passkeys:${username}`, JSON.stringify(pk));
  }
}

/**
 * Вспомогательная функция для получения rpID из origin
 * Для localhost поддерживаем как http так и https (dev режим)
 */
function getConfigFromOrigin(origin) {
  if (!origin) {
    return { rpID: DEFAULT_RPID, expectedOrigin: DEFAULT_ORIGIN };
  }
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    // Для localhost и 127.0.0.1 поддерживаем оба протокола
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // WebAuthn работает на localhost через любой протокол
      // Возвращаем массив допустимых origins для verifyRegistrationResponse/verifyAuthenticationResponse
      const port = url.port ? `:${url.port}` : '';
      return { 
        rpID: hostname, 
        expectedOrigin: [
          `http://${hostname}${port}`,
          `https://${hostname}${port}`
        ]
      };
    }
    
    return { 
      rpID: hostname, 
      expectedOrigin: origin 
    };
  } catch {
    return { rpID: DEFAULT_RPID, expectedOrigin: DEFAULT_ORIGIN };
  }
}
