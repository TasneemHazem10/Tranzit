<?php

namespace Tests\Feature;

use App\Models\OtpCode;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

class OtpSmsTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('app.otp_debug', false);

        $this->smsMock = Mockery::mock(SmsService::class);
        $this->smsMock->shouldReceive('send')->andReturn(true);
        $this->app->instance(SmsService::class, $this->smsMock);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User',
            'phone' => '966500000001',
            'password' => bcrypt('password123'),
        ], $overrides));
    }

    // ── SmsService unit tests ──────────────────────────────────

    public function test_sms_service_returns_false_when_twilio_not_configured(): void
    {
        Config::set('services.twilio.sid', '');
        Config::set('services.twilio.auth_token', '');
        Config::set('services.twilio.from', '');

        $sms = new SmsService();
        $result = $sms->send('+966500000001', 'Your code is 1234');

        $this->assertFalse($result);
    }

    // ── Register + OTP + Verify flow ───────────────────────────

    public function test_register_returns_needs_otp_without_debug_code(): void
    {
        $response = $this->postJson('/api/v1/register', [
            'name' => 'Ahmed',
            'phone' => '966500000010',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'needs_otp', 'phone'])
            ->assertJsonMissing(['debug_code']);
    }

    public function test_register_creates_otp_in_database(): void
    {
        $this->postJson('/api/v1/register', [
            'name' => 'Ahmed',
            'phone' => '966500000011',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $otp = OtpCode::where('phone', '966500000011')
            ->where('purpose', 'register')
            ->latest()
            ->first();

        $this->assertNotNull($otp);
        $this->assertMatchesRegularExpression('/^\d{4}$/', $otp->code);
        $this->assertNull($otp->consumed_at);
        $this->assertTrue($otp->expires_at->isFuture());
    }

    public function test_register_sends_sms(): void
    {
        $this->postJson('/api/v1/register', [
            'name' => 'Sara',
            'phone' => '966500000012',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $otp = OtpCode::where('phone', '966500000012')
            ->where('purpose', 'register')
            ->latest()
            ->first();

        $this->assertNotNull($otp);
        $this->assertMatchesRegularExpression('/^\d{4}$/', $otp->code);

        $this->smsMock->shouldHaveReceived('send')
            ->once()
            ->with('966500000012', Mockery::on(fn ($msg) => str_contains($msg, $otp->code)));
    }

    public function test_verify_otp_after_register_returns_token(): void
    {
        $this->postJson('/api/v1/register', [
            'name' => 'Sara',
            'phone' => '966500000013',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $otp = OtpCode::where('phone', '966500000013')
            ->where('purpose', 'register')
            ->latest()
            ->first();

        $response = $this->postJson('/api/v1/otp/verify', [
            'phone' => '966500000013',
            'code' => $otp->code,
            'purpose' => 'register',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message', 'token', 'user']);

        $otp->refresh();
        $this->assertNotNull($otp->consumed_at);

        $user = User::where('phone', '966500000013')->first();
        $this->assertNotNull($user->phone_verified_at);
    }

    public function test_verify_wrong_otp_code_fails(): void
    {
        $this->postJson('/api/v1/register', [
            'name' => 'Ali',
            'phone' => '966500000014',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response = $this->postJson('/api/v1/otp/verify', [
            'phone' => '966500000014',
            'code' => '0000',
            'purpose' => 'register',
        ]);

        $response->assertStatus(422);
    }

    // ── Login + OTP flow ───────────────────────────────────────

    public function test_login_sends_otp_without_debug_code(): void
    {
        $this->createUser(['phone' => '966500000020']);

        $response = $this->postJson('/api/v1/login', [
            'phone' => '966500000020',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message', 'needs_otp', 'phone'])
            ->assertJsonMissing(['debug_code']);
    }

    public function test_login_sends_sms(): void
    {
        $this->createUser(['phone' => '966500000021']);

        $this->postJson('/api/v1/login', [
            'phone' => '966500000021',
            'password' => 'password123',
        ]);

        $otp = OtpCode::where('phone', '966500000021')
            ->where('purpose', 'login')
            ->latest()
            ->first();

        $this->assertNotNull($otp);
        $this->assertMatchesRegularExpression('/^\d{4}$/', $otp->code);
    }

    public function test_login_wrong_password_fails(): void
    {
        $this->createUser(['phone' => '966500000022']);

        $response = $this->postJson('/api/v1/login', [
            'phone' => '966500000022',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    // ── Forgot Password + Reset flow ───────────────────────────

    public function test_forgot_password_sends_otp_without_debug_code(): void
    {
        $this->createUser(['phone' => '966500000030']);

        $response = $this->postJson('/api/v1/forgot-password', [
            'phone' => '966500000030',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message', 'needs_otp', 'phone'])
            ->assertJsonMissing(['debug_code']);
    }

    public function test_forgot_password_sends_sms(): void
    {
        $this->createUser(['phone' => '966500000031']);

        $this->postJson('/api/v1/forgot-password', [
            'phone' => '966500000031',
        ]);

        $otp = OtpCode::where('phone', '966500000031')
            ->where('purpose', 'reset')
            ->latest()
            ->first();

        $this->assertNotNull($otp);
        $this->assertMatchesRegularExpression('/^\d{4}$/', $otp->code);
    }

    public function test_forgot_password_nonexistent_phone_fails(): void
    {
        $response = $this->postJson('/api/v1/forgot-password', [
            'phone' => '9999999999',
        ]);

        $response->assertStatus(422);
    }

    public function test_reset_password_after_forgot_password_works(): void
    {
        $this->createUser(['phone' => '966500000032']);

        $this->postJson('/api/v1/forgot-password', [
            'phone' => '966500000032',
        ]);

        $otp = OtpCode::where('phone', '966500000032')
            ->where('purpose', 'reset')
            ->latest()
            ->first();

        $response = $this->postJson('/api/v1/reset-password', [
            'phone' => '966500000032',
            'code' => $otp->code,
            'password' => 'newpassword456',
            'password_confirmation' => 'newpassword456',
        ]);

        $response->assertOk();

        $user = User::where('phone', '966500000032')->first();
        $this->assertTrue(password_verify('newpassword456', $user->password));
        $this->assertFalse(password_verify('password123', $user->password));
    }

    // ── Resend OTP ─────────────────────────────────────────────

    public function test_resend_otp_without_debug_code(): void
    {
        $this->createUser(['phone' => '966500000040']);

        $this->postJson('/api/v1/login', [
            'phone' => '966500000040',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/v1/otp/send', [
            'phone' => '966500000040',
            'purpose' => 'login',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message'])
            ->assertJsonMissing(['debug_code']);
    }

    public function test_resend_otp_invalidates_previous_code(): void
    {
        $this->createUser(['phone' => '966500000041']);

        $this->postJson('/api/v1/login', [
            'phone' => '966500000041',
            'password' => 'password123',
        ]);

        $oldOtp = OtpCode::where('phone', '966500000041')
            ->where('purpose', 'login')
            ->latest()
            ->first();

        $this->postJson('/api/v1/otp/send', [
            'phone' => '966500000041',
            'purpose' => 'login',
        ]);

        $oldOtp->refresh();
        $this->assertNotNull($oldOtp->consumed_at);

        $total = OtpCode::where('phone', '966500000041')
            ->where('purpose', 'login')
            ->count();

        $this->assertSame(2, $total);

        $newOtp = OtpCode::where('phone', '966500000041')
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        $this->assertNotNull($newOtp);
    }

    // ── OTP expiry ─────────────────────────────────────────────

    public function test_expired_otp_cannot_be_verified(): void
    {
        $this->createUser(['phone' => '966500000050']);

        OtpCode::create([
            'phone' => '966500000050',
            'code' => '1234',
            'purpose' => 'login',
            'expires_at' => now()->subMinutes(5),
        ]);

        $response = $this->postJson('/api/v1/otp/verify', [
            'phone' => '966500000050',
            'code' => '1234',
            'purpose' => 'login',
        ]);

        $response->assertStatus(422);
    }

    // ── Consumed OTP cannot be reused ──────────────────────────

    public function test_consumed_otp_cannot_be_reused(): void
    {
        $this->createUser(['phone' => '966500000051']);

        OtpCode::create([
            'phone' => '966500000051',
            'code' => '5678',
            'purpose' => 'login',
            'expires_at' => now()->addMinutes(10),
            'consumed_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/otp/verify', [
            'phone' => '966500000051',
            'code' => '5678',
            'purpose' => 'login',
        ]);

        $response->assertStatus(422);
    }

    // ── Debug code never leaks in production ────────────────────

    public function test_no_endpoint_returns_debug_code(): void
    {
        Config::set('app.otp_debug', false);

        $this->createUser(['phone' => '966500000060']);

        $registerRes = $this->postJson('/api/v1/register', [
            'name' => 'X',
            'phone' => '966500000061',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);
        $registerRes->assertJsonMissing(['debug_code']);

        $loginRes = $this->postJson('/api/v1/login', [
            'phone' => '966500000060',
            'password' => 'password123',
        ]);
        $loginRes->assertJsonMissing(['debug_code']);

        $forgotRes = $this->postJson('/api/v1/forgot-password', [
            'phone' => '966500000060',
        ]);
        $forgotRes->assertJsonMissing(['debug_code']);

        $resendRes = $this->postJson('/api/v1/otp/send', [
            'phone' => '966500000060',
            'purpose' => 'login',
        ]);
        $resendRes->assertJsonMissing(['debug_code']);
    }
}
