<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email đặt lại mật khẩu (tiếng Việt); link trỏ về SPA, không trỏ về API. */
class ResetPasswordVi extends Notification
{
    public function __construct(public string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public static function url(object $notifiable, string $token): string
    {
        return config('app.frontend_url').'/dat-lai-mat-khau?'.http_build_query([
            'token' => $token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Đặt lại mật khẩu')
            ->greeting('Xin chào '.$notifiable->name.',')
            ->line('Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.')
            ->action('Đặt lại mật khẩu', self::url($notifiable, $this->token))
            ->line("Liên kết có hiệu lực trong {$minutes} phút.")
            ->line('Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu sẽ không thay đổi.')
            ->salutation('Trân trọng, '.config('app.name'));
    }
}
