<#
PowerShell 脚本：deploy_dist.ps1
功能：
 - 使用 PowerShell 内置命令将本地 `dist/` 目录打包为 zip 格式
 - 使用 scp 上传到远端 `/tmp`
 - 使用 ssh 在远端用 unzip 解压到 `/usr/share/nginx/html/`

使用示例：
.\deploy_dist.ps1 -RemoteUser "deploy" -RemoteHost "example.com" -KeyFile "C:\Users\me\.ssh\id_rsa"

参数说明：
 -DistPath: 要压缩的本地目录（默认 .\dist）
 -ArchiveName: 生成的压缩包名称（默认 dist.zip）
 -RemoteUser: 远端用户名（必填）
 -RemoteHost: 远端主机地址（必填）
 -RemotePort: ssh 端口（默认 22）
 -RemotePath: 远端上传目录（默认 /tmp）
 -RemoteDeployPath: 解压目标目录（默认 /usr/share/nginx/html）
 -KeyFile: 可选的私钥路径（如果使用密钥认证）
 -UseSudo: 在远端执行命令时使用 sudo（默认开）
 -KeepLocal: 上传后是否保留本地压缩包（默认删除）
#>

param(
    [string]$DistPath = ".\\dist",
    [string]$ArchiveName = "dist.zip",
    [Parameter(Mandatory=$true)][string]$RemoteUser,
    [Parameter(Mandatory=$true)][string]$RemoteHost,
    [int]$RemotePort = 22,
    [string]$RemotePath = "/tmp",
    [string]$RemoteDeployPath = "/usr/share/nginx/html",
    [string]$KeyFile = $null,
    [switch]$UseSudo = $true,
    [switch]$KeepLocal = $false
)

function Write-ErrAndExit($msg, $code=1){
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit $code
}

# 构造路径
$archiveFullPath = Join-Path -Path (Get-Location) -ChildPath $ArchiveName

# 压缩
if (-not (Test-Path $DistPath)) { Write-ErrAndExit "要压缩的目录不存在: $DistPath" }

Write-Host "开始压缩 $DistPath -> $archiveFullPath ..."
try {
    # 使用 PowerShell 内置的 Compress-Archive
    Compress-Archive -Path (Join-Path -Path $DistPath -ChildPath '*') -DestinationPath $archiveFullPath -Force -ErrorAction Stop
} catch {
    Write-ErrAndExit "压缩失败: $_"
}

Write-Host "压缩完成：$archiveFullPath" -ForegroundColor Green

# 准备 scp 参数
$scpArgs = @()
if ($KeyFile) { $scpArgs += '-i'; $scpArgs += $KeyFile }
$scpArgs += '-P'; $scpArgs += $RemotePort.ToString()
$scpArgs += $archiveFullPath
$scpArgs += "${RemoteUser}@${RemoteHost}:${RemotePath}/"

Write-Host "开始上传到 ${RemoteHost}:$RemotePath ..."
$scpCmd = Get-Command scp -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue
if (-not $scpCmd) { Write-ErrAndExit "找不到 scp 命令，请确保 OpenSSH 已安装并在 PATH 中。" }

$upload = & $scpCmd @scpArgs
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "scp 上传失败 (exit code $LASTEXITCODE)" }

Write-Host "上传成功" -ForegroundColor Green

# 在远端执行解压命令
$sshCmd = Get-Command ssh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue
if (-not $sshCmd) { Write-ErrAndExit "找不到 ssh 命令，请确保 OpenSSH 已安装并在 PATH 中。" }

$identityArgs = @()
if ($KeyFile) { $identityArgs += '-i'; $identityArgs += $KeyFile }
$sshArgs = @()
$sshArgs += $identityArgs
$sshArgs += '-p'; $sshArgs += $RemotePort.ToString()
$sshArgs += "${RemoteUser}@${RemoteHost}"

# 远端命令：创建目录、用 unzip 解压、移除压缩包、尝试修复权限并重载 nginx
$sudoPrefix = ''
if ($UseSudo) { $sudoPrefix = 'sudo ' }
$remoteArchive = "${RemotePath}/${ArchiveName}"
$remoteCmd = "set -e; ${sudoPrefix}mkdir -p '$RemoteDeployPath' && ${sudoPrefix}unzip -o '$remoteArchive' -d '$RemoteDeployPath' && ${sudoPrefix}rm -f '$remoteArchive' || true; ${sudoPrefix}chown -R www-data:www-data '$RemoteDeployPath' || true; ${sudoPrefix}systemctl reload nginx || true"

$sshArgs += $remoteCmd

Write-Host "在远端执行解压和部署命令..."
& $sshCmd @sshArgs
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit "远端解压/部署失败 (exit code $LASTEXITCODE)。请检查远端是否安装了 p7zip/7z，并且当前用户有 sudo 权限。" }

Write-Host "远端部署完成" -ForegroundColor Green

# 清理本地压缩包（可选）
if (-not $KeepLocal) {
    try { Remove-Item -Path $archiveFullPath -Force -ErrorAction SilentlyContinue } catch { }
    Write-Host "已删除本地压缩包：$archiveFullPath"
} else {
    Write-Host "保留本地压缩包：$archiveFullPath"
}

Write-Host "部署流程结束。"
