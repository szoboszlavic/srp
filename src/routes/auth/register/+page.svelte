<script>
  import { register } from '$lib/srp-client.js';
  import { goto } from '$app/navigation';
  
  let username = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);
  
  async function handleRegister(e) {
    e.preventDefault();
    error = '';
    success = '';
    
    // Валидация
    if (password !== confirmPassword) {
      error = 'Пароли не совпадают';
      return;
    }
    
    if (password.length < 8) {
      error = 'Пароль должен быть не менее 8 символов';
      return;
    }
    
    if (username.length < 3) {
      error = 'Имя пользователя должно быть не менее 3 символов';
      return;
    }
    
    loading = true;
    
    try {
      const result = await register(username, password);
      
      if (result.success) {
        success = 'Регистрация успешна! Перенаправление...';
        setTimeout(() => goto('/auth/login'), 1500);
      } else {
        error = result.error || 'Ошибка регистрации';
      }
    } catch (err) {
      error = 'Произошла ошибка. Попробуйте снова.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Регистрация</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
      </div>
      <h1>Регистрация</h1>
      <p class="subtitle">Создайте безопасный аккаунт</p>
    </div>
    
    {#if error}
      <div class="message error">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{error}</span>
      </div>
    {/if}
    
    {#if success}
      <div class="message success">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>{success}</span>
      </div>
    {/if}
    
    <form onsubmit={handleRegister}>
      <div class="form-group">
        <label for="username">Имя пользователя</label>
        <input 
          type="text" 
          id="username" 
          bind:value={username}
          placeholder="Минимум 3 символа"
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
          placeholder="Минимум 8 символов"
          required
          autocomplete="new-password"
        />
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Подтвердите пароль</label>
        <input 
          type="password" 
          id="confirmPassword" 
          bind:value={confirmPassword}
          placeholder="Повторите пароль"
          required
          autocomplete="new-password"
        />
      </div>
      
      <button type="submit" class="submit-btn" disabled={loading}>
        {#if loading}
          <span class="spinner"></span>
          Регистрация...
        {:else}
          Создать аккаунт
        {/if}
      </button>
    </form>
    
    <div class="auth-footer">
      <p>Уже есть аккаунт? <a href="/auth/login">Войти</a></p>
    </div>
    
    <div class="security-info">
      <div class="security-item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span>SRP протокол — пароль никогда не передаётся на сервер</span>
      </div>
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
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
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
  
  .message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  
  .message.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  
  .message.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }
  
  .message svg {
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
    border-color: #22c55e;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
  }
  
  .submit-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
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
    box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
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
  
  @keyframes spin {
    to { transform: rotate(360deg); }
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
    color: #22c55e;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .auth-footer a:hover {
    color: #4ade80;
  }
  
  .security-info {
    margin-top: 1.5rem;
  }
  
  .security-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
    padding: 0.75rem;
    background: rgba(34, 197, 94, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(34, 197, 94, 0.1);
  }
  
  .security-item svg {
    width: 14px;
    height: 14px;
    color: #22c55e;
    flex-shrink: 0;
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
      font-size: 16px; /* Prevents zoom on iOS */
    }
    
    .submit-btn {
      padding: 0.875rem;
    }
    
    .security-item {
      font-size: 0.7rem;
    }
  }
</style>
