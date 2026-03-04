<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loginUser, sendUserCode } from '../api';
import { enableMockUser, refreshUser, setAuthToken } from '../stores/user';

const router = useRouter();
const route = useRoute();

const sendingCode = ref(false);
const loggingIn = ref(false);
const error = ref('');
const message = ref('');
const form = reactive({
  phone: '13800000000',
  code: '',
});

const goNext = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/shops';
  router.push(redirect);
};

const requestCode = async () => {
  if (!form.phone.trim()) {
    error.value = 'phone is required';
    return;
  }
  sendingCode.value = true;
  error.value = '';
  message.value = '';
  try {
    await sendUserCode(form.phone.trim());
    message.value =
      'Code sent. Backend does not return the code; read logs/app.log or Redis login:code:<phone>.';
  } catch (e) {
    error.value = e.message || 'failed to send code';
  } finally {
    sendingCode.value = false;
  }
};

const login = async () => {
  if (!form.phone.trim() || !form.code.trim()) {
    error.value = 'phone and code are required';
    return;
  }
  loggingIn.value = true;
  error.value = '';
  message.value = '';
  try {
    const token = await loginUser({
      phone: form.phone.trim(),
      code: form.code.trim(),
      password: null,
    });
    setAuthToken(token);
    await refreshUser();
    goNext();
  } catch (e) {
    error.value = e.message || 'login failed';
  } finally {
    loggingIn.value = false;
  }
};

const useMock = () => {
  enableMockUser(localStorage.getItem('dev_mock_token') || 'dev-mock-token');
  message.value = 'Mock user enabled.';
  error.value = '';
  goNext();
};
</script>

<template>
  <section class="card stack login-card">
    <h2>Login</h2>
    <p class="muted">SMS login optional for development. You can use a mock dev user.</p>

    <div class="stack">
      <label for="phone">Phone</label>
      <input id="phone" v-model="form.phone" placeholder="e.g. 13800000000" />
    </div>

    <div class="stack">
      <label for="code">Code</label>
      <input id="code" v-model="form.code" placeholder="input code from backend logs" />
    </div>

    <div class="grid cols-2">
      <button type="button" :disabled="sendingCode" @click="requestCode">
        {{ sendingCode ? 'Sending...' : 'POST /user/code' }}
      </button>
      <button type="button" :disabled="loggingIn" @click="login">
        {{ loggingIn ? 'Logging in...' : 'POST /user/login' }}
      </button>
    </div>

    <button type="button" @click="useMock">Use Mock Dev User</button>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="message" class="success">{{ message }}</div>
  </section>
</template>

<style scoped>
.login-card {
  max-width: 520px;
}
</style>
