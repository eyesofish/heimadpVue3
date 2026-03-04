<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getOrderDetail, getOrderList } from '../api';
import { clearLocalOrders } from '../stores/order';
import { authState, refreshUser } from '../stores/user';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const orders = ref([]);

const currentUser = computed(() => authState.user);

const formatDate = (isoString) => {
  if (!isoString) {
    return '-';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString();
};

const loadOrders = async () => {
  loading.value = true;
  error.value = '';
  try {
    const localOrders = await getOrderList();
    if (!Array.isArray(localOrders) || localOrders.length === 0) {
      orders.value = [];
      return;
    }
    const merged = await Promise.all(
      localOrders.map(async (order) => {
        try {
          const remote = await getOrderDetail(order.orderId);
          return {
            ...order,
            backend: remote,
            backendError: '',
          };
        } catch (e) {
          return {
            ...order,
            backend: null,
            backendError: e.message || 'Failed to fetch backend status',
          };
        }
      }),
    );
    orders.value = merged;
  } catch (e) {
    error.value = e.message || 'Failed to load order list';
  } finally {
    loading.value = false;
  }
};

const refreshUserState = async () => {
  try {
    await refreshUser();
  } catch {
    // ignore; route guard already controls auth entry for this page
  }
};

const goShops = () => {
  router.push('/shops');
};

const clearOrders = async () => {
  clearLocalOrders();
  await loadOrders();
};

onMounted(async () => {
  await Promise.all([refreshUserState(), loadOrders()]);
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <h2>Order List</h2>
      <div class="muted">
        User: {{ currentUser?.nickName || 'Unknown' }} (id: {{ currentUser?.id ?? '-' }})
      </div>
      <div class="muted">
        List source is local order history; each order will call backend `GET /voucher-order/{orderId}` for latest status.
      </div>
      <div class="grid cols-2">
        <button type="button" :disabled="loading" @click="loadOrders">Refresh Orders</button>
        <button type="button" @click="clearOrders">Clear Local Orders</button>
      </div>
      <button type="button" @click="goShops">Back to Shop List</button>
    </div>

    <div class="card stack">
      <div v-if="loading">Loading orders...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else>
        <div v-if="orders.length === 0" class="muted">No order records yet.</div>
        <article v-for="order in orders" :key="order.orderId + order.createdAt" class="order-item">
          <div><strong>orderId:</strong> {{ order.orderId }}</div>
          <div><strong>voucherId:</strong> {{ order.voucherId }}</div>
          <div><strong>shopId:</strong> {{ order.shopId ?? '-' }}</div>
          <div><strong>title:</strong> {{ order.title || '-' }}</div>
          <div><strong>status:</strong> {{ order.status || '-' }}</div>
          <div><strong>createdAt:</strong> {{ formatDate(order.createdAt) }}</div>
          <div><strong>backendStatus:</strong> {{ order.backend?.statusDesc || '-' }}</div>
          <div><strong>backendCode:</strong> {{ order.backend?.status ?? '-' }}</div>
          <div><strong>dbExists:</strong> {{ order.backend?.dbExists ?? '-' }}</div>
          <div><strong>processing:</strong> {{ order.backend?.processing ?? '-' }}</div>
          <div><strong>backendMessage:</strong> {{ order.backend?.message || '-' }}</div>
          <div><strong>backendUpdate:</strong> {{ formatDate(order.backend?.updateTime) }}</div>
          <div v-if="order.backendError" class="error">{{ order.backendError }}</div>
          <div class="muted">{{ order.note || '' }}</div>
        </article>
      </template>
    </div>
  </section>
</template>

<style scoped>
.order-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
