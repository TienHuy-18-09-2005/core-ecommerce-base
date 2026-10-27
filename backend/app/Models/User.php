<?php

namespace App\Models;

use App\Notifications\ResetPasswordVi;
use App\Notifications\VerifyEmailVi;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Services\Admin\PermissionService;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'avatar_url',
        'is_active',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(UserAddress::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    /** Vai trò RBAC (chỉ có tác dụng với role=staff; admin luôn có mọi quyền). */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_role');
    }

    /** @return list<string> */
    public function permissions(): array
    {
        return app(PermissionService::class)->for($this);
    }

    public function hasPermission(string $permission): bool
    {
        return app(PermissionService::class)->has($this, $permission);
    }

    public function cart()
    {
        return $this->hasOne(Cart::class);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify((new ResetPasswordVi($token))->locale('vi'));
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify((new VerifyEmailVi)->locale('vi'));
    }
}
