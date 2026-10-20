import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    withXSRFToken: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

let csrfPromise: Promise<void> | null = null;

function ensureCsrfCookie(): Promise<void> {
    if (!csrfPromise) {
        csrfPromise = axios
            .get('/sanctum/csrf-cookie', { withCredentials: true, withXSRFToken: true })
            .then(() => undefined)
            .catch((error: unknown) => {
                csrfPromise = null;
                throw error;
            });
    }

    return csrfPromise;
}

export const cartService = {
    async getCart() {
        const res = await api.get('/cart');
        return res.data.data;
    },
    async addToCart(product_variant_id: number, quantity: number) {
        await ensureCsrfCookie();
        const res = await api.post('/cart', { product_variant_id, quantity });
        return res.data.data;
    },
    async updateQuantity(itemId: number, quantity: number) {
        await ensureCsrfCookie();
        const res = await api.put(`/cart/${itemId}`, { quantity });
        return res.data.data;
    },
    async removeItem(itemId: number) {
        await ensureCsrfCookie();
        const res = await api.delete(`/cart/${itemId}`);
        return res.data.data;
    },
};
