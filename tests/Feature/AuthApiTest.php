<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use DatabaseMigrations;

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Auth User',
            'phone' => '966511122601',
            'password' => bcrypt('password123'),
        ], $overrides));
    }

    // ── Logout ─────────────────────────────────────────────────

    public function test_user_logout_revokes_token(): void
    {
        $user = $this->createUser();
        $token = $user->createToken('mobile')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Reset the memoized guard so the next request re-validates the token.
        $this->app->make('auth')->forgetGuards();

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertStatus(401);
    }

    public function test_logout_requires_auth(): void
    {
        $this->postJson('/api/v1/logout')->assertStatus(401);
    }

    // ── Google login ───────────────────────────────────────────

    public function test_google_login_returns_501_when_not_configured(): void
    {
        Config::set('services.google.client_id', '');

        $res = $this->postJson('/api/v1/google/login', ['id_token' => 'abc']);

        $res->assertStatus(501);
    }

    public function test_google_login_creates_new_user(): void
    {
        Config::set('services.google.client_id', 'google-client-123');

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'google-client-123',
                'sub' => 'google-sub-999',
                'email' => 'guser@example.com',
                'name' => 'Gina Google',
            ]),
        ]);

        $res = $this->postJson('/api/v1/google/login', ['id_token' => 'valid-token']);

        $res->assertOk()
            ->assertJsonStructure(['message', 'token', 'user'])
            ->assertJsonPath('user.name', 'Gina Google')
            ->assertJsonPath('user.email', 'guser@example.com');

        $this->assertDatabaseHas('users', ['google_id' => 'google-sub-999']);
        $this->assertNotNull(User::where('google_id', 'google-sub-999')->first()->phone);
    }

    public function test_google_login_returns_existing_user_by_google_id(): void
    {
        Config::set('services.google.client_id', 'google-client-123');
        $user = $this->createUser(['google_id' => 'google-sub-777']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'google-client-123',
                'sub' => 'google-sub-777',
                'email' => 'existing@example.com',
                'name' => 'Existing User',
            ]),
        ]);

        $res = $this->postJson('/api/v1/google/login', ['id_token' => 'valid-token']);

        $res->assertOk()->assertJsonPath('user.id', $user->id);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_google_login_returns_existing_user_by_email(): void
    {
        Config::set('services.google.client_id', 'google-client-123');
        $this->createUser(['email' => 'matched@example.com']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'google-client-123',
                'sub' => 'google-sub-222',
                'email' => 'matched@example.com',
                'name' => 'Matched User',
            ]),
        ]);

        $res = $this->postJson('/api/v1/google/login', ['id_token' => 'valid-token']);

        $res->assertOk()->assertJsonPath('user.email', 'matched@example.com');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_google_login_rejects_wrong_audience(): void
    {
        Config::set('services.google.client_id', 'google-client-123');

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'another-app',
                'sub' => 'google-sub-111',
                'email' => 'wrong@example.com',
                'name' => 'Wrong',
            ]),
        ]);

        $this->postJson('/api/v1/google/login', ['id_token' => 'valid-token'])->assertStatus(401);
    }

    public function test_google_login_rejects_failed_tokeninfo_response(): void
    {
        Config::set('services.google.client_id', 'google-client-123');

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response('Bad Request', 400),
        ]);

        $this->postJson('/api/v1/google/login', ['id_token' => 'garbage'])->assertStatus(401);
    }

    public function test_google_login_requires_id_token(): void
    {
        Config::set('services.google.client_id', 'google-client-123');

        $this->postJson('/api/v1/google/login', [])->assertStatus(422);
    }
}