<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use DatabaseMigrations;

    private function createUser(string $phone = '966511122250', ?string $email = 'profile@example.com'): User
    {
        return User::create([
            'name' => 'Profile User',
            'phone' => $phone,
            'email' => $email,
            'password' => bcrypt('password123'),
        ]);
    }

    private function auth(User $user): self
    {
        $this->actingAs($user, 'sanctum');

        return $this;
    }

    public function test_me_returns_current_user(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.name', 'Profile User');
    }

    public function test_update_profile_changes_name_and_email(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $res = $this->putJson('/api/v1/profile', [
            'name' => 'Updated Name',
            'email' => 'new@example.com',
        ]);

        $res->assertOk()
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.email', 'new@example.com');

        $this->assertSame('Updated Name', $user->fresh()->name);
        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    public function test_update_profile_allows_null_email(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $this->putJson('/api/v1/profile', ['name' => 'No Email', 'email' => null])
            ->assertOk()
            ->assertJsonPath('user.email', null);
    }

    public function test_update_profile_rejects_duplicate_email(): void
    {
        $user = $this->createUser();
        $other = $this->createUser('966511122251', null);
        $other->update(['email' => 'taken@example.com']);
        $this->auth($user);

        $this->putJson('/api/v1/profile', ['email' => 'taken@example.com'])
            ->assertStatus(422);
    }

    public function test_update_profile_keeps_own_email(): void
    {
        $user = $this->createUser();
        $user->update(['email' => 'mine@example.com']);
        $this->auth($user);

        // Re-submitting your own email must not collide with the unique rule.
        $this->putJson('/api/v1/profile', ['email' => 'mine@example.com'])
            ->assertOk()
            ->assertJsonPath('user.email', 'mine@example.com');
    }

    public function test_update_profile_validates_name_min_length(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $this->putJson('/api/v1/profile', ['name' => 'ab'])
            ->assertStatus(422);
    }

    public function test_change_password_success(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $this->putJson('/api/v1/password', [
            'current_password' => 'password123',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ])->assertOk();

        $this->assertTrue(password_verify('newpass123', $user->fresh()->password));
    }

    public function test_change_password_rejects_wrong_current_password(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $this->putJson('/api/v1/password', [
            'current_password' => 'wrongpass',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ])->assertStatus(422);

        $this->assertTrue(password_verify('password123', $user->fresh()->password));
    }

    public function test_push_token_can_be_registered(): void
    {
        $user = $this->createUser();
        $this->auth($user);

        $this->postJson('/api/v1/push-token', [
            'push_token' => 'ExponentPushToken[abc123]',
        ])->assertOk();

        $this->assertSame('ExponentPushToken[abc123]', $user->fresh()->push_token);
    }
}