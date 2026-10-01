<?php

namespace App\Helpers;

class PdfHelper
{
    public static function formatDate(?string $date): string
    {
        if (!$date) return '-';
        $months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $d = date('d', strtotime($date));
        $m = (int)date('m', strtotime($date));
        $y = date('Y', strtotime($date));
        return $d . ' ' . $months[$m] . ' ' . $y;
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

    public static function htmlHead(string $title, string $docType = 'SPD'): string
    {
        $logoPath = public_path('assets/logo1-D2NqUgDL.png');
        $logoBase64 = '';
        if (file_exists($logoPath)) {
            $imageData = base64_encode(file_get_contents($logoPath));
            $logoBase64 = 'data:image/png;base64,' . $imageData;
        }

        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>' . self::escape($title) . '</title>
    <style>
        @page {
            margin: 15mm 15mm 20mm 15mm;
        }
        
        body { 
            font-family: "DejaVu Sans", "Arial", sans-serif;
            margin: 0;
            padding: 0;
            color: #000000;
            font-size: 11pt;
            line-height: 1.5;
        }
        
        .header {
            border: none;
            margin: 0;
            padding: 0;
            margin-bottom: 25px;
            background: #ffffff;
        }

        /* Tabel di dalam header tidak pakai border/background dari style tabel global */
        .header table {
            width: 100%;
            margin: 0;
            border: none;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .header td {
            padding: 0;
            border: none;
            background: transparent;
            vertical-align: middle;
        }

        .header-logo {
            height: 70px;
            width: auto;
        }
        
        .company-name {
            font-size: 18pt;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
            letter-spacing: 0.5px;
        }
        
        .doc-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            color: #000000;
            margin: 20px 0;
            padding: 10px;
            border-top: 1px solid #000000;
            border-bottom: 1px solid #000000;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section {
            margin-bottom: 20px;
            padding: 15px;
            background: #ffffff;
            border: 1px solid #9ca3af;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #000000;
            margin: 0 0 12px 0;
            padding-bottom: 6px;
            border-bottom: 1px solid #000000;
        }
        
        .info-row {
            margin-bottom: 8px;
            display: table;
            width: 100%;
        }
        
        .info-label {
            display: table-cell;
            font-weight: bold;
            color: #000000;
            width: 180px;
            padding: 4px 0;
        }
        
        .info-value {
            display: table-cell;
            color: #000000;
            padding: 4px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10pt;
        }
        
        th {
            background: #e5e7eb;
            color: #000000;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #000000;
        }
        
        td {
            padding: 8px;
            border: 1px solid #6b7280;
            color: #000000;
            background: #ffffff;
        }
        
        tr:nth-child(even) td {
            background: #f9fafb;
        }
        
        .total-row td {
            background: #f3f4f6 !important;
            font-weight: bold;
            color: #000000;
            border-top: 2px solid #000000;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 10px;
            font-size: 9pt;
            font-weight: bold;
            color: #000000;
            text-transform: uppercase;
            border: 1px solid #000000;
            background: #ffffff;
        }
        
        .status-pending {
            border-style: dashed;
        }
        
        .status-approved {
            background: #e5e7eb;
        }
        
        .status-rejected {
            background: #ffffff;
            text-decoration: line-through;
        }
        
        .status-draft {
            border-color: #6b7280;
            color: #4b5563;
        }
        
        .status-submitted {
            border-style: double;
        }
        
        .signature-section {
            margin-top: 30px;
            page-break-inside: avoid;
        }
        
        .signature-container {
            display: table;
            width: 100%;
            margin-top: 15px;
        }
        
        .signature-box {
            display: table-cell;
            width: 48%;
            padding: 15px;
            border: 1px solid #6b7280;
            text-align: center;
            background: #ffffff;
        }
        
        .signature-box:first-child {
            margin-right: 4%;
        }
        
        .signature-title {
            font-weight: bold;
            color: #000000;
            margin-bottom: 60px;
            font-size: 10pt;
        }
        
        .signature-name {
            font-weight: bold;
            color: #000000;
            border-top: 1px solid #000000;
            padding-top: 8px;
            margin-top: 5px;
        }
        
        .signature-role {
            font-size: 9pt;
            color: #4b5563;
            font-style: italic;
        }
        
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            text-align: center;
            font-size: 8pt;
            color: #6b7280;
            padding: 10px 0;
            border-top: 1px solid #9ca3af;
            background: #ffffff;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80pt;
            color: rgba(0, 0, 0, 0.06);
            font-weight: bold;
            z-index: -1;
            text-transform: uppercase;
        }
        
        .divider {
            height: 1px;
            background: #000000;
            margin: 20px 0;
        }
    </style>
</head>
<body>';
    }

