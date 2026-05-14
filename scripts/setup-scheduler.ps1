$TaskName   = "EnergyInsight-DailyCrawl"
$ProjectDir = "c:\Users\mysuni_newsletter_pjt2"
$BatFile    = "$ProjectDir\scripts\crawl.bat"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[INFO] Removed existing task"
}

$Action   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatFile`""
$Trigger  = New-ScheduledTaskTrigger -Daily -At "09:00"
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force

Write-Host "[OK] Scheduled task registered: $TaskName"
Write-Host "[OK] Runs daily at 09:00"
Write-Host "[OK] Log: $ProjectDir\logs\crawl.log"
Write-Host ""
Write-Host "Commands:"
Write-Host "  Run now:  npm run scheduler:run"
Write-Host "  Status:   npm run scheduler:status"
Write-Host "  Logs:     npm run log"
