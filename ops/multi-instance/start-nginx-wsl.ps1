param(
  [int]$ProxyPort = 8088,
  [string]$WindowsHostIp = ''
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$source = Join-Path $repo 'ops\nginx\nginx.conf'
$outputDir = Join-Path $repo 'bench-data\nginx'
$output = Join-Path $outputDir 'nginx.conf'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if ([string]::IsNullOrWhiteSpace($WindowsHostIp)) {
  $route = wsl.exe -- bash -lc "ip route show default | cut -d' ' -f3"
  $WindowsHostIp = ($route | Select-Object -First 1).Trim()
}
if ([string]::IsNullOrWhiteSpace($WindowsHostIp)) {
  throw '无法获取 Windows 宿主机 IP，请手动传入 -WindowsHostIp'
}

$config = [IO.File]::ReadAllText($source)
$config = $config.Replace('127.0.0.1:8081', "$WindowsHostIp`:8081")
$config = $config.Replace('127.0.0.1:8082', "$WindowsHostIp`:8082")
[IO.File]::WriteAllText($output, $config)

$wslConfig = $output.Replace('D:\', '/mnt/d/').Replace('\', '/')
Write-Host "windows_host_ip=$WindowsHostIp"
Write-Host "nginx_config=$wslConfig"

wsl.exe -u root -- nginx -t -c $wslConfig -p /etc/nginx
if ($LASTEXITCODE -ne 0) { throw 'nginx -t failed' }

wsl.exe -u root -- bash -lc "if [ -f /var/run/nginx.pid ]; then nginx -s stop || true; fi"
Start-Sleep -Seconds 1

wsl.exe -u root -- nginx -c $wslConfig -p /etc/nginx
if ($LASTEXITCODE -ne 0) { throw 'nginx start failed' }

Start-Sleep -Seconds 2
$health = Invoke-WebRequest -Uri "http://127.0.0.1:$ProxyPort/actuator/health" -UseBasicParsing -TimeoutSec 5
Write-Host "nginx_ready=$($health.StatusCode) body=$($health.Content)"