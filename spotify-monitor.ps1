# spotify-monitor.ps1
# Set console output encoding to UTF8 to prevent encoding issues with non-ASCII song titles
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$lastTitle = ""
while ($true) {
    $spotify = Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
    if ($spotify) {
        $title = $spotify.MainWindowTitle
        if ($title -ne $lastTitle) {
            $lastTitle = $title
            Write-Output "TITLE:$title"
        }
    } else {
        if ($lastTitle -ne "OFFLINE") {
            $lastTitle = "OFFLINE"
            Write-Output "TITLE:OFFLINE"
        }
    }
    Start-Sleep -Milliseconds 500
}
