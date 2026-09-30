<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class MessageStreamTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('app.chat_stream_iterations', 1);
    }

    private function createUser(string $phone = '966511111112'): User
    {
        return User::create([
            'name' => 'Chat User',
            'phone' => $phone,
            'password' => bcrypt('password123'),
        ]);
    }

    private function createDriver(): Driver
    {
        return Driver::create([
            'name' => 'Driver Chat',
            'phone' => '966511111113',
            'vehicle_plate' => 'XYZ777',
            'status' => 'busy',
            'approval_status' => 'approved',
        ]);
    }

    public function test_send_message_creates_conversation_record(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $this->actingAs($user, 'sanctum');

        $res = $this->postJson("/api/v1/messages/{$driver->id}", ['body' => 'مرحبا، أين التسليم؟']);

        $res->assertCreated()
            ->assertJsonPath('message.body', 'مرحبا، أين التسليم؟')
            ->assertJsonPath('message.is_from_driver', false)
            ->assertJsonPath('message.user_id', $user->id)
            ->assertJsonPath('message.driver_id', (string) $driver->id);
    }

    public function test_index_returns_history_and_marks_incoming_read(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $this->actingAs($user, 'sanctum');

        Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'من العميل 1', 'is_from_driver' => false]);
        Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'من السائق', 'is_from_driver' => true]);
        Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'من العميل 2', 'is_from_driver' => false]);

        $res = $this->getJson("/api/v1/messages/{$driver->id}");

        $res->assertOk();
        $this->assertCount(3, $res->json('messages'));
        $this->assertSame('من العميل 1', $res->json('messages.0.body'));

        $incoming = Message::where('driver_id', $driver->id)->where('is_from_driver', true)->first();
        $this->assertNotNull($incoming->fresh()->read_at);
    }

    public function test_stream_emits_new_messages_as_sse_and_marks_them_read(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $this->actingAs($user, 'sanctum');

        $older = Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'قديم', 'is_from_driver' => false]);
        Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'جديد من السائق', 'is_from_driver' => true]);

        $res = $this->getJson("/api/v1/messages/{$driver->id}/stream?after={$older->id}");

        $res->assertOk();
        $res->assertHeader('content-type', 'text/event-stream; charset=UTF-8');
        $content = $res->streamedContent();

        $this->assertStringContainsString('event: message', $content);
        $this->assertStringContainsString('جديد من السائق', $content);

        $latest = Message::where('driver_id', $driver->id)->where('is_from_driver', true)->first();
        $this->assertNotNull($latest->fresh()->read_at);
    }

    public function test_stream_respects_after_id(): void
    {
        $user = $this->createUser();
        $driver = $this->createDriver();
        $this->actingAs($user, 'sanctum');

        $older = Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'قديم', 'is_from_driver' => false]);
        $newer = Message::create(['user_id' => $user->id, 'driver_id' => $driver->id, 'body' => 'جديد', 'is_from_driver' => false]);

        $res = $this->getJson("/api/v1/messages/{$driver->id}/stream?after={$older->id}");

        $res->assertOk();
        $content = $res->streamedContent();

        $this->assertStringContainsString('جديد', $content);
        $this->assertStringNotContainsString('id: '.$older->id, $content);
        $this->assertStringContainsString('id: '.$newer->id, $content);
    }
}