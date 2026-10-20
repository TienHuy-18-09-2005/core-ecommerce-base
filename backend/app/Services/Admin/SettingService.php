<?php

namespace App\Services\Admin;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    public function getSettingsByGroup(string $groupName)
    {
        return Cache::remember("settings_{$groupName}", 3600, function () use ($groupName) {
            return Setting::where('group_name', $groupName)->pluck('value', 'key_name');
        });
    }

    public function updateSettings(array $settingsData)
    {
        foreach ($settingsData as $key => $value) {
            $setting = Setting::where('key_name', $key)->first();
            if ($setting) {
                $setting->update(['value' => is_array($value) ? json_encode($value) : $value]);
                // Xóa cache của group tương ứng
                Cache::forget("settings_{$setting->group_name}");
            }
        }
        return true;
    }
}
