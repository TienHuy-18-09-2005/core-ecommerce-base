<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Ghi chú nội bộ của đơn — chỉ admin thấy, không bao giờ trả cho khách. */
class OrderNote extends Model
{
    protected $fillable = ['order_id', 'user_id', 'body'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
