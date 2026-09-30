<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserNotification;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake([
            'exp.host/*' => Http::response(['data' => [['status' => 'ok']]], 200, ['Content-Type' => 'application/json']),
        ]);
    }

    private function createUser(string $phone = '966511122230'): User
    {
        return User::create([
            'name' => 'Notif User',
            'phone' => $phone,
            'password' => bcrypt('password123'),
        ]);
    }

    private function makeNotification(User $user, bool $isRead = false): UserNotification
    {
        return UserNotification::create([
            'user_id' => $user->id,
            'title' => 'تحديث الشحنة',
            'body' => 'تم تعيين سائق لشحنتك.',
            'type' => 'shipment',
            'is_read' => $isRead,
            'data' => ['tracking_code' => 'TZ123456', 'status' => 'assigned'],
        ]);
    }

    public function test_index_lists_own_notifications(): void
    {
        $user = $this->createUser();
        $other = $this->createUser('966511122231');
        $mine = $this->makeNotification($user);
        $this->makeNotification($other);
        $this->actingAs($user, 'sanctum');

        $res = $this->getJson('/api/v1/notifications');
        $res->assertOk();
        $this->assertCount(1, $res->json('notifications'));
        $this->assertSame($mine->id, $res->json('notifications.0.id'));
        $this->assertFalse($res->json('notifications.0.is_read'));
    }

    public function test_unread_count(): void
    {
        $user = $this->createUser();
        $this->makeNotification($user);
        $this->makeNotification($user, true);
        $this->actingAs($user, 'sanctum');

        $res = $this->getJson('/api/v1/notifications/unread-count');
        $res->assertOk()->assertJsonPath('count', 1);
    }

    public function test_mark_read_and_mark_all_read(): void
    {
        $user = $this->createUser();
        $first = $this->makeNotification($user);
        $second = $this->makeNotification($user);
        $this->actingAs($user, 'sanctum');

        $this->postJson("/api/v1/notifications/{$first->id}/read")->assertOk();
        $this->assertTrue($first->fresh()->is_read);

        $this->postJson('/api/v1/notifications/read-all')->assertOk();
        $this->assertTrue($second->fresh()->is_read);
    }

    public function test_delete_removes_only_own_notification(): void
    {
        $user = $this->createUser();
        $other = $this->createUser('966511122232');
        $mine = $this->makeNotification($user);
        $theirs = $this->makeNotification($other);

        $this->actingAs($user, 'sanctum');
        $this->deleteJson("/api/v1/notifications/{$mine->id}")->assertOk();
        $this->assertDatabaseMissing('notifications_table', ['id' => $mine->id]);

        $this->deleteJson("/api/v1/notifications/{$theirs->id}")->assertStatus(404);
        $this->assertDatabaseHas('notifications_table', ['id' => $theirs->id]);
    }

    public function test_push_service_persists_notification_and_sends_push(): void
    {
        $user = $this->createUser();
        $user->update(['push_token' => 'ExponentPushToken[persist-user-1]']);
        $service = app(PushNotificationService::class);

        $service->notifyShipmentUpdate($user, 'TZ123456', 'assigned', 'تم تعيين السائق لشحنتك.');

        $this->assertDatabaseHas('notifications_table', [
            'user_id' => $user->id,
            'title' => 'تم تعيين سائق لشحنتك',
            'type' => 'shipment',
        ]);
        $row = UserNotification::where('user_id', $user->id)->first();
        $this->assertSame('TZ123456', $row->data['tracking_code']);
        $this->assertFalse($row->is_read);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'exp.host'));
    }

    public function test_driver_push_token_sent_when_set(): void
    {
        $user = $this->createUser();
        $user->update(['push_token' => 'ExponentPushToken[driver-user-1]']);

        app(PushNotificationService::class)->notifyShipmentUpdate($user, 'TZ123456', 'delivered', 'تم التسليم.');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'exp.host')
            && str_contains($request['0']['to'] ?? '', 'driver-user-1'));
    }
}