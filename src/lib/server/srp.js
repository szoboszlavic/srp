import { redis } from './redis.js';
import * as jose from 'jose';
import { JWT_SECRET } from '$env/static/private';

// Импортируем нужные функции из правильных модулей
import * as srpClient from 'secure-remote-password/client';
import * as srpServer from 'secure-remote-password/server';

/**
 * Генерирует соль и верификатор для нового пользователя
 * @param {string} username 
 * @param {string} password 
 * @returns {{salt: string, verifier: string}}
 */
export function createVerifier(username, password) {
  // generateSalt находится в client модуле
  const salt = srpClient.generateSalt();
  const privateKey = srpClient.derivePrivateKey(salt, username.toLowerCase(), password);
  const verifier = srpClient.deriveVerifier(privateKey);

  return {
    salt: salt,
    verifier: verifier
  };
}

/**
 * Сохраняет пользователя в Redis
 * @param {string} username 
 * @param {string} salt 
 * @param {string} verifier 
 */
export async function saveUser(username, salt, verifier) {
  const userKey = `user:${username.toLowerCase()}`;

  // Проверяем, существует ли пользователь
  const exists = await redis.exists(userKey);
  if (exists) {
    throw new Error('Пользователь уже существует');
  }

  await redis.hset(userKey, {
    username: username,
    salt: salt,
    verifier: verifier,
    createdAt: Date.now()
  });
}

/**
 * Получает данные пользователя из Redis
 * @param {string} username 
 * @returns {Promise<{username: string, salt: string, verifier: string} | null>}
 */
export async function getUser(username) {
  const userKey = `user:${username.toLowerCase()}`;
  const user = await redis.hgetall(userKey);

  if (!user || Object.keys(user).length === 0) {
    return null;
  }

  return user;
}

/**
 * Создает серверную сессию SRP (шаг 1)
 * @param {string} username 
 * @param {string} clientPublicEphemeral (A)
 * @returns {Promise<{serverPublicEphemeral: string, sessionId: string, salt: string}>}
 */
export async function createServerSession(username, clientPublicEphemeral) {
  const user = await getUser(username);

  if (!user) {
    // Создаем фейковую сессию для защиты от перебора пользователей
    const fakeSalt = srpClient.generateSalt();
    const fakePrivateKey = srpClient.derivePrivateKey(fakeSalt, 'fake', 'fake');
    const fakeVerifier = srpClient.deriveVerifier(fakePrivateKey);
    const fakeEphemeral = srpServer.generateEphemeral(fakeVerifier);

    return {
      salt: fakeSalt,
      serverPublicEphemeral: fakeEphemeral.public,
      sessionId: crypto.randomUUID(),
      isFake: true
    };
  }

  // Генерируем серверные эфемерные значения
  const serverEphemeral = srpServer.generateEphemeral(user.verifier);
  const sessionId = crypto.randomUUID();

  // Сохраняем сессию в Redis (TTL 5 минут)
  await redis.setex(`srp_session:${sessionId}`, 300, JSON.stringify({
    username: username.toLowerCase(),
    salt: user.salt,
    verifier: user.verifier,
    serverSecretEphemeral: serverEphemeral.secret,
    clientPublicEphemeral: clientPublicEphemeral
  }));

  return {
    salt: user.salt,
    serverPublicEphemeral: serverEphemeral.public,
    sessionId: sessionId,
    isFake: false
  };
}

/**
 * Проверяет клиентское доказательство (M1) и возвращает серверное доказательство (M2)
 * @param {string} sessionId 
 * @param {string} clientProof (M1)
 * @returns {Promise<{success: boolean, serverProof?: string, token?: string}>}
 */
