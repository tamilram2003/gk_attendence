param(
    [Parameter(Mandatory=$true)][string]$DocxPath,
    [Parameter(Mandatory=$true)][string]$PdfPath
)

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0 # wdAlertsNone
    
    $fullDocxPath = [System.IO.Path]::GetFullPath($DocxPath)
    $fullPdfPath = [System.IO.Path]::GetFullPath($PdfPath)
    
    $doc = $word.Documents.Open($fullDocxPath, $false, $true) # ReadOnly=$true
    # 17 = wdFormatPDF
    $doc.SaveAs([ref]$fullPdfPath, [ref]17)
    $doc.Close([ref]$false)
    $word.Quit()
    Write-Output "SUCCESS: PDF created at $fullPdfPath"
} catch {
    Write-Error "ERROR: $_"
    if ($doc -ne $null) { $doc.Close([ref]$false) }
    if ($word -ne $null) { $word.Quit() }
    exit 1
} finally {
    if ($doc -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
