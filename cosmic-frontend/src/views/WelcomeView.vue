<template>
  <div class="welcome-container">
    <div class="welcome-card">
      <h1 class="welcome-title">Добро пожаловать в Cosmic</h1>
      <p class="welcome-subtitle">Управляйте вашими Docker‑контейнерами с лёгкостью</p>
      <p class="welcome-description">
        Cosmic — это современный инструмент для мониторинга и управления контейнерами, созданный по образу Portainer.
        Перетаскивайте вкладки, создавайте собственные дашборды и следите за состоянием ваших серверов.
      </p>
      <div class="welcome-footer">
        <p>В ближайшее время здесь появится список доступных Docker‑хостов.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Пока без логики
</script>

<style scoped>
.welcome-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.welcome-card {
  max-width: 700px;
  background: rgba(18, 20, 24, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.welcome-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--cyan), #a8edea);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.welcome-subtitle {
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 24px;
}

.welcome-description {
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 40px;
}

.welcome-footer {
  border-top: 1px solid var(--border);
  padding-top: 24px;
  color: var(--cyan);
  font-style: italic;
}
</style>