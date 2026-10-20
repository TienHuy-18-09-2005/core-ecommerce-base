<?php

namespace Tests\Feature;

use Tests\TestCase;

class InfrastructureConfigTest extends TestCase
{
    public function test_compose_does_not_publish_datastores_and_reads_passwords_from_env(): void
    {
        $compose = file_get_contents(dirname(base_path()).'/docker-compose.yml');
        $nginx = file_get_contents(base_path('docker/nginx/default.conf'));
        $env = file_get_contents(base_path('.env.example'));

        $this->assertIsString($compose);
        $this->assertStringContainsString('./backend/docker/nginx/default.conf:/etc/nginx/conf.d/default.conf', $compose);
        $this->assertStringNotContainsString('./docker/nginx/default.conf', $compose);
        $this->assertStringNotContainsString('33066:3306', $compose);
        $this->assertStringNotContainsString('63790:6379', $compose);
        $this->assertStringNotContainsString('rootsecret', $compose);
        $this->assertStringContainsString('DB_PASSWORD', $compose);
        $this->assertStringContainsString('--requirepass', $compose);
        $this->assertStringContainsString('REDIS_PASSWORD', $compose);

        $this->assertStringContainsString('Content-Security-Policy', $nginx);
        $this->assertStringContainsString("frame-ancestors 'none'", $nginx);
        $this->assertStringContainsString('http://localhost:5173', $nginx);
        $this->assertStringContainsString('ws://localhost:5173', $nginx);
        $this->assertStringContainsString('resolver 127.0.0.11', $nginx);
        $this->assertStringContainsString('APP_KEY', $compose);
        $this->assertStringContainsString('DB_HOST: mysql', $compose);
        $this->assertStringContainsString('REDIS_HOST: redis', $compose);
        $this->assertStringContainsString('X-Content-Type-Options "nosniff"', $nginx);
        $this->assertStringContainsString('Referrer-Policy', $nginx);

        $this->assertMatchesRegularExpression('/^APP_DEBUG=false$/m', $env);
        $this->assertMatchesRegularExpression('/^DB_CONNECTION=mysql$/m', $env);
        $this->assertMatchesRegularExpression('/^DB_HOST=mysql$/m', $env);
        $this->assertMatchesRegularExpression('/^CACHE_STORE=redis$/m', $env);
        $this->assertMatchesRegularExpression('/^SESSION_DRIVER=redis$/m', $env);
        $this->assertMatchesRegularExpression('/^QUEUE_CONNECTION=redis$/m', $env);
        $this->assertMatchesRegularExpression('/^REDIS_HOST=redis$/m', $env);
        $this->assertDoesNotMatchRegularExpression('/^DB_CONNECTION=sqlite$/m', $env);
        $this->assertDoesNotMatchRegularExpression('/^CACHE_STORE=database$/m', $env);
    }
}
