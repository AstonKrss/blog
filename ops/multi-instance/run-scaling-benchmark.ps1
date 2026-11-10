param(
  [ValidateSet('cache-on', 'cache-off')]
  [string]$Scenario = 'cache-on',
  [string]$RatesCsv = '1000,1500',
  [int]$DurationSeconds = 30,
  [int]$WarmupSeconds = 10,
  [string]$OutputDir = 'bench-data\scaling',
  [string]$Affinity1 = '0F00',
  [string]$Affinity2 = 'F000',
  [string]$K6Affinity = '000F'
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$outputPath = Join-Path $repo $OutputDir
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDir = Join-Path $outputPath "$Scenario-$stamp"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$backendsScript = Join-Path $PSScriptRoot 'start-backends.ps1'
$nginxScript = Join-Path $PSScriptRoot 'start-nginx-wsl.ps1'
$k6Script = Join-Path $repo 'loadtest\k6\stage4-constant.js'
$k6 = 'C:\Program Files\k6\k6.exe'
$baseUrl = 'http://127.0.0.1:8088'
$cacheEnabled = $Scenario -eq 'cache-on'
$rateList = @($RatesCsv -split '[,; ]+' | Where-Object { $_ } | ForEach-Object { [int]$_ })

function Set-AffinityMask([System.Diagnostics.Process]$process, [string]$maskText) {
  $normalized = $maskText.Trim().Replace('0x', '').Replace('0X', '')
  $process.ProcessorAffinity = [IntPtr]([Convert]::ToInt64($normalized, 16))
}

function Wait-Health([int]$port) {
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/actuator/health" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) { return }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "实例 $port 未在 120 秒内就绪"
}

function Switch-Nginx([bool]$singleBackend) {
  & $nginxScript -SingleBackend:$singleBackend
}

function Get-JavaCpuSnapshot {
  $snapshot = @{}
  foreach ($process in Get-Process java -ErrorAction SilentlyContinue) {
    $snapshot[$process.Id] = $process.CPU
  }
  return $snapshot
}

function Invoke-K6([string]$mode, [int]$rate, [int]$durationSeconds, [string]$label) {
  $duration = "${durationSeconds}s"
  $summary = Join-Path $runDir "$mode-$rate-$label.json"
  $stdout = Join-Path $runDir "$mode-$rate-$label.out.log"
  $stderr = Join-Path $runDir "$mode-$rate-$label.err.log"
  $javaBefore = Get-JavaCpuSnapshot
  $arguments = @(
    'run', '--quiet', "--summary-export=$summary",
    '-e', "BASE_URL=$baseUrl",
    '-e', "RATE=$rate",
    '-e', "DURATION=$duration",
    $k6Script
  )
  $process = Start-Process -FilePath $k6 -ArgumentList $arguments -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  Set-AffinityMask $process $K6Affinity
  if (-not $process.WaitForExit(300000)) {
    $process.Kill()
    throw "k6 超时：mode=$mode rate=$rate label=$label"
  }
  if (-not (Test-Path -LiteralPath $summary)) {
    throw "k6 未生成 summary：mode=$mode rate=$rate label=$label，日志：$stderr"
  }
  $javaAfter = Get-JavaCpuSnapshot
  $javaCpu = 0.0
  foreach ($id in $javaBefore.Keys) {
    if ($javaAfter.ContainsKey($id)) { $javaCpu += ($javaAfter[$id] - $javaBefore[$id]) }
  }
  $result = Get-Content -LiteralPath $summary -Raw | ConvertFrom-Json
  [pscustomobject]@{
    Scenario = $Scenario
    Mode = $mode
    TargetRate = $rate
    Label = $label
    Requests = $result.metrics.http_reqs.count
    ActualRate = [math]::Round($result.metrics.http_reqs.rate, 2)
    P50Ms = [math]::Round($result.metrics.http_req_duration.med, 2)
    P95Ms = [math]::Round($result.metrics.http_req_duration.'p(95)', 2)
    P99Ms = [math]::Round($result.metrics.http_req_duration.'p(99)', 2)
    FailRate = $result.metrics.http_req_failed.rate
    DroppedIterations = $result.metrics.dropped_iterations.count
    K6CpuSeconds = [math]::Round($process.CPU, 2)
    JavaCpuSeconds = [math]::Round($javaCpu, 2)
    SummaryFile = $summary
  }
}

$results = [System.Collections.Generic.List[object]]::new()
try {
  & $backendsScript `
    -VisitLogEnabled:$false -BackgroundTasksEnabled:$false -RedisDatabase 1 `
    -CacheEnabled:$cacheEnabled -Affinity1 $Affinity1 -Affinity2 $Affinity2
  Wait-Health 8081
  Wait-Health 8082

  Write-Host "scenario=$Scenario cache=$cacheEnabled affinity1=$Affinity1 affinity2=$Affinity2 k6=$K6Affinity"
  Switch-Nginx $true
  $null = Invoke-K6 'single' 100 $WarmupSeconds 'warmup'
  foreach ($rate in $rateList) {
    $result = Invoke-K6 'single' $rate $DurationSeconds 'measured'
    $results.Add($result)
    $result | Format-Table -AutoSize
  }

  Switch-Nginx $false
  $null = Invoke-K6 'dual' 100 $WarmupSeconds 'warmup'
  foreach ($rate in $rateList) {
    $result = Invoke-K6 'dual' $rate $DurationSeconds 'measured'
    $results.Add($result)
    $result | Format-Table -AutoSize
  }
} finally {
  try { Switch-Nginx $false } catch { Write-Warning "恢复双实例 Nginx 失败：$($_.Exception.Message)" }
}

$csv = Join-Path $runDir 'results.csv'
$results | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding utf8
Write-Host "results=$csv"
$results | Format-Table Scenario,Mode,TargetRate,ActualRate,P50Ms,P95Ms,P99Ms,FailRate,DroppedIterations,K6CpuSeconds,JavaCpuSeconds -AutoSize






