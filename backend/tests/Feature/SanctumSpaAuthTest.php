<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Tests\TestCase;

class SanctumSpaAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_stateful_api_middleware_is_enabled(): void
    {
        $this->assertContains(
            EnsureFrontendRequestsAreStateful::class,
            Route::getMiddlewareGroups()['api'] ?? []
        );
        $this->assertTrue(config('cors.supports_credentials'));
        $this->assertContains('http://localhost:5173', config('cors.allowed_origins'));
        $this->assertContains('localhost:5173', config('sanctum.stateful'));
        $this->assertSame('lax', config('session.same_site'));
    }

    public function test_csrf_cookie_endpoint_sets_a_readable_xsrf_cookie(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost:5173')
            ->withCredentials()
            ->get('/sanctum/csrf-cookie');

        $response->assertNoContent();
        $response->assertCookie('XSRF-TOKEN');
        $response->assertCookie(config('session.cookie'));

        $xsrf = $response->getCookie('XSRF-TOKEN', false);
        $this->assertNotNull($xsrf);
        $this->assertFalse($xsrf->isHttpOnly());

        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_unknown_origin_is_not_granted_credentialed_cors(): void
    {
        $response = $this->withHeader('Origin', 'https://evil.example')
            ->getJson('/api/user');

        $this->assertNotSame('https://evil.example', $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_only_configured_spa_origins_are_treated_as_stateful(): void
    {
        $spa = Request::create('/api/user', 'GET', server: [
            'HTTP_ORIGIN' => 'http://localhost:5173',
        ]);
        $anonymous = Request::create('/api/user', 'GET');
        $foreign = Request::create('/api/user', 'GET', server: [
            'HTTP_ORIGIN' => 'https://evil.example',
        ]);

        $this->assertTrue(EnsureFrontendRequestsAreStateful::fromFrontend($spa));
        $this->assertFalse(EnsureFrontendRequestsAreStateful::fromFrontend($anonymous));
        $this->assertFalse(EnsureFrontendRequestsAreStateful::fromFrontend($foreign));
    }

    public function test_session_cookie_authenticates_a_stateful_spa_request(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $user->wasRecentlyCreated = false;

        Route::middleware('web')->post('/_test/login', function () use ($user) {
            auth('web')->login($user);

            return response()->noContent();
        });

        $login = $this->post('/_test/login');
        $login->assertNoContent();

        $sessionCookie = $login->getCookie(config('session.cookie'), false);
        $this->assertNotNull($sessionCookie);

        $this->withCredentials()
            ->withUnencryptedCookie(config('session.cookie'), $sessionCookie->getValue())
            ->withHeader('Origin', 'http://localhost:5173')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_api_user_requires_authentication(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
    }
}
