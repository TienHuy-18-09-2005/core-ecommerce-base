<?php

namespace App\Services\Support;

use App\Models\AdminAuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    /** Các trường không bao giờ ghi vào nhật ký. */
    private const HIDDEN = ['password', 'remember_token'];

    public function record(string $action, Model|string $subject, ?array $changes = null, ?int $subjectId = null): AdminAuditLog
    {
        $type = $subject instanceof Model ? class_basename($subject) : $subject;
        $id = $subject instanceof Model ? $subject->getKey() : $subjectId;
        $request = request();

        return AdminAuditLog::create([
            'user_id' => $request?->user()?->id,
            'action' => $action,
            'subject_type' => $type,
            'subject_id' => $id,
            'changes' => $changes ? array_diff_key($changes, array_flip(self::HIDDEN)) : null,
            'ip_address' => $request?->ip(),
        ]);
    }

    /** Diff gọn: chỉ các trường thay đổi, dạng [field => [old, new]]. */
    public function diff(array $before, array $after): array
    {
        $out = [];
        foreach ($after as $key => $value) {
            $old = $before[$key] ?? null;
            if ($old != $value) {
                $out[$key] = [$old, $value];
            }
        }

        return $out;
    }
}