    public static function header(string $docType = 'SPD'): string
    {
        $logoLeftPath = public_path('assets/skkmigaslogo.png');
        $logoRightPath = public_path('assets/bsplogo.png');
        
        $logoLeft = '';
        if (file_exists($logoLeftPath)) {
            $imageData = base64_encode(file_get_contents($logoLeftPath));
            $logoLeft = 'data:image/png;base64,' . $imageData;
        }
        
        $logoRight = '';
        if (file_exists($logoRightPath)) {
            $imageData = base64_encode(file_get_contents($logoRightPath));
            $logoRight = 'data:image/png;base64,' . $imageData;
        }

        return '
        <div class="header">
            <table>
                <tr>
                    <td style="width: 20%; text-align: left;">
                        ' . ($logoLeft ? '<img src="' . $logoLeft . '" alt="SKK Migas" class="header-logo">' : '') . '
                    </td>
                    <td style="width: 60%; text-align: center;">
                        <div class="company-name">PT. BUMI SIAK PUSAKO</div>
                        <div style="font-size: 9pt; color: #374151; line-height: 1.4; margin-top: 4px;">
                            Gedung Surya Dumai Lt. 6 Jalan Jendral Sudirman No. 395<br>
                            Pekanbaru 28116 - INDONESIA
                        </div>
                    </td>
                    <td style="width: 15%; text-align: right;">
                        ' . ($logoRight ? '<img src="' . $logoRight . '" alt="Logo" class="header-logo">' : '') . '
                    </td>
                </tr>
            </table>
            <div style="margin-top: 10px; padding-top: 6px; border-top: 2px solid #1f2937;">
                <table>
                    <tr>
                        <td style="width: 50%; text-align: left; font-size: 8pt; color: #374151;">Telepon: (62-761) 855764</td>
                        <td style="width: 50%; text-align: right; font-size: 8pt; color: #374151;">Facsimile: (62-761) 855765</td>
                    </tr>
                </table>
            </div>
        </div>';
    }

    public static function footer(): string
    {
        return '<div class="footer">
            Dokumen ini dicetak secara elektronik pada ' . date('d/m/Y H:i') . ' WIB | Halaman {PAGE_NUM} dari {PAGE_COUNT}
        </div>';
    }

    public static function statusBadge(string $status): string
    {
        $statusText = [
            'pending' => 'Menunggu',
            'approved' => 'Disetujui',
            'rejected' => 'Ditolak',
            'draft' => 'Draft',
            'submitted' => 'Diajukan',
        ];
        
        $text = $statusText[$status] ?? ucfirst($status);
        $class = 'status-' . $status;
        return '<span class="badge ' . $class . '">' . self::escape($text) . '</span>';
    }

    public static function watermark(string $status): string
    {
        if (in_array($status, ['draft', 'rejected'])) {
            return '<div class="watermark">' . strtoupper($status) . '</div>';
        }
        return '';
    }

    public static function signatureBoxes(array $approvers, string $requesterName, string $requesterRole = 'Pemohon'): string
    {
        $html = '<div class="signature-section">';
        $html .= '<div class="section-title">Tanda Tangan & Persetujuan</div>';
        $html .= '<div class="signature-container">';
        
        $html .= '<div class="signature-box">';
        $html .= '<div class="signature-title">Pemohon</div>';
        $html .= '<div class="signature-name">' . self::escape($requesterName) . '</div>';
        $html .= '<div class="signature-role">' . self::escape($requesterRole) . '</div>';
        $html .= '</div>';
        
        if (!empty($approvers)) {
            $lastApprover = end($approvers);
            $html .= '<div class="signature-box">';
            $html .= '<div class="signature-title">Menyetujui</div>';
            $html .= '<div class="signature-name">' . self::escape($lastApprover['name']) . '</div>';
            $html .= '<div class="signature-role">' . self::escape($lastApprover['role']) . '</div>';
            $html .= '</div>';
        }
        
        $html .= '</div>';
        $html .= '</div>';
        
        return $html;
    }
}