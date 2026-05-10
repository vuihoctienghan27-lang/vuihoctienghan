$ErrorActionPreference = 'Continue'

# Danh sach file can inject
$files = @()
$base = 'c:\Users\Minh Hieu\Desktop\TOPIK ED 3\public'

$files += Get-ChildItem "$base\reading\topik_ii\type_*.html" | Select-Object -ExpandProperty FullName
$files += Get-ChildItem "$base\reading\topik_i\*.html" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
$files += Get-ChildItem "$base\writing\topik_ii\topik*.html" | Select-Object -ExpandProperty FullName
$files += Get-ChildItem "$base\writing\topik_ii\type5*.html" | Select-Object -ExpandProperty FullName
$files += Get-ChildItem "$base\listening\topik_ii\*.html" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
$files += "$base\vocab.html"

$injected = 0
$skipped  = 0

foreach ($file in $files) {
    if (-not (Test-Path $file)) { continue }
    
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    
    if ($content.Contains('study-timer.js')) { $skipped++; continue }
    
    if ($file -match 'vocab\.html$') {
        $relPath = 'assets/js/study-timer.js'
    } else {
        $relPath = '../../assets/js/study-timer.js'
    }
    
    $scriptTag = "    <script src=`"$relPath`"></script>`n"
    
    if ($content.Contains('</body>')) {
        $newContent = $content.Replace('</body>', $scriptTag + '</body>')
        [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
        $injected++
        Write-Host "OK: $(Split-Path $file -Leaf)"
    } else {
        Write-Host "SKIP (no body): $(Split-Path $file -Leaf)"
    }
}

Write-Host ""
Write-Host "Done! Injected: $injected   Skipped (already has): $skipped"
