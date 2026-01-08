<script>
  import { logout, getSessions, revokeSession } from '$lib/srp-client.js';
  import { getPasskeys, registerPasskey, deletePasskey as removePasskey, isPasskeyAvailableForOrigin } from '$lib/passkey-client.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let { data } = $props();
  let loggingOut = $state(false);
  let sessions = $state([]);
  let loadingSessions = $state(true);
  let revokingId = $state(null);
  
  // Passkey state
  let passkeys = $state([]);
  let loadingPasskeys = $state(true);
  let addingPasskey = $state(false);
  let deletingPasskeyId = $state(null);
  let passkeySupported = $state(false);
  let passkeyError = $state('');
  let passkeySuccess = $state('');
  
  onMount(async () => {
    passkeySupported = isPasskeyAvailableForOrigin();
    await Promise.all([loadSessions(), loadPasskeys()]);
  });
  
  async function loadSessions() {
    loadingSessions = true;
    try {
      const res = await getSessions();
      sessions = res.sessions || [];
    } catch (e) {
      console.error(e);
    } finally {
      loadingSessions = false;
    }
  }
  
  async function loadPasskeys() {
    loadingPasskeys = true;
    try {
      const res = await getPasskeys();
      passkeys = res.passkeys || [];
    } catch (e) {
      console.error(e);
    } finally {
      loadingPasskeys = false;
    }
  }
  
  async function handleAddPasskey() {
    passkeyError = '';
    passkeySuccess = '';
    addingPasskey = true;
    
    try {
      const result = await registerPasskey();
      
      if (result.success) {
        passkeySuccess = 'Passkey успешно добавлен!';
        await loadPasskeys();
        setTimeout(() => passkeySuccess = '', 3000);
      } else {
        passkeyError = result.error || 'Ошибка добавления Passkey';
      }
    } catch (e) {
      passkeyError = 'Произошла ошибка';
    } finally {
      addingPasskey = false;
    }
  }
  
  async function handleDeletePasskey(credentialID) {
    if (!confirm('Удалить этот Passkey?')) return;
    
    deletingPasskeyId = credentialID;
    passkeyError = '';
    
    try {
      const result = await removePasskey(credentialID);
      if (result.passkeys) {
        passkeys = result.passkeys;
      } else {
        await loadPasskeys();
      }
    } catch (e) {
      passkeyError = 'Ошибка удаления';
    } finally {
      deletingPasskeyId = null;
    }
  }
  
  async function handleRevoke(sessionId, allOthers = false) {
    if (confirm(allOthers ? 'Вы уверены, что хотите выйти со всех других устройств?' : 'Отозвать эту сессию?')) {
      revokingId = allOthers ? 'all' : sessionId;
      try {
        const res = await revokeSession(sessionId, allOthers);
        if (res.sessions) {
          sessions = res.sessions;
        } else {
          await loadSessions();
        }
      } finally {
        revokingId = null;
      }
    }
  }
  
  async function handleLogout() {
    loggingOut = true;
    await logout();
    goto('/auth/login');
  }
  
  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>Панель управления</title>
</svelte:head>

