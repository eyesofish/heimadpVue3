const ORDER_HISTORY_KEY = 'local_order_history';

export const getLocalOrders = () => {
  const raw = localStorage.getItem(ORDER_HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addLocalOrder = (order) => {
  const current = getLocalOrders();
  const next = [order, ...current];
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(next));
  return next;
};

export const clearLocalOrders = () => {
  localStorage.removeItem(ORDER_HISTORY_KEY);
};
