<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getShopDetail, getVoucherList } from '../api';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const error = ref('');
const shop = ref(null);
const vouchers = ref([]);

const shopId = computed(() => Number(route.params.id));

const scoreText = computed(() => {
  if (typeof shop.value?.score !== 'number') {
    return '-';
  }
  return (shop.value.score / 10).toFixed(1);
});

const imageList = computed(() => {
  if (!shop.value?.images) {
    return [];
  }
  return String(shop.value.images)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
});

const normalizeVoucherText = (value, fallback = '-') => {
  const text = value == null ? '' : String(value).trim();
  if (!text) {
    return fallback;
  }
  // Some bad records are persisted as "????", hide them with a readable fallback.
  if (/^\?+$/.test(text)) {
    return fallback;
  }
  return text;
};

const isVoucherExpired = (voucher) => {
  if (!voucher?.endTime) {
    return false;
  }
  return new Date(voucher.endTime).getTime() < Date.now();
};

const canCreateOrder = (voucher) => {
  if (!voucher) {
    return false;
  }
  if (voucher.type !== 1) {
    return false;
  }
  if (isVoucherExpired(voucher)) {
    return false;
  }
  return Number(voucher.stock || 0) > 0;
};

const loadDetail = async () => {
  if (!shopId.value) {
    error.value = 'Invalid shop id';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [shopData, voucherData] = await Promise.all([
      getShopDetail(shopId.value),
      getVoucherList(shopId.value),
    ]);
    shop.value = shopData;
    vouchers.value = Array.isArray(voucherData) ? voucherData : [];
  } catch (e) {
    error.value = e.message || 'Failed to load shop detail';
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/shops');
};

const goCreateOrder = (voucher) => {
  router.push({
    name: 'create-order',
    params: { voucherId: voucher.id },
    query: {
      shopId: String(shopId.value),
      title: voucher.title || '',
    },
  });
};

onMounted(loadDetail);
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <div class="detail-header">
        <button type="button" @click="goBack">Back to list</button>
        <button type="button" :disabled="loading" @click="loadDetail">Reload</button>
      </div>
      <div v-if="loading">Loading shop detail...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else-if="shop">
        <h2>{{ shop.name }}</h2>
        <div class="muted">Score: {{ scoreText }}</div>
        <div class="muted">Address: {{ shop.address || '-' }}</div>
        <div class="muted">Area: {{ shop.area || '-' }}</div>
        <div class="muted">Open Hours: {{ shop.openHours || '-' }}</div>
        <div class="muted">Avg Price: {{ shop.avgPrice || '-' }}</div>

        <div v-if="imageList.length > 0" class="image-row">
          <img v-for="image in imageList" :key="image" :src="image" alt="shop image" />
        </div>
      </template>
      <div v-else class="muted">Shop not found.</div>
    </div>

    <div class="card stack">
      <h3>Voucher List</h3>
      <div v-if="vouchers.length === 0" class="muted">No voucher data.</div>
      <article v-for="voucher in vouchers" :key="voucher.id" class="voucher-item">
        <div class="stack">
          <strong>{{ normalizeVoucherText(voucher.title, `Voucher #${voucher.id}`) }}</strong>
          <span class="muted">{{ normalizeVoucherText(voucher.subTitle, '-') }}</span>
          <span class="muted">Stock: {{ voucher.stock ?? '-' }}</span>
          <span class="muted">Type: {{ voucher.type === 1 ? 'Seckill' : 'Normal' }}</span>
          <span class="muted">End Time: {{ voucher.endTime || '-' }}</span>
        </div>
        <button
          type="button"
          :disabled="!canCreateOrder(voucher)"
          @click="goCreateOrder(voucher)"
        >
          {{ canCreateOrder(voucher) ? 'Create Order' : 'Unavailable' }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.detail-header {
  display: flex;
  gap: 8px;
}

.image-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.image-row img {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

.voucher-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
}

@media (max-width: 768px) {
  .voucher-item {
    grid-template-columns: 1fr;
  }
}
</style>