<div class="dashboard">
  <nav class="navbar">
    <div class="nav-brand">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
      <span>SPC</span>
    </div>
    
    <div class="nav-user">
      <div class="user-info">
        <div class="user-avatar">
          {data.user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span class="user-name">{data.user?.username || 'Пользователь'}</span>
      </div>
      <button class="logout-btn" onclick={handleLogout} disabled={loggingOut}>
        {#if loggingOut}
          <span class="spinner"></span>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Выйти
        {/if}
      </button>
    </div>
  </nav>
  
  <main class="main-content">
    <div class="welcome-section">
      <h1>Добро пожаловать, <span class="highlight">{data.user?.username}</span>!</h1>
      <p>Вы успешно авторизованы с использованием SRP протокола</p>
    </div>
    
    <div class="cards-grid">
      <div class="card">
        <div class="card-icon purple">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h3>SRP Авторизация</h3>
        <p>Ваш пароль никогда не передаётся на сервер. Используется криптографическая проверка.</p>
      </div>
      
      <div class="card">
        <div class="card-icon blue">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3>CSP Защита</h3>
        <p>Content Security Policy с nonce-токенами защищает от XSS атак.</p>
      </div>
      
      <div class="card">
        <div class="card-icon green">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <h3>SRI Целостность</h3>
        <p>Subresource Integrity гарантирует, что скрипты не были изменены.</p>
      </div>
      
      <div class="card">
        <div class="card-icon orange">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </div>
        <h3>Redis Хранилище</h3>
        <p>Быстрое и безопасное хранение сессий в Redis (Upstash).</p>
      </div>
    </div>
    
    <div class="dashboard-grid">
      <div class="session-info">
        <h2>Информация о текущей сессии</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Пользователь</span>
            <span class="info-value">{data.user?.username}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Статус</span>
            <span class="info-value status-active">Активен</span>
          </div>
          <div class="info-item">
            <span class="info-label">Метод авторизации</span>
            <span class="info-value">SRP-6a (2048-bit)</span>
          </div>
          <div class="info-item">
            <span class="info-label">Защита</span>
            <span class="info-value">CSP + SRI + HttpOnly Cookie</span>
          </div>
        </div>
      </div>
      
      <div class="sessions-list-container">
        <div class="sessions-header">
          <h2>Активные сессии</h2>
          {#if sessions.length > 1}
            <button 
              class="revoke-all-btn" 
              onclick={() => handleRevoke(null, true)}
              disabled={revokingId === 'all'}
            >
              {#if revokingId === 'all'}
                <span class="spinner-sm"></span>
              {/if}
              Выйти со всех других устройств
            </button>
          {/if}
        </div>
        
        {#if loadingSessions}
          <div class="loading-state">
            <span class="spinner"></span>
            <p>Загрузка сессий...</p>
          </div>
        {:else if sessions.length === 0}
          <div class="empty-state">
            <p>Нет активных сессий</p>
          </div>
        {:else}
          <div class="sessions-list">
            {#each sessions as session (session.id)}
              <div class="session-item {session.current ? 'current-session' : ''}">
                <div class="session-icon {session.deviceType}">
                  {#if session.current}
                    <!-- Текущая сессия - иконка цели -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <circle cx="12" cy="12" r="4"></circle>
                    </svg>
                  {:else if session.deviceType === 'mobile'}
                    <!-- Мобильный телефон -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  {:else if session.deviceType === 'tablet'}
                    <!-- Планшет -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  {:else}
                    <!-- Десктоп/ноутбук -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                  {/if}
                </div>
                
                <div class="session-details">
                  <div class="session-title">
                    {#if session.current}
                      Текущая сессия
                      <span class="badge">Вы</span>
                    {:else}
                      {session.deviceName || 'Другое устройство'}
                    {/if}
                  </div>
                  <div class="session-meta">
                    <span>IP: {session.ip}</span>
                    <span class="dot">•</span>
                    <span>Активность: {formatDate(session.lastActive)}</span>
                  </div>
                </div>
                
                {#if !session.current}
                  <button 
                    class="revoke-btn" 
                    onclick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    title="Отозвать сессию"
                  >
                    {#if revokingId === session.id}
                      <span class="spinner-sm"></span>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    {/if}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Passkeys Section -->
    {#if passkeySupported}
      <div class="passkeys-section">
        <div class="section-header">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
            </svg>
            Passkeys
          </h2>
          <button 
            class="add-passkey-btn" 
            onclick={handleAddPasskey}
            disabled={addingPasskey}
          >
            {#if addingPasskey}
              <span class="spinner-sm"></span>
              Добавление...
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Добавить Passkey
            {/if}
          </button>
        </div>
        
        {#if passkeyError}
          <div class="passkey-message error">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{passkeyError}</span>
          </div>
        {/if}
        
        {#if passkeySuccess}
          <div class="passkey-message success">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{passkeySuccess}</span>
          </div>
        {/if}
        
        {#if loadingPasskeys}
          <div class="loading-state">
            <span class="spinner"></span>
            <p>Загрузка passkeys...</p>
          </div>
        {:else if passkeys.length === 0}
          <div class="empty-state passkey-empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
            </svg>
            <p>Нет добавленных Passkeys</p>
            <span>Добавьте Passkey для быстрого и безопасного входа</span>
          </div>
        {:else}
          <div class="passkeys-list">
            {#each passkeys as pk (pk.id)}
              <div class="passkey-item">
                <div class="passkey-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
                  </svg>
                </div>
                <div class="passkey-details">
                  <div class="passkey-title">
                    {pk.deviceType === 'singleDevice' ? 'Устройство' : 'Синхронизированный ключ'}
                    {#if pk.backedUp}
                      <span class="badge green">Резервная копия</span>
                    {/if}
                  </div>
                  <div class="passkey-meta">
                    Добавлен: {formatDate(pk.createdAt)}
                  </div>
                </div>
                <button 
                  class="revoke-btn" 
                  onclick={() => handleDeletePasskey(pk.id)}
                  disabled={deletingPasskeyId === pk.id}
                  title="Удалить Passkey"
                >
                  {#if deletingPasskeyId === pk.id}
                    <span class="spinner-sm"></span>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

  </main>
</div>

<style>
  .dashboard {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
  }
  
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }
  
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #fff;
    font-size: 1.25rem;
    font-weight: 700;
  }
  
  .nav-brand svg {
    width: 28px;
    height: 28px;
    color: #667eea;
  }
  
  .nav-user {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    font-size: 1.1rem;
  }
  
  .user-name {
    color: #fff;
    font-weight: 500;
  }
  
  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .logout-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  .logout-btn svg {
    width: 18px;
    height: 18px;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(248, 113, 113, 0.3);
    border-top-color: #f87171;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }
  
  .welcome-section {
    margin-bottom: 3rem;
  }
  
  .welcome-section h1 {
    color: #fff;
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
  }
  
  .highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .welcome-section p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1.1rem;
    margin: 0;
  }
  
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }
  
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.75rem;
    transition: all 0.3s ease;
  }
  
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.12);
  }
  
  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
  }
  
  .card-icon svg {
    width: 24px;
    height: 24px;
    color: #fff;
  }
  
  .card-icon.purple {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.25);
  }
  
  .card-icon.blue {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
  }
  
  .card-icon.green {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    box-shadow: 0 8px 20px rgba(34, 197, 94, 0.25);
  }
  
  .card-icon.orange {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25);
  }
  
  .card h3 {
    color: #fff;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }
  
  .card p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  @media (min-width: 900px) {
    .dashboard-grid {
      grid-template-columns: 350px 1fr;
    }
  }

  .session-info {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 2rem;
    height: fit-content;
  }
  
  .sessions-list-container {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 2rem;
  }
  
  .sessions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .sessions-header h2 {
    color: #fff;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  
  /* Стили сессий */
  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .session-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    transition: all 0.2s;
  }
  
  .session-item.current-session {
    background: rgba(102, 126, 234, 0.05);
    border-color: rgba(102, 126, 234, 0.2);
  }
  
  .session-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .current-session .session-icon {
    background: rgba(102, 126, 234, 0.2);
    color: #8b9cf4;
  }
  
  .session-icon.mobile {
    background: rgba(34, 197, 94, 0.1);
    color: #4ade80;
  }
  
  .session-icon.tablet {
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
  }
  
  .session-icon.desktop {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
  }
  
  .current-session .session-icon.mobile,
  .current-session .session-icon.tablet,
  .current-session .session-icon.desktop {
    background: rgba(102, 126, 234, 0.2);
    color: #8b9cf4;
  }
  
  .session-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .session-details {
    flex: 1;
    min-width: 0;
  }
  
  .session-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #fff;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .badge {
    padding: 0.15rem 0.5rem;
    background: #667eea;
    border-radius: 100px;
    font-size: 0.65rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  
  .session-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .dot {
    font-size: 0.6rem;
    opacity: 0.5;
  }
  
  /* Кнопки */
  .revoke-btn {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: #f87171;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .revoke-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.2);
  }
  
  .revoke-btn svg {
    width: 18px;
    height: 18px;
  }
  
  .revoke-all-btn {
    padding: 0.5rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #f87171;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .revoke-all-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  /* Loading states */
  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 0;
    color: rgba(255, 255, 255, 0.4);
    gap: 1rem;
  }
  
  .spinner-sm {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(248, 113, 113, 0.3);
    border-top-color: #f87171;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .session-info h2 {
    color: #fff;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1.5rem;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }
  
  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .info-label {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .info-value {
    color: #fff;
    font-size: 1rem;
    font-weight: 500;
  }
  
  .status-active {
    color: #4ade80;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-active::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #4ade80;
    border-radius: 50%;
    box-shadow: 0 0 8px #4ade80;
  }

  /* Passkeys Section */
  .passkeys-section {
    margin-top: 2rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 2rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .section-header h2 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #fff;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  
  .section-header h2 svg {
    width: 24px;
    height: 24px;
    color: #667eea;
  }
  
  .add-passkey-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .add-passkey-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }
  
  .add-passkey-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .add-passkey-btn svg {
    width: 18px;
    height: 18px;
  }
  
  .passkey-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .passkey-message.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  
  .passkey-message.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }
  
  .passkey-message svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  .passkey-empty {
    flex-direction: column;
    text-align: center;
  }
  
  .passkey-empty svg {
    width: 48px;
    height: 48px;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 1rem;
  }
  
  .passkey-empty span {
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.85rem;
  }
  
  .passkeys-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .passkey-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }
  
  .passkey-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 10px;
    color: #667eea;
  }
  
  .passkey-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .passkey-details {
    flex: 1;
    min-width: 0;
  }
  
  .passkey-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #fff;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .passkey-meta {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
  }
  
  .badge.green {
    background: #22c55e;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    .navbar {
      padding: 1rem;
      gap: 0.75rem;
    }
    
    .nav-brand {
      order: 1;
    }
    
    .nav-user {
      order: 2;
      gap: 1rem;
    }
    
    .user-name {
      display: none;
    }
    
    .logout-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }
    
    .logout-btn svg {
      width: 16px;
      height: 16px;
    }
    
    .main-content {
      padding: 1.5rem 1rem;
    }
    
    .welcome-section h1 {
      font-size: 1.5rem;
    }
    
    .welcome-section p {
      font-size: 0.9rem;
    }
    
    .welcome-section {
      margin-bottom: 2rem;
    }
    
    .cards-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .card {
      padding: 1.25rem;
    }
    
    .card-icon {
      width: 40px;
      height: 40px;
      margin-bottom: 1rem;
    }
    
    .card-icon svg {
      width: 20px;
      height: 20px;
    }
    
    .card h3 {
      font-size: 1rem;
    }
    
    .card p {
      font-size: 0.85rem;
    }
    
    .session-info, 
    .sessions-list-container {
      padding: 1.25rem;
    }
    
    .sessions-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .revoke-all-btn {
      width: 100%;
      justify-content: center;
      font-size: 0.8rem;
      padding: 0.75rem;
    }
    
    .session-item {
      flex-wrap: wrap;
      padding: 0.875rem;
    }
    
    .session-icon {
      width: 36px;
      height: 36px;
    }
    
    .session-icon svg {
      width: 18px;
      height: 18px;
    }
    
    .session-title {
      font-size: 0.9rem;
    }
    
    .session-meta {
      flex-wrap: wrap;
      font-size: 0.75rem;
      gap: 0.25rem;
    }
    
    .session-meta .dot {
      display: none;
    }
    
    .session-meta span {
      display: block;
      width: 100%;
    }
    
    .revoke-btn {
      position: absolute;
      right: 0.5rem;
      top: 0.5rem;
    }
    
    .session-item {
      position: relative;
      padding-right: 2.5rem;
    }
    
    .info-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .session-info h2,
    .sessions-header h2 {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 480px) {
    .welcome-section h1 {
      font-size: 1.25rem;
    }
    
    .nav-brand span {
      font-size: 1rem;
    }
    
    .nav-brand svg {
      width: 24px;
      height: 24px;
    }
  }
</style>
