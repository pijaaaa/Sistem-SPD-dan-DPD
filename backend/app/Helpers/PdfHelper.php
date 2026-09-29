<?php

namespace App\Helpers;

class PdfHelper
{
    public static function formatDate(?string $date): string
    {
        return $date ? date('d-m-Y', strtotime($date)) : '-';
    }

    public static function formatCurrency($value): string
    {
        $value = $value ?? 0;
        return 'Rp ' . number_format((float) $value, 0, ',', '.');
    }

    public static function escape($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }

    public static function htmlHead(string $title): string
    {
        return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            body { font-family: sans-serif; margin: 20px; }
            h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; }
            h2 { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 12px; }
            th { background: #eee; }
            .section { margin-bottom: 14px; }
            .label { font-weight: bold; display: inline-block; min-width: 160px; }
            .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #dcfce7; color: #166534; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .status-draft { background: #f3f4f6; color: #374151; }
            .status-submitted { background: #dbeafe; color: #1e40af; }
        </style></head><body>';
    }

    public static function statusBadge(string $status): string
    {
        $class = 'status-' . $status;
        return '<span class="badge ' . $class . '">' . self::escape($status) . '</span>';
    }
}
