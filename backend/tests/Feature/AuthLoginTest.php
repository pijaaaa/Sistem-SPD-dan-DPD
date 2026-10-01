<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use RefreshDatabase;
    private string $captchaKey;
    private string $captchaCode;

    protected function setUp(): void
    {
        parent::setUp();

        $generate = $this->getJson('/api/captcha')->json();
        $this->captchaKey = $generate['key'];
        $this->captchaCode = Cache::get($this->captchaKey);

        User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
    }

    public function test_login_requires_all_fields(): void
    {
        $response = $this->postJson('/api/login', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email', 'password', 'captcha', 'captcha_key']);
    }

    public function test_login_fails_with_expired_captcha(): void
    {
        Cache::forget($this->captchaKey);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
            'captcha' => $this->captchaCode,
            'captcha_key' => $this->captchaKey,
        ]);

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Kode keamanan kadaluarsa. Silakan refresh.']);
    }

    public function test_login_fails_with_wrong_captcha(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
            'captcha' => 'WRONGCODE',
            'captcha_key' => $this->captchaKey,
        ]);

        $response->assertStatus(422);
        $response->assertJson(['message' => 'Kode keamanan tidak sesuai.']);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
            'captcha' => $this->captchaCode,
            'captcha_key' => $this->captchaKey,
        ]);

        $response->assertStatus(401);
        $response->assertJson(['message' => 'Email atau password salah.']);
    }

    public function test_login_succeeds_with_valid_credentials_and_captcha(): void
    {
        $response = $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
            'captcha' => $this->captchaCode,
            'captcha_key' => $this->captchaKey,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'id',
            'name',
            'email',
            'email_verified_at',
            'created_at',
            'updated_at',
        ]);

        $this->assertEquals('test@example.com', $response->json('email'));

        // Captcha key should be consumed after successful login
        $this->assertNull(Cache::get($this->captchaKey));
    }
}
