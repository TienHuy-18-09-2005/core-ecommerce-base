<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Email xác thực (tiếng Việt). Chữ ký được tạo trên đường dẫn API TƯƠNG ĐỐI
 * (signed:relative), rồi đưa id/hash/expires/signature sang trang SPA /xac-thuc-email;
 * trang này gọi lại API để xác thực.
 */
class VerifyEmailVi extends Notification
{
    public const EXPIRE_MINUTES = 60;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public static function url(object $notifiable): string
    {
        $relative = URL::temporarySignedRoute('verification.verify', now()->addMinutes(self::EXPIRE_MINUTES), [
            'id' => $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
        ], absolute: false);

        parse_str((string) parse_url($relative, PHP_URL_QUERY), $query);

        return config('app.frontend_url').'/xac-thuc-email?'.http_build_query([
            'id' => $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
            'expires' => $query['expires'] ?? '',
            'signature' => $query['signature'] ?? '',
        ]);
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Xác thực địa chỉ email')
            ->greeting('Xin chào '.$notifiable->name.',')
            ->line('Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực email để có thể đặt hàng bằng tài khoản.')
            ->action('Xác thực email', self::url($notifiable))
            ->line('Liên kết có hiệu lực trong '.self::EXPIRE_MINUTES.' phút.')
            ->line('Nếu bạn không tạo tài khoản, hãy bỏ qua email này.')
            ->salutation('Trân trọng, '.config('app.name'));
    }
}
