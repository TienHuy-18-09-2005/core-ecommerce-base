import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '../../services/productService';
import type { Product, ProductVariant } from '../../types/product';
import { ShoppingCart, ShieldCheck, Zap } from 'lucide-react';

export const ProductDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (slug) {
            productService.getProductDetail(slug)
                .then(data => {
                    setProduct(data);
                    // Mặc định chọn biến thể đầu tiên hoặc biến thể is_default
                    const defaultVar = data.variants.find(v => v.is_default) || data.variants[0];
                    setSelectedVariant(defaultVar || null);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Lỗi tải chi tiết sản phẩm thiết bị điện:", err);
                    setLoading(false);
                });
        }
    }, [slug]);

    if (loading) return <div className="p-10 text-center">Đang tải thông số thiết bị điện...</div>;
    if (!product) return <div className="p-10 text-center text-red-500">Không tìm thấy sản phẩm.</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Khu vực Hình ảnh */}
                <div>
                    <img
                        src={selectedVariant?.image_url || product.thumbnail_url || 'https://via.placeholder.com/500'}
                        alt={product.name}
                        className="w-full h-96 object-cover rounded-xl border shadow-sm"
                    />
                </div>

                {/* Khu vực Thông tin & Chọn biến thể */}
                <div>
                    <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                        {product.brand?.name || 'Thiết bị điện chính hãng'}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 mt-1">{product.name}</h1>

                    {/* Giá hiển thị theo biến thể được chọn */}
                    <div className="my-4 p-4 bg-gray-50 rounded-lg flex items-baseline gap-4">
                        <span className="text-3xl font-extrabold text-red-600">
                            {selectedVariant ? Number(selectedVariant.price).toLocaleString('vi-VN') : 'Liên hệ'} đ
                        </span>
                        {selectedVariant?.compare_at_price && (
                            <span className="text-lg text-gray-400 line-through">
                                {Number(selectedVariant.compare_at_price).toLocaleString('vi-VN')} đ
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
                                        onClick={() => setSelectedVariant(variant)}
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
                            max={selectedVariant?.stock_quantity || 1}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 border border-gray-300 rounded-lg text-center py-2"
                        />
                        <button
                            disabled={!selectedVariant || selectedVariant.stock_quantity <= 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-300 transition-colors"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Thêm vào giỏ hàng
                        </button>
                    </div>

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
                                <span className="w-2/3 text-gray-900">{value as string}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};