<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let checking = $state(true);
  let authenticated = $state(false);
  
  onMount(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      authenticated = data.authenticated;
    } catch {
      authenticated = false;
    }
    checking = false;
  });
</script>

<svelte:head>
  <title>SPC - Secure Protocol Center</title>
  <meta name="description" content="Безопасная авторизация с использованием SRP протокола, CSP и SRI" />
</svelte:head>

<div class="landing">
  <div class="hero">
    <div class="hero-content">
      <div class="badge">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 12 11 14 15 10"></polyline>
        </svg>
        <span>Безопасность на первом месте</span>
      </div>
      
      <h1>
        <span class="gradient-text">SPC</span>
        <br />
        Secure Protocol Center
      </h1>
      
      <p class="hero-description">
        Современная система авторизации с использованием криптографического протокола 
        <strong>SRP-6a</strong>, защитой <strong>Content Security Policy</strong> и 
        <strong>Subresource Integrity</strong>.
      </p>
      
      <div class="cta-buttons">
        {#if checking}
          <button class="btn btn-primary" disabled>
            <span class="spinner"></span>
            Загрузка...
          </button>
        {:else if authenticated}
          <a href="/dashboard" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Панель управления
          </a>
        {:else}
          <a href="/auth/login" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Войти
          </a>
          <a href="/auth/register" class="btn btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Регистрация
          </a>
        {/if}
      </div>
    </div>
    
    <div class="hero-visual">
      <div class="security-ring ring-1"></div>
      <div class="security-ring ring-2"></div>
      <div class="security-ring ring-3"></div>
      <div class="shield-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      </div>
    </div>
  </div>
  
  <footer class="footer">
    <p>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
      SPC — Secure Protocol Center
    </p>
  </footer>
</div>

<style>
  .landing {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    color: #fff;
    overflow-x: hidden;
  }
  
  .hero {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 6rem 2rem;
    align-items: center;
  }
  
  @media (max-width: 768px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
      padding: 3rem 1.5rem;
    }
    
    .hero-visual {
      display: none;
    }
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 100px;
    padding: 0.5rem 1rem;
    color: #8b9cf4;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
  }
  
  .badge svg {
    width: 16px;
    height: 16px;
  }
  
  h1 {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 1.5rem;
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  .gradient-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .hero-description {
    font-size: 1.15rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 2rem;
    max-width: 500px;
  }
  
  .hero-description strong {
    color: rgba(255, 255, 255, 0.85);
  }
  
  .cta-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  @media (max-width: 768px) {
    .cta-buttons {
      justify-content: center;
    }
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.75rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
  }
  
  .btn svg {
    width: 20px;
    height: 20px;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
  }
  
  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .btn:disabled {
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
  
  .hero-visual {
    position: relative;
    width: 400px;
    height: 400px;
    justify-self: center;
  }
  
  .security-ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid;
    animation: pulse 4s ease-in-out infinite;
  }
  
  .ring-1 {
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border-color: rgba(102, 126, 234, 0.2);
    animation-delay: 0s;
  }
  
  .ring-2 {
    width: 75%;
    height: 75%;
    top: 12.5%;
    left: 12.5%;
    border-color: rgba(118, 75, 162, 0.3);
    animation-delay: 0.5s;
  }
  
  .ring-3 {
    width: 50%;
    height: 50%;
    top: 25%;
    left: 25%;
    border-color: rgba(240, 147, 251, 0.4);
    animation-delay: 1s;
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.5;
    }
  }
  
  .shield-icon {
    position: absolute;
    width: 100px;
    height: 100px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 50px rgba(102, 126, 234, 0.4);
  }
  
  .shield-icon svg {
    width: 50px;
    height: 50px;
    color: #fff;
  }
  
  .footer {
    text-align: center;
    padding: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .footer p {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.9rem;
    margin: 0;
  }
  
  .footer svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }
    
    .hero-description {
      font-size: 1rem;
      margin: 0 auto 2rem;
    }
    
    .btn {
      padding: 0.875rem 1.5rem;
      font-size: 0.9rem;
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 1.75rem;
    }
    
    .badge {
      font-size: 0.75rem;
      padding: 0.4rem 0.75rem;
    }
  }
</style>
