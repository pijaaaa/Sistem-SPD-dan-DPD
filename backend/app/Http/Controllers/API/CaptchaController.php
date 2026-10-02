<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class CaptchaController extends Controller
{
    public function generate()
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($i = 0; $i < 5; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }

        $key = 'captcha_' . Str::random(32);
        Cache::put($key, $code, now()->addMinutes(10));

        $svg = $this->generateSvg($code);

        return response()->json([
            'captcha' => $svg,
            'key' => $key,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'captcha' => 'required|string',
            'captcha_key' => 'required|string',
        ]);

        $key = $request->captcha_key;
        $code = Cache::get($key);

        if (!$code) {
            return response()->json(['valid' => false, 'message' => 'Captcha expired'], 422);
        }

        $valid = hash_equals($code, strtoupper($request->captcha));

        if ($valid) {
            Cache::forget($key);
        }

        return response()->json(['valid' => $valid]);
    }

    private function generateSvg($code)
    {
        $width = 180;
        $height = 48;
        $fontSize = 22;
        
        $colors = ['#047857', '#065f46', '#10b981', '#059669', '#064e3b'];
        
        $svg = '<svg width="' . $width . '" height="' . $height . '" xmlns="http://www.w3.org/2000/svg">';
        
        $svg .= '<rect width="100%" height="100%" fill="#f0fdf4"/>';
        
        for ($i = 0; $i < 8; $i++) {
            $x1 = rand(0, $width);
            $y1 = rand(0, $height);
            $x2 = rand(0, $width);
            $y2 = rand(0, $height);
            $color = $colors[array_rand($colors)];
            $svg .= '<line x1="' . $x1 . '" y1="' . $y1 . '" x2="' . $x2 . '" y2="' . $y2 . '" stroke="' . $color . '" stroke-width="1" opacity="0.3"/>';
        }
        
        for ($i = 0; $i < 30; $i++) {
            $cx = rand(0, $width);
            $cy = rand(0, $height);
            $r = rand(1, 3);
            $color = $colors[array_rand($colors)];
            $svg .= '<circle cx="' . $cx . '" cy="' . $cy . '" r="' . $r . '" fill="' . $color . '" opacity="0.2"/>';
        }
        
        $x = 15;
        $chars = str_split($code);
        foreach ($chars as $index => $char) {
            $y = $height / 2 + rand(-5, 5);
            $rotate = rand(-15, 15);
            $color = $colors[$index % count($colors)];
            $font = ['Arial', 'Georgia', 'Courier New', 'Verdana', 'Times New Roman'][$index % 5];
            
            $svg .= '<text x="' . $x . '" y="' . $y . '" font-size="' . $fontSize . '" font-family="' . $font . '" font-weight="bold" fill="' . $color . '" transform="rotate(' . $rotate . ' ' . $x . ' ' . $y . ')">' . $char . '</text>';
            
            $x += 30;
        }
        
        $svg .= '</svg>';
        
        return $svg;
    }
}
