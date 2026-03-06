<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getShopList, getShopTypeList, searchShopsByName } from '../api';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const error = ref('');
const shopTypes = ref([]);
const shops = ref([]);

const state = reactive({
  typeId: route.query.typeId ? Number(route.query.typeId) : null,
  current: route.query.current ? Number(route.query.current) : 1,
  keyword: route.query.keyword ? String(route.query.keyword) : '',
  x: null,
  y: null,
});

const selectedTypeName = computed(() => {
  if (!state.typeId) {
    return 'All Types';
  }
  const target = shopTypes.value.find((item) => item.id === state.typeId);
  return target?.name || 'Unknown Type';
});

const firstImage = (shop) => {
  if (!shop?.images) {
    return '';
  }
  return String(shop.images).split(',')[0];
};

const scoreText = (shop) => {
  if (typeof shop?.score !== 'number') {
    return '-';
  }
  return (shop.score / 10).toFixed(1);
};

const distanceText = (shop) => {
  if (typeof shop?.distance !== 'number') {
    return '';
  }
  if (shop.distance < 1000) {
    return `${shop.distance.toFixed(0)}m`;
  }
  return `${(shop.distance / 1000).toFixed(1)}km`;
};

const loadShopTypes = async () => {
  const data = await getShopTypeList();
  shopTypes.value = Array.isArray(data) ? data : [];
  if (!state.typeId && shopTypes.value.length > 0) {
    state.typeId = shopTypes.value[0].id;
  }
};

const loadShops = async () => {
  loading.value = true;
  error.value = '';
  try {
    let data = [];
    if (state.keyword.trim()) {
      data = await searchShopsByName({
        name: state.keyword.trim(),
        current: state.current,
      });
    } else if (state.typeId) {
      const params = {
        typeId: state.typeId,
        current: state.current,
      };
      if (typeof state.x === 'number' && typeof state.y === 'number') {
        params.x = state.x;
        params.y = state.y;
      }
      data = await getShopList(params);
    }
    shops.value = Array.isArray(data) ? data : [];
  } catch (e) {
    shops.value = [];
    error.value = e.message || 'Failed to load shops';
  } finally {
    loading.value = false;
  }
};

const applyFilter = async () => {
  state.current = 1;
  await loadShops();
};

const changeType = async () => {
  state.keyword = '';
  state.current = 1;
  await loadShops();
};

const previousPage = async () => {
  if (state.current <= 1) {
    return;
  }
  state.current -= 1;
  await loadShops();
};

const nextPage = async () => {
  state.current += 1;
  await loadShops();
};

const openShop = (shopId) => {
  router.push(`/shops/${shopId}`);
};

const openCreateShop = () => {
  router.push('/shop/edit');
};

const openEditShop = (shopId) => {
  router.push(`/shop/edit/${shopId}`);
};

onMounted(async () => {
  try {
    await loadShopTypes();
  } catch (e) {
    error.value = e.message || 'Failed to load shop types';
  }
  await loadShops();
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <div class="list-header">
        <h2>Shop List</h2>
        <button type="button" @click="openCreateShop">Create Shop</button>
      </div>
      <p class="muted">Browse shops by type or search by name.</p>

      <div class="grid cols-2">
        <div class="stack">
          <label for="typeId">Shop Type</label>
          <select id="typeId" v-model.number="state.typeId" @change="changeType">
            <option v-for="type in shopTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>
        <div class="stack">
          <label for="keyword">Search Name</label>
          <div class="grid cols-2">
            <input
              id="keyword"
              v-model="state.keyword"
              placeholder="input shop name"
              @keyup.enter="applyFilter"
            />
            <button type="button" @click="applyFilter">Search</button>
          </div>
        </div>
      </div>

      <div class="grid cols-2">
        <button type="button" :disabled="state.current <= 1 || loading" @click="previousPage">
          Prev Page
        </button>
        <button type="button" :disabled="loading" @click="nextPage">Next Page</button>
      </div>
      <div class="muted">Type: {{ selectedTypeName }} | Page: {{ state.current }}</div>
    </div>

    <div class="card stack">
      <div v-if="loading">Loading shop list...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <template v-else>
        <div v-if="shops.length === 0" class="muted">No shop data.</div>
        <article v-for="shop in shops" :key="shop.id" class="shop-item">
          <div class="shop-image-wrap">
            <img v-if="firstImage(shop)" :src="firstImage(shop)" alt="shop cover" />
            <div v-else class="shop-image-empty">No Image</div>
          </div>
          <div class="shop-content">
            <h3>{{ shop.name }}</h3>
            <div class="muted">Score: {{ scoreText(shop) }}</div>
            <div class="muted">Area: {{ shop.area || '-' }}</div>
            <div class="muted">Address: {{ shop.address || '-' }}</div>
            <div class="muted">Distance: {{ distanceText(shop) || '-' }}</div>
            <div class="action-row">
              <button type="button" @click="openShop(shop.id)">View Detail</button>
              <button type="button" @click="openEditShop(shop.id)">Edit</button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </section>
</template>

<style scoped>
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.shop-item {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
}

.shop-image-wrap {
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.shop-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-image-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #9ca3af;
}

.shop-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .list-header {
    flex-wrap: wrap;
  }

  .shop-item {
    grid-template-columns: 1fr;
  }

  .shop-image-wrap {
    height: 180px;
  }
}
</style>
