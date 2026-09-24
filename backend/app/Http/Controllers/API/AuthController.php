<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
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