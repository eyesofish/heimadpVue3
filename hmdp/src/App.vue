<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { authState, signOut } from './stores/user';

const router = useRouter();

const isLoggedIn = computed(() => Boolean(authState.token));
const userName = computed(() => authState.user?.nickName || 'Guest');

const onLogout = async () => {
  await signOut();
  router.push('/login');
};
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">Dianping Dev Frontend</div>
      <nav class="app-nav">
        <RouterLink to="/shops">Shops</RouterLink>
        <RouterLink to="/orders">Orders</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
      </nav>
      <div class="user-status">
        <span>{{ userName }}</span>
        <button v-if="isLoggedIn" type="button" @click="onLogout">Logout</button>
      </div>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
