<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductMedia extends Model
{
    public $timestamps = false; // Chỉ có created_at hoặc không dùng timestamps tùy migration

    protected $fillable = [
        'product_id',
        'file_url',
        'file_path',
        'media_type',
        'alt_text',
        'sort_order',
        'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_primary' => 'boolean',
        ];
    }

    protected $hidden = ['file_path'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
