import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Zap } from 'lucide-react';
import { useCartDrawer } from '../../app/useCartDrawer';
import { ImageGallery } from '../../components/shop/ImageGallery';
import { useAddToCartMutation, useCartQuery } from '../../hooks/useCartQuery';
import { useProductDetailQuery } from '../../hooks/useCatalogQuery';
import { ApiError } from '../../services/apiError';
import type { Product, ProductVariant } from '../../types/product';
import { Breadcrumb } from '../../components/shop/catalog/Breadcrumb';
import { formatCurrency } from '../../utils/formatCurrency';

/** Task 2.9: state reset khi đổi slug (remount theo key), request cũ bị huỷ qua AbortSignal, 404 thật. */
export const ProductDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const query = useProductDetailQuery(slug);

    if (query.isPending) return <div className="p-10 text-center" aria-busy="true">Đang tải thông số thiết bị điện...</div>;
    if (query.isError) {
        if (query.error instanceof ApiError && query.error.status === 404) {
            return (
                <section className="rounded-2xl bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-blue-700">404</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Không tìm thấy sản phẩm</h1>
                    <p className="mt-3 text-slate-600">Sản phẩm này không tồn tại hoặc đã ngừng bán.</p>
                    <Link to="/san-pham" className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">
                        Xem sản phẩm khác
                    </Link>
                </section>
            );
        }
        return (
            <div role="alert" className="p-10 text-center text-red-700">
                <p>{query.error instanceof ApiError ? query.error.message : 'Không tải được sản phẩm.'}</p>
                <button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">
                    Thử lại
                </button>
            </div>
        );
    }

    return <ProductDetailView key={query.data.slug} product={query.data} />;
};

function defaultVariant(product: Product): ProductVariant | null {
    return product.variants.find(v => v.is_default) || product.variants[0] || null;
}

const ProductDetailView: React.FC<{ product: Product }> = ({ product }) => {
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(() => defaultVariant(product));
    const [quantity, setQuantity] = useState<number>(1);
    const drawer = useCartDrawer();
    const addToCart = useAddToCartMutation({ onAdded: drawer.open });
    const cart = useCartQuery();
    const inCart = cart.data?.items.find(item => item.product_variant_id === selectedVariant?.id)?.quantity ?? 0;
    const stock = selectedVariant?.stock_quantity ?? 0;
    const remaining = Math.max(0, stock - inCart);
    const galleryImages = [
        { src: product.thumbnail_url, alt: product.name },
        ...product.media.filter(m => m.media_type === 'image').map(m => ({ src: m.file_url, alt: m.alt_text || product.name })),
        ...product.variants.map(v => ({ src: v.image_url, alt: `${product.name} - ${v.name}` })),
    ];
    const category = product.categories?.[0];

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Breadcrumb items={[
                { label: 'Trang chủ', to: '/' },
                { label: 'Sản phẩm', to: '/san-pham' },
                ...(category ? [{ label: category.name, to: `/san-pham?category_id=${category.id}` }] : []),
                { label: product.name },
            ]} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Khu vực Hình ảnh */}
                <div>
                    <ImageGallery images={galleryImages} activeSrc={selectedVariant?.image_url || product.thumbnail_url} />
                </div>

                {/* Khu vực Thông tin & Chọn biến thể */}
                <div>
                    <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                        {product.brand?.name || 'Thiết bị điện chính hãng'}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 mt-1">{product.name}</h1>

                    {/* Giá hiển thị theo biến thể được chọn */}
                    <div className="my-4 p-4 bg-gray-50 rounded-lg flex items-baseline gap-4">
                        <span className="text-3xl font-extrabold text-red-600 tabular-nums">
                            {selectedVariant ? formatCurrency(selectedVariant.price) : 'Liên hệ'}
                        </span>
                        {selectedVariant?.compare_at_price && (
                            <span className="text-lg text-slate-600 line-through tabular-nums">
                                {formatCurrency(selectedVariant.compare_at_price)}
                            </span>
                        )}
                    </div>

                    <p className="text-gray-600 mb-6">{product.short_description}</p>

                    {/* Danh sách biến thể (SKU) */}
                    {product.has_variants && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phân loại / Công suất:</label>
                            <div className="flex flex-wrap gap-3">
                                {product.variants.map(variant => (
                                    <button
                                        key={variant.id}
                                        type="button"
                                        aria-pressed={selectedVariant?.id === variant.id}
                                        onClick={() => { setSelectedVariant(variant); setQuantity(1); }}
                                        className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${selectedVariant?.id === variant.id
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        {variant.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tồn kho & Đơn vị tính */}
                    <div className="mb-6 text-sm text-gray-600 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Tồn kho thực tế: <strong>{selectedVariant?.stock_quantity ?? 0}</strong> {product.unit}</span>
                    </div>

                    {/* Nút Thêm vào giỏ hàng */}
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            min="1"
                            max={Math.max(1, remaining)}
                            value={quantity}
                            aria-label="Số lượng"
                            onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), Math.max(1, remaining)))}
                            className="w-20 border border-gray-300 rounded-lg text-center py-2"
                        />
                        <button
                            type="button"
                            disabled={!selectedVariant || remaining <= 0 || quantity > remaining || addToCart.isPending}
                            onClick={() => {
                                if (!selectedVariant) {
                                    return;
                                }
                                addToCart.mutate({
                                    productVariantId: selectedVariant.id,
                                    quantity,
                                });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-300 transition-colors"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {addToCart.isPending ? 'Đang thêm...' : stock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
                        </button>
                    </div>
                    {inCart > 0 ? (
                        <p className="mt-2 text-sm text-slate-600" role="status">
                            Bạn đã có {inCart} sản phẩm này trong giỏ{remaining <= 0 ? ' — đã đạt số lượng tồn kho tối đa.' : '.'}
                        </p>
                    ) : null}

                    {/* Cam kết kỹ thuật */}
                    <div className="mt-8 border-t pt-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                            <span>Bảo hành chính hãng 12-24 tháng</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-600" />
                            <span>Đạt chuẩn kỹ thuật ngành điện</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thông số kỹ thuật dạng JSON specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mt-12 bg-white border rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Thông số kỹ thuật chi tiết</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(product.specifications).map(([key, value]) => (
                            <div key={key} className="flex border-b pb-2">
                                <span className="w-1/3 font-medium text-gray-500">{key}</span>
                                <span className="w-2/3 text-gray-900">{typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};