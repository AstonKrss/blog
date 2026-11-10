param(
  [string]$JarPath = 'build-bench\blog-0.0.1-SNAPSHOT.jar',
  [int]$Port1 = 8081,
  [int]$Port2 = 8082,
  [bool]$VisitLogEnabled = $true,
  [bool]$BackgroundTasksEnabled = $true,
  [int]$RedisDatabase = 0,
  [bool]$CacheEnabled = $true,
  [string]$Affinity1 = '',
  [string]$Affinity2 = ''
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$jar = Join-Path $repo $JarPath
if (-not (Test-Path -LiteralPath $jar)) {
  throw "找不到 jar：$jar，请先执行 mvn -f pom-bench.xml package -DskipTests"
}
$logDir = Join-Path $repo 'bench-data\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Stop-Port([int]$port) {
  $ids = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $ids) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
}

function Set-ProcessAffinity([System.Diagnostics.Process]$process, [string]$maskText) {
  if ([string]::IsNullOrWhiteSpace($maskText)) { return }
  $normalized = $maskText.Trim().Replace('0x', '').Replace('0X', '')
  $mask = [Convert]::ToInt64($normalized, 16)
  $process.ProcessorAffinity = [IntPtr]$mask
  Start-Sleep -Milliseconds 200
}

function Wait-Health([int]$port) {
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/actuator/health" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { return }
    } catch { Start-Sleep -Seconds 2 }
  }
  throw "实例 $port 未在 120 秒内就绪"
}

Stop-Port $Port1
Stop-Port $Port2

# 密码不写入脚本；如果当前 shell 已设置环境变量，子进程会继承。
$javaExe
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/myblog?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai&useSSL=false'
$env:SPRING_FLYWAY_ENABLED = 'true'
$env:SPRING_DATA_REDIS_DATABASE = [string]$RedisDatabase
$env:BLOG_STORAGE_TYPE = 'local'
$env:BLOG_UPLOAD_DIR = (Join-Path $repo 'uploads')
$env:BLOG_CACHE_ENABLED = if ($CacheEnabled) { 'true' } else { 'false' }
$env:BLOG_CACHE_WARMUP_ENABLED = if ($BackgroundTasksEnabled) { 'true' } else { 'false' }
$env:BLOG_VISIT_LOG_ENABLED = if ($VisitLogEnabled) { 'true' } else { 'false' }
$env:BLOG_VISIT_LOG_AGGREGATION_ENABLED = if ($BackgroundTasksEnabled) { 'true' } else { 'false' }
$env:BLOG_POST_LIKE_CALIBRATION_ENABLED = if ($BackgroundTasksEnabled) { 'true' } else { 'false' }
$env:BLOG_VISIT_LOG_MQ_BATCH_SIZE = '20'
$env:BLOG_RABBITMQ_METRICS_ENABLED = if ($BackgroundTasksEnabled) { 'true' } else { 'false' }
$env:SPRING_RABBITMQ_HOST = 'localhost'
$env:SPRING_RABBITMQ_PORT = '5672'
$env:SPRING_RABBITMQ_MANAGEMENT_URL = 'http://localhost:15672'
Remove-Item Env:SPRING_DATA_REDIS_PASSWORD -ErrorAction SilentlyContinue

$p1 = Start-Process -FilePath 'D:\Program Files\Java\jdk-23\bin\java.exe' -ArgumentList '-jar', $jar, "--server.port=$Port1" `
  -WorkingDirectory $repo -RedirectStandardOutput (Join-Path $logDir "instance-$Port1.out.log") `
  -RedirectStandardError (Join-Path $logDir "instance-$Port1.err.log") -WindowStyle Hidden -PassThru
Set-ProcessAffinity $p1 $Affinity1
Wait-Health $Port1

$env:SPRING_FLYWAY_ENABLED = 'false'
$p2 = Start-Process -FilePath 'D:\Program Files\Java\jdk-23\bin\java.exe' -ArgumentList '-jar', $jar, "--server.port=$Port2" `
  -WorkingDirectory $repo -RedirectStandardOutput (Join-Path $logDir "instance-$Port2.out.log") `
  -RedirectStandardError (Join-Path $logDir "instance-$Port2.err.log") -WindowStyle Hidden -PassThru
Set-ProcessAffinity $p2 $Affinity2
Wait-Health $Port2

Write-Host "backend-1 pid=$($p1.Id) port=$Port1 affinity=$Affinity1 cache=$CacheEnabled"
Write-Host "backend-2 pid=$($p2.Id) port=$Port2 affinity=$Affinity2 cache=$CacheEnabled"




