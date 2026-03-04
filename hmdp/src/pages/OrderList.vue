<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getOrderList } from '../api';
import { authState, refreshUser } from '../stores/user';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const orders = ref([]);
const total = ref(0);
const current = ref(1);
const pageSize = ref(10);
const pages = ref(1);

const currentUser = computed(() => authState.user);
const canPrev = computed(() => current.value > 1);
const canNext = computed(() => current.value < pages.value);

const STATUS_LABELS = {
  1: 'UNPAID',
  2: 'PAID',
  3: 'VERIFIED',
  4: 'CANCELLED',
  5: 'REFUNDING',
  6: 'REFUNDED',
};

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

const resolveStatus = (status) => STATUS_LABELS[status] || 'UNKNOWN';

const loadOrders = async (page = current.value) => {
  loading.value = true;
  error.value = '';
  try {
    const result = await getOrderList({
      current: page,
      pageSize: pageSize.value,
    });
    const records = Array.isArray(result?.records) ? result.records : [];
    orders.value = records;
    total.value = Number(result?.total || 0);
    current.value = Number(result?.current || page);
    pages.value = Math.max(1, Number(result?.pages || 1));
    if (current.value > pages.value) {
      current.value = pages.value;
    }
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

const prevPage = async () => {
  if (!canPrev.value || loading.value) {
    return;
  }
  await loadOrders(current.value - 1);
};

const nextPage = async () => {
  if (!canNext.value || loading.value) {
    return;
  }
  await loadOrders(current.value + 1);
};

onMounted(async () => {
  await Promise.all([refreshUserState(), loadOrders(1)]);
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
        Source: backend `GET /voucher-order/of/me`
      </div>
      <div class="muted">Page {{ current }} / {{ pages }} | Total {{ total }}</div>
      <div class="grid cols-2">
        <button type="button" :disabled="loading" @click="loadOrders">Refresh Orders</button>
        <button type="button" @click="goShops">Back to Shop List</button>
      </div>
      <div class="grid cols-2">
        <button type="button" :disabled="!canPrev || loading" @click="prevPage">Prev Page</button>
        <button type="button" :disabled="!canNext || loading" @click="nextPage">Next Page</button>
      </div>
    </div>

    <div class="card stack">
      <div v-if="loading">Loading orders...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else>
        <div v-if="orders.length === 0" class="muted">No order records yet.</div>
        <article v-for="order in orders" :key="order.id" class="order-item">
          <div><strong>orderId:</strong> {{ order.id }}</div>
          <div><strong>voucherId:</strong> {{ order.voucherId }}</div>
          <div><strong>userId:</strong> {{ order.userId }}</div>
          <div><strong>statusCode:</strong> {{ order.status ?? '-' }}</div>
          <div><strong>status:</strong> {{ resolveStatus(order.status) }}</div>
          <div><strong>payType:</strong> {{ order.payType ?? '-' }}</div>
          <div><strong>createdAt:</strong> {{ formatDate(order.createTime) }}</div>
          <div><strong>updatedAt:</strong> {{ formatDate(order.updateTime) }}</div>
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
