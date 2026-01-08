<script>
  import { login } from '$lib/srp-client.js';
  import { loginWithPasskey, isPasskeyAvailableForOrigin } from '$lib/passkey-client.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let passkeyLoading = $state(false);
  let passkeySupported = $state(false);
  
  onMount(() => {
    passkeySupported = isPasskeyAvailableForOrigin();
  });
  
  async function handleLogin(e) {
    e.preventDefault();
    error = '';
    loading = true;
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        goto('/dashboard');
      } else {
        error = result.error || 'Ошибка авторизации';
      }
    } catch (err) {
      error = 'Произошла ошибка. Попробуйте снова.';
    } finally {
      loading = false;
    }
  }
  
  async function handlePasskeyLogin() {
    if (!username) {
      error = 'Введите имя пользователя для входа по Passkey';
      return;
    }
    
    error = '';
    passkeyLoading = true;
    
    try {
      const result = await loginWithPasskey(username);
      
      if (result.success) {
        goto('/dashboard');
      } else {
        error = result.error || 'Ошибка входа по Passkey';
      }
    } catch (err) {
      error = 'Произошла ошибка. Попробуйте снова.';
    } finally {
      passkeyLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Вход в систему</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h1>Вход в систему</h1>
      <p class="subtitle">Безопасная SRP авторизация</p>
    </div>
    
    {#if error}
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{error}</span>
      </div>
    {/if}
    
    <form onsubmit={handleLogin}>
      <div class="form-group">
        <label for="username">Имя пользователя</label>
        <input 
          type="text" 
          id="username" 
          bind:value={username}
          placeholder="Введите имя пользователя"
          required
          autocomplete="username"
        />
      </div>
      
      <div class="form-group">
        <label for="password">Пароль</label>
        <input 
          type="password" 
          id="password" 
          bind:value={password}
          placeholder="Введите пароль"
          required
          autocomplete="current-password"
        />
      </div>
      
      <button type="submit" class="submit-btn" disabled={loading || passkeyLoading}>
        {#if loading}
          <span class="spinner"></span>
          Вход...
        {:else}
          Войти
        {/if}
      </button>
    </form>
    
    {#if passkeySupported}
      <div class="divider">
        <span>или</span>
      </div>
      
      <button 
        type="button" 
        class="passkey-btn" 
        onclick={handlePasskeyLogin}
        disabled={loading || passkeyLoading}
      >
        {#if passkeyLoading}
          <span class="spinner dark"></span>
          Проверка...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
          </svg>
          Войти с Passkey
        {/if}
      </button>
    {/if}
    
    <div class="auth-footer">
      <p>Нет аккаунта? <a href="/auth/register">Зарегистрироваться</a></p>
    </div>
    
    <div class="security-badge">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
      <span>Защищено SRP протоколом</span>
    </div>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    padding: 1rem;
  }
  
  .auth-card {
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 2.5rem;
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .logo {
    width: 64px;
    height: 64px;
    margin: 0 auto 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }
  
  .logo svg {
    width: 32px;
    height: 32px;
    color: white;
  }
  
  .auth-header h1 {
    color: #fff;
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    margin: 0;
  }
  
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    color: #f87171;
    font-size: 0.9rem;
  }
  
  .error-message svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-group label {
    display: block;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 1rem;
    transition: all 0.2s ease;
    outline: none;
  }
  
  .form-group input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  
  .form-group input:focus {
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }
  
  .submit-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 12px;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
  }
  
  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .spinner.dark {
    border-color: rgba(102, 126, 234, 0.3);
    border-top-color: #667eea;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
  }
  
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }
  
  .divider span {
    padding: 0 1rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
  }
  
  .passkey-btn {
    width: 100%;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  
  .passkey-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
  }
  
  .passkey-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .passkey-btn svg {
    width: 22px;
    height: 22px;
  }
  
  .auth-footer {
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  .auth-footer p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    margin: 0;
  }
  
  .auth-footer a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .auth-footer a:hover {
    color: #8b9cf4;
  }
  
  .security-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8rem;
  }
  
  .security-badge svg {
    width: 16px;
    height: 16px;
    color: #22c55e;
  }

  @media (max-width: 480px) {
    .auth-card {
      padding: 1.5rem;
      border-radius: 20px;
    }
    
    .logo {
      width: 56px;
      height: 56px;
      margin-bottom: 1.25rem;
    }
    
    .logo svg {
      width: 28px;
      height: 28px;
    }
    
    .auth-header h1 {
      font-size: 1.5rem;
    }
    
    .subtitle {
      font-size: 0.85rem;
    }
    
    .form-group input {
      padding: 0.75rem 0.875rem;
      font-size: 16px;
    }
    
    .submit-btn {
      padding: 0.875rem;
    }
  }
</style>
