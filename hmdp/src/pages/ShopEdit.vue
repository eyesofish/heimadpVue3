<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createShop, getShopTypeList, queryShopById, updateShop } from '../api';

const AMAP_KEY = '0f1f3ae2df379e533a16a236f2e00893';
const DEFAULT_X = 116.397428;
const DEFAULT_Y = 39.90923;
const MAP_CONTAINER_ID = 'shop-edit-map';

let amapLoaderPromise = null;

const loadAmapSdk = () => {
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (amapLoaderPromise) {
    return amapLoaderPromise;
  }

  amapLoaderPromise = new Promise((resolve, reject) => {
    const existedScript = document.getElementById('amap-js-sdk');
    if (existedScript) {
      const onLoad = () => {
        if (window.AMap) {
          resolve(window.AMap);
        } else {
          reject(new Error('AMap SDK loaded but window.AMap is missing'));
        }
      };
      existedScript.addEventListener('load', onLoad, { once: true });
      existedScript.addEventListener('error', () => reject(new Error('Failed to load AMap SDK')), {
        once: true,
      });
      if (window.AMap) {
        resolve(window.AMap);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'amap-js-sdk';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Geocoder`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
        return;
      }
      reject(new Error('AMap SDK loaded but window.AMap is missing'));
    };
    script.onerror = () => reject(new Error('Failed to load AMap SDK'));
    document.head.appendChild(script);
  });

  return amapLoaderPromise;
};

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const mapLoading = ref(false);
const geocoding = ref(false);
const submitting = ref(false);
const error = ref('');
const success = ref('');
const geoMessage = ref('');
const shopTypes = ref([]);

const mapInstance = ref(null);
const markerInstance = ref(null);
const geocoderInstance = ref(null);

const form = reactive({
  id: null,
  name: '',
  typeId: null,
  area: '',
  address: '',
  x: '',
  y: '',
});

const shopId = computed(() => {
  const id = Number(route.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
});

const isEditMode = computed(() => shopId.value !== null);
const pageTitle = computed(() => (isEditMode.value ? 'Edit Shop' : 'Create Shop'));

const normalizeCoordinate = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '';
  }
  return Number(numberValue.toFixed(6));
};

const placeMarker = (x, y, moveCenter = false) => {
  if (!mapInstance.value) {
    return;
  }
  const position = [x, y];
  if (!markerInstance.value) {
    markerInstance.value = new window.AMap.Marker({
      position,
      map: mapInstance.value,
    });
  } else {
    markerInstance.value.setPosition(position);
  }
  if (moveCenter) {
    mapInstance.value.setCenter(position);
  }
};

const updateCoordinate = (x, y, moveCenter = false) => {
  const normalizedX = normalizeCoordinate(x);
  const normalizedY = normalizeCoordinate(y);
  if (normalizedX === '' || normalizedY === '') {
    return;
  }
  form.x = normalizedX;
  form.y = normalizedY;
  placeMarker(normalizedX, normalizedY, moveCenter);
};

const initMap = async () => {
  mapLoading.value = true;
  try {
    const AMap = await loadAmapSdk();

    if (mapInstance.value) {
      mapInstance.value.destroy();
      mapInstance.value = null;
      markerInstance.value = null;
      geocoderInstance.value = null;
    }

    const centerX = form.x === '' ? DEFAULT_X : Number(form.x);
    const centerY = form.y === '' ? DEFAULT_Y : Number(form.y);

    mapInstance.value = new AMap.Map(MAP_CONTAINER_ID, {
      zoom: 15,
      resizeEnable: true,
      center: [centerX, centerY],
    });

    geocoderInstance.value = new AMap.Geocoder({});

    mapInstance.value.on('click', (event) => {
      const x = event?.lnglat?.getLng?.() ?? event?.lnglat?.lng;
      const y = event?.lnglat?.getLat?.() ?? event?.lnglat?.lat;
      updateCoordinate(x, y);
    });

    if (form.x !== '' && form.y !== '') {
      placeMarker(Number(form.x), Number(form.y), true);
    }
  } catch (e) {
    error.value = e.message || 'Failed to init map';
  } finally {
    mapLoading.value = false;
  }
};

const loadShopTypes = async () => {
  const data = await getShopTypeList();
  shopTypes.value = Array.isArray(data) ? data : [];
  if (!form.typeId && shopTypes.value.length > 0) {
    form.typeId = shopTypes.value[0].id;
  }
};

const fillFormByDetail = (detail) => {
  form.id = detail.id;
  form.name = detail.name || '';
  form.typeId = detail.typeId || form.typeId;
  form.area = detail.area || '';
  form.address = detail.address || '';
  form.x = normalizeCoordinate(detail.x);
  form.y = normalizeCoordinate(detail.y);
};

const loadShopDetail = async () => {
  if (!isEditMode.value) {
    return;
  }
  const detail = await queryShopById(shopId.value);
  if (!detail || !detail.id) {
    throw new Error('Shop not found');
  }
  fillFormByDetail(detail);
};

const geocodeAddress = async () => {
  geoMessage.value = '';
  error.value = '';

  const address = form.address.trim();
  if (!address) {
    error.value = 'Address is required before geocoding';
    return false;
  }

  if (!geocoderInstance.value) {
    await initMap();
  }
  if (!geocoderInstance.value) {
    return false;
  }

  geocoding.value = true;
  return new Promise((resolve) => {
    geocoderInstance.value.getLocation(
      address,
      (status, result) => {
        geocoding.value = false;
        const location = result?.geocodes?.[0]?.location;
        const x = location?.getLng?.() ?? location?.lng;
        const y = location?.getLat?.() ?? location?.lat;
        if (status === 'complete' && Number.isFinite(Number(x)) && Number.isFinite(Number(y))) {
          updateCoordinate(x, y, true);
          geoMessage.value = 'Address geocoded successfully';
          resolve(true);
          return;
        }
        error.value = 'Unable to geocode this address';
        resolve(false);
      },
      form.area.trim() || undefined,
    );
  });
};

const validateForm = () => {
  if (!form.name.trim()) {
    return 'Name is required';
  }
  if (!form.typeId) {
    return 'Type is required';
  }
  if (!form.address.trim()) {
    return 'Address is required';
  }
  const x = Number(form.x);
  const y = Number(form.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return 'Coordinate x/y are required';
  }
  return '';
};

const buildPayload = () => {
  const payload = {
    name: form.name.trim(),
    typeId: Number(form.typeId),
    area: form.area.trim(),
    address: form.address.trim(),
    x: Number(form.x),
    y: Number(form.y),
  };
  if (isEditMode.value) {
    payload.id = form.id || shopId.value;
  }
  return payload;
};

const submitForm = async () => {
  error.value = '';
  success.value = '';
  geoMessage.value = '';

  const validationError = validateForm();
  if (validationError) {
    error.value = validationError;
    return;
  }

  const payload = buildPayload();
  submitting.value = true;
  try {
    if (isEditMode.value) {
      await updateShop(payload);
      success.value = 'Shop updated successfully';
      router.push(`/shops/${payload.id}`);
      return;
    }
    const newShopId = await createShop(payload);
    success.value = 'Shop created successfully';
    if (newShopId) {
      router.push(`/shops/${newShopId}`);
      return;
    }
    router.push('/shops');
  } catch (e) {
    error.value = e.message || 'Submit failed';
  } finally {
    submitting.value = false;
  }
};

const backToList = () => {
  router.push('/shops');
};

watch(
  () => [form.x, form.y],
  ([x, y]) => {
    if (!mapInstance.value) {
      return;
    }
    const numericX = Number(x);
    const numericY = Number(y);
    if (!Number.isFinite(numericX) || !Number.isFinite(numericY)) {
      return;
    }
    placeMarker(numericX, numericY);
  },
);

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    await loadShopTypes();
    await loadShopDetail();
  } catch (e) {
    error.value = e.message || 'Failed to load shop edit page';
  } finally {
    loading.value = false;
  }
  await nextTick();
  await initMap();
});

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value.destroy();
    mapInstance.value = null;
  }
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <div class="header-row">
        <h2>{{ pageTitle }}</h2>
        <button type="button" @click="backToList">Back to list</button>
      </div>
      <p class="muted">Fill address and choose location on map to save x/y.</p>

      <div v-if="loading">Loading shop data...</div>
      <template v-else>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="success" class="success">{{ success }}</div>
        <div v-if="geoMessage" class="success">{{ geoMessage }}</div>

        <div class="grid cols-2">
          <div class="stack">
            <label for="shop-name">Name</label>
            <input id="shop-name" v-model="form.name" placeholder="input shop name" />
          </div>
          <div class="stack">
            <label for="shop-type">Type</label>
            <select id="shop-type" v-model.number="form.typeId">
              <option v-for="type in shopTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid cols-2">
          <div class="stack">
            <label for="shop-area">Area</label>
            <input id="shop-area" v-model="form.area" placeholder="input area, e.g. Pudong" />
          </div>
          <div class="stack">
            <label for="shop-address">Address</label>
            <div class="address-row">
              <input
                id="shop-address"
                v-model="form.address"
                placeholder="input address"
                @blur="geocodeAddress"
              />
              <button
                type="button"
                :disabled="geocoding || mapLoading || !form.address.trim()"
                @click="geocodeAddress"
              >
                {{ geocoding ? 'Geocoding...' : 'Geocode' }}
              </button>
            </div>
          </div>
        </div>

        <div class="grid cols-2">
          <div class="stack">
            <label for="shop-x">Longitude (x)</label>
            <input id="shop-x" v-model="form.x" placeholder="auto filled by map or geocode" />
          </div>
          <div class="stack">
            <label for="shop-y">Latitude (y)</label>
            <input id="shop-y" v-model="form.y" placeholder="auto filled by map or geocode" />
          </div>
        </div>

        <div class="stack">
          <div class="muted">Click map to update x/y, marker will move with selected position.</div>
          <div id="shop-edit-map" class="map-container"></div>
          <div v-if="mapLoading" class="muted">Loading map...</div>
        </div>

        <div class="actions">
          <button type="button" :disabled="submitting" @click="submitForm">
            {{ submitting ? 'Saving...' : 'Save Shop' }}
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.address-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.map-container {
  width: 100%;
  height: 360px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .header-row {
    flex-wrap: wrap;
  }

  .actions {
    justify-content: stretch;
  }

  .actions button {
    width: 100%;
  }

  .map-container {
    height: 300px;
  }
}
</style>