export async function verifyClientProof(sessionId, clientProof) {
  const sessionData = await redis.get(`srp_session:${sessionId}`);

  if (!sessionData) {
    return { success: false, error: 'Сессия не найдена или истекла' };
  }

  const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

  // Удаляем сессию после использования
  await redis.del(`srp_session:${sessionId}`);

  try {
    // Вычисляем серверную сессию
    const serverSession = srpServer.deriveSession(
      session.serverSecretEphemeral,
      session.clientPublicEphemeral,
      session.salt,
      session.username,
      session.verifier,
      clientProof
    );

    // Создаем JWT токен
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new jose.SignJWT({
      username: session.username,
      iat: Math.floor(Date.now() / 1000)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    // Генерируем уникальный ID сессии
    const authSessionId = crypto.randomUUID();
    
    // Сохраняем токен в Redis для возможности отзыва
    await redis.setex(`auth_token:${token}`, 7 * 24 * 60 * 60, JSON.stringify({
      username: session.username,
      sessionId: authSessionId,
      createdAt: Date.now()
    }));
    
    // Добавляем сессию в список сессий пользователя
    await redis.sadd(`user_sessions:${session.username}`, authSessionId);
    
    // Сохраняем метаданные сессии
    await redis.setex(`session_meta:${authSessionId}`, 7 * 24 * 60 * 60, JSON.stringify({
      token: token,
      username: session.username,
      createdAt: Date.now(),
      lastActive: Date.now()
    }));

    return {
      success: true,
      serverProof: serverSession.proof,
      token: token
    };
  } catch (error) {
    console.error('SRP verification error:', error);
    return { success: false, error: 'Неверный пароль' };
  }
}

/**
 * Проверяет JWT токен
 * @param {string} token 
 * @returns {Promise<{valid: boolean, payload?: any}>}
 */
export async function verifyToken(token) {
  if (!token) {
    return { valid: false };
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // Проверяем, что токен не отозван
    const tokenData = await redis.get(`auth_token:${token}`);
    if (!tokenData) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Определяет тип устройства по User-Agent
 * @param {string} userAgent 
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
function getDeviceType(userAgent) {
  if (!userAgent) return 'desktop';
  
  const ua = userAgent.toLowerCase();
  
  // Мобильные устройства
  if (/iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  
  // Планшеты
  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    return 'tablet';
  }
  
  return 'desktop';
}

/**
 * Получает краткое название браузера/устройства
 * @param {string} userAgent 
 * @returns {string}
 */
function getDeviceName(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  const ua = userAgent.toLowerCase();
  
  // Определяем браузер
  let browser = 'Browser';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // Определяем ОС
  let os = '';
  if (ua.includes('iphone')) os = 'iPhone';
  else if (ua.includes('ipad')) os = 'iPad';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('linux')) os = 'Linux';
  
  return os ? `${browser} на ${os}` : browser;
}

/**
 * Получает список активных сессий пользователя
 * @param {string} username 
 * @returns {Promise<Array<{id: string, createdAt: number, lastActive: number, current: boolean}>>}
 */
export async function getUserSessions(username, currentToken) {
  const sessionIds = await redis.smembers(`user_sessions:${username}`);
  const sessions = [];
  
  for (const sessionId of sessionIds) {
    const metaData = await redis.get(`session_meta:${sessionId}`);
    
    if (metaData) {
      const meta = typeof metaData === 'string' ? JSON.parse(metaData) : metaData;
      const userAgent = meta.userAgent || '';
      
      sessions.push({
        id: sessionId,
        createdAt: meta.createdAt,
        lastActive: meta.lastActive,
        deviceType: getDeviceType(userAgent),
        deviceName: getDeviceName(userAgent),
        ip: meta.ip || 'Unknown IP',
        current: meta.token === currentToken
      });
    } else {
      // Очистка "битых" ссылок
      await redis.srem(`user_sessions:${username}`, sessionId);
    }
  }
  
  return sessions.sort((a, b) => b.lastActive - a.lastActive);
}

/**
 * Отзывает конкретную сессию
 * @param {string} sessionId 
 * @param {string} username 
 */
export async function revokeSession(sessionId, username) {
  const metaData = await redis.get(`session_meta:${sessionId}`);
  
  if (metaData) {
    const meta = typeof metaData === 'string' ? JSON.parse(metaData) : metaData;
    // Удаляем токен авторизации
    await redis.del(`auth_token:${meta.token}`);
  }
  
  // Удаляем метаданные и ссылку из списка пользователя
  await redis.del(`session_meta:${sessionId}`);
  await redis.srem(`user_sessions:${username}`, sessionId);
}

/**
 * Отзывает все сессии кроме текущей
 * @param {string} username 
 * @param {string} currentToken 
 */
export async function revokeOtherSessions(username, currentToken) {
  const sessions = await getUserSessions(username, currentToken);
  
  for (const session of sessions) {
    if (!session.current) {
      await revokeSession(session.id, username);
    }
  }
}

/**
 * Обновляет активность сессии (IP, User-Agent, время)
 * @param {string} token 
 * @param {string} ip 
 * @param {string} userAgent 
 */
export async function updateSessionActivity(token, ip, userAgent) {
  const tokenDataStr = await redis.get(`auth_token:${token}`);
  
  if (tokenDataStr) {
    const tokenData = typeof tokenDataStr === 'string' ? JSON.parse(tokenDataStr) : tokenDataStr;
    const { sessionId } = tokenData;
    
    if (sessionId) {
      const metaData = await redis.get(`session_meta:${sessionId}`);
      
      if (metaData) {
        const meta = typeof metaData === 'string' ? JSON.parse(metaData) : metaData;
        
        // Обновляем только если изменилось или прошло время (throttling)
        const now = Date.now();
        // Обновляем не чаще раз в минуту или если изменился IP/UA
        if (now - meta.lastActive > 60000 || meta.ip !== ip || meta.userAgent !== userAgent) {
          meta.lastActive = now;
          meta.ip = ip;
          meta.userAgent = userAgent;
          
          await redis.setex(`session_meta:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(meta));
        }
      }
    }
  }
}

/**
 * Отзывает токен (logout) и очищает данные сессии
 * @param {string} token 
 */
export async function revokeToken(token) {
  const tokenDataStr = await redis.get(`auth_token:${token}`);
  
  if (tokenDataStr) {
    const tokenData = typeof tokenDataStr === 'string' ? JSON.parse(tokenDataStr) : tokenDataStr;
    const { username, sessionId } = tokenData;
    
    // Если есть ID сессии, делаем полную очистку через revokeSession
    if (sessionId && username) {
      await revokeSession(sessionId, username);
      return;
    }
  }
  
  // Fallback для старых токенов
  await redis.del(`auth_token:${token}`);
}
