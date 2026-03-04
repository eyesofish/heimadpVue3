import { createRouter, createWebHashHistory } from 'vue-router';
import { authState } from '../stores/user';
import ShopList from '../pages/ShopList.vue';
import ShopDetail from '../pages/ShopDetail.vue';
import CreateOrder from '../pages/CreateOrder.vue';
import OrderList from '../pages/OrderList.vue';
import Login from '../pages/Login.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/shops',
    },
    {
      path: '/shops',
      name: 'shop-list',
      component: ShopList,
    },
    {
      path: '/shops/:id',
      name: 'shop-detail',
      component: ShopDetail,
      props: true,
    },
    {
      path: '/orders/create/:voucherId',
      name: 'create-order',
      component: CreateOrder,
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/orders',
      name: 'order-list',
      component: OrderList,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/shops',
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !authState.token) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    };
  }
  return true;
});

export default router;
