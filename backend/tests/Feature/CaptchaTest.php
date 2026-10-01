<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CaptchaTest extends TestCase
{
    public function test_generate_returns_valid_svg_and_key(): void
    {
        $response = $this->getJson('/api/captcha');

        $response->assertOk();
        $response->assertJsonStructure(['captcha', 'key']);

        $payload = $response->json();

        $this->assertStringStartsWith('<svg', $payload['captcha']);
        $this->assertStringEndsWith('</svg>', $payload['captcha']);
        $this->assertStringStartsWith('captcha_', $payload['key']);

        // Cache should store the generated code
        $this->assertNotNull(Cache::get($payload['key']));
    }

    public function test_verify_rejects_unknown_key(): void
    {
        $response = $this->postJson('/api/captcha/verify', [
            'captcha' => 'ABC12',
            'captcha_key' => 'captcha_nonexistent_key',
        ]);

        $response->assertStatus(422);
        $response->assertJson(['valid' => false, 'message' => 'Captcha expired']);
    }

    public function test_verify_accepts_correct_code()
    {
        // phpcs:ignore
        $generate = $this->getJson('/api/captcha')->json();
        $key = $generate['key'];
        $code = Cache::get($key);

        $response = $this->postJson('/api/captcha/verify', [
            'captcha' => $code,
            'captcha_key' => $key,
        ]);

        $response->assertOk();
        $response->assertJson(['valid' => true]);

        // Key should be consumed after successful verification
        $this->assertNull(Cache::get($key));
    }

    public function test_verify_rejects_wrong_code()
    {
        $generate = $this->getJson('/api/captcha')->json();
        $key = $generate['key'];

        $response = $this->postJson('/api/captcha/verify', [
            'captcha' => 'WRONGCODE',
            'captcha_key' => $key,
        ]);

        $response->assertOk();
        $response->assertJson(['valid' => false]);
    }

    public function test_verify_requires_captcha_fields()
    {
        $response = $this->postJson('/api/captcha/verify', []);

        $response->assertStatus(422);
    }
}
