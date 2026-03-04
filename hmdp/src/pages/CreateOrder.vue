<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createOrder } from '../api';
import { addLocalOrder } from '../stores/order';
import { authState } from '../stores/user';

const route = useRoute();
const router = useRouter();

const submitting = ref(false);
const error = ref('');
const orderId = ref('');

const voucherId = computed(() => Number(route.params.voucherId));
const shopId = computed(() => (route.query.shopId ? Number(route.query.shopId) : null));
const voucherTitle = computed(() => {
  if (typeof route.query.title === 'string' && route.query.title.trim()) {
    return route.query.title;
  }
  return `Voucher #${voucherId.value}`;
});
const userName = computed(() => authState.user?.nickName || 'Unknown');

const submit = async () => {
  if (!voucherId.value) {
    error.value = 'Invalid voucherId';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    const backendOrderId = await createOrder(voucherId.value);
    orderId.value = String(backendOrderId);
    addLocalOrder({
      orderId: String(backendOrderId),
      voucherId: voucherId.value,
      shopId: shopId.value,
      title: voucherTitle.value,
      createdAt: new Date().toISOString(),
      status: 'REQUEST_ACCEPTED',
      note: 'Backend order persistence is async (MQ consumer).',
    });
  } catch (e) {
    error.value = e.message || 'Failed to create order';
  } finally {
    submitting.value = false;
  }
};

const goOrders = () => {
  router.push('/orders');
};

const goShopDetail = () => {
  if (!shopId.value) {
    router.push('/shops');
    return;
  }
  router.push(`/shops/${shopId.value}`);
};
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <h2>Create Order</h2>
      <div class="muted">Current User: {{ userName }}</div>
      <div class="muted">Voucher ID: {{ voucherId }}</div>
      <div class="muted">Voucher Title: {{ voucherTitle }}</div>
      <div class="grid cols-2">
        <button type="button" :disabled="submitting" @click="submit">
          {{ submitting ? 'Submitting...' : 'Submit /voucher-order/seckill/{id}' }}
        </button>
        <button type="button" @click="goShopDetail">Back to Shop Detail</button>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="orderId" class="success">
        Request accepted, orderId: <strong>{{ orderId }}</strong>
      </div>
      <div class="muted">
        You can open the order list page to query backend status by orderId.
      </div>
    </div>

    <div class="card">
      <button type="button" @click="goOrders">Go To Order List</button>
    </div>
  </section>
</template>
