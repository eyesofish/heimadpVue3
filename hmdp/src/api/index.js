import http from './http';

// user
export const sendUserCode = (phone) => http.post('/user/code', null, { params: { phone } });
export const loginUser = (data) => http.post('/user/login', data);
export const logoutUser = () => http.post('/user/logout');
export const getCurrentUser = () => http.get('/user/me');
export const getUserInfo = (id) => http.get(`/user/info/${id}`);
export const getUserById = (id) => http.get(`/user/${id}`);
export const userSign = () => http.post('/user/sign');
export const getSignCount = () => http.get('/user/sign/count');

// shop / shop-type
export const queryShopById = (id) => http.get(`/shop/${id}`);
export const getShopDetail = queryShopById;
export const createShop = (data) => http.post('/shop', data);
export const updateShop = (data) => http.put('/shop', data);
export const getShopList = (params) => http.get('/shop/of/type', { params });
export const searchShopsByName = (params) => http.get('/shop/of/name', { params });
export const getShopTypeList = () => http.get('/shop-type/list');

// blog
export const createBlog = (data) => http.post('/blog', data);
export const toggleBlogLike = (id) => http.put(`/blog/like/${id}`);
export const getMyBlogs = (current = 1) => http.get('/blog/of/me', { params: { current } });
export const getHotBlogs = (current = 1) => http.get('/blog/hot', { params: { current } });
export const getBlogDetail = (id) => http.get(`/blog/${id}`);
export const getBlogLikes = (id) => http.get(`/blog/likes/${id}`);
export const getBlogsByUser = (params) => http.get('/blog/of/user', { params });
export const getFollowBlogs = (params) => http.get('/blog/of/follow', { params });

// follow
export const updateFollowStatus = (id, isFollow) => http.put(`/follow/${id}/${isFollow}`);
export const getFollowStatus = (id) => http.get(`/follow/or/not/${id}`);
export const getCommonFollowUsers = (id) => http.get(`/follow/common/${id}`);

// voucher
export const createVoucher = (data) => http.post('/voucher', data);
export const createSeckillVoucher = (data) => http.post('/voucher/seckill', data);
export const getVoucherList = (shopId) => http.get(`/voucher/list/${shopId}`);

// voucher-order
export const createOrder = (voucherId) => http.post(`/voucher-order/seckill/${voucherId}`);
export const getOrderDetail = (orderId) => http.get(`/voucher-order/${orderId}`);
export const getOrderList = (params) => http.get('/voucher-order/of/me', { params });

// upload
export const uploadBlogImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return http.post('/upload/blog', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const deleteBlogImage = (name) => http.get('/upload/blog/delete', { params: { name } });
