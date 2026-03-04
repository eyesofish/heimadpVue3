import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initUserState } from './stores/user';
import './style.css';

initUserState();

createApp(App).use(router).mount('#app');

