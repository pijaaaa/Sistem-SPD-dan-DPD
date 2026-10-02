<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'captcha' => ['required', 'string'],
            'captcha_key' => ['required', 'string'],
        ]);

        $captchaKey = $request->captcha_key;
        $captchaCode = Cache::get($captchaKey);

        if (!$captchaCode) {
            return response()->json(['message' => 'Kode keamanan kadaluarsa. Silakan refresh.'], 422);
        }

        if (strtoupper($request->captcha) !== $captchaCode) {
            Cache::forget($captchaKey);
            return response()->json(['message' => 'Kode keamanan tidak sesuai.'], 422);
        }

        Cache::forget($captchaKey);

        if (Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']])) {
            $request->session()->regenerate();

            return response()->json($this->serializeUser(Auth::user()));
        }

        return response()->json(['message' => 'Email atau password salah.'], 401);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        return response()->json($this->serializeUser($request->user()));
    }

    public function updateName(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->update(['name' => $request->name]);

        if ($user->employee) {
            $user->employee->update(['name' => $request->name]);
        }

        return response()->json($this->serializeUser($user));
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', 'min:8'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Password saat ini tidak sesuai.'], 422);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password berhasil diperbarui.']);
    }

    private function serializeUser(User $user): array
    {
        $employee = $user->employee()->first();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'employee' => $employee ? [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'name' => $employee->name,
                'position' => $employee->position,
                'role' => $employee->role()->first(),
                'department' => $employee->department()->first(),
            ] : null,
        ];
    }
}