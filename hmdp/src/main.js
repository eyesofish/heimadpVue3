import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { ensureDevAuthToken } from './api/auth';
import { initUserState } from './stores/user';
import './style.css';

const bootstrap = async () => {
  try {
    await ensureDevAuthToken();
  } catch (error) {
    console.error('[dev-auth] initial login failed', error);
  }
  initUserState();
  createApp(App).use(router).mount('#app');
};

bootstrap();

