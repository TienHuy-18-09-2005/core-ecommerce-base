import axios from 'axios';

// Tạo hoặc lấy session_id vãng lai lưu localStorage
const getSessionId = () => {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36.substring(2)) + Date.now();
        localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
};

const api = axios.create({
    baseURL: '/api',
    headers: {
        'X-Session-ID': getSessionId()
    }
});

export const cartService = {
    async getCart() {
        const res = await api.get('/cart');
        return res.data.data;
    },
    async addToCart(product_variant_id: number, quantity: number) {
        const res = await api.post('/cart', { product_variant_id, quantity });
        return res.data.data;
    },
    async updateQuantity(itemId: number, quantity: number) {
        const res = await api.put(`/cart/${itemId}`, { quantity });
        return res.data.data;
    },
    async removeItem(itemId: number) {
        const res = await api.delete(`/cart/${itemId}`);
        return res.data.data;
    }
};