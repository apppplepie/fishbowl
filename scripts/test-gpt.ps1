param([string]$Image = 'mysql:8.4')
$ErrorActionPreference = 'Stop'
$containerName = 'fishbowl-gpt-test-' + [guid]::NewGuid().ToString('N')
$testPassword = [guid]::NewGuid().ToString('N')
$testVariables = @{ FISHBOWL_TEST_DB='1'; DB_HOST='127.0.0.1'; DB_NAME='fishbowl_tools_test'; DB_USER='root'; DB_PASSWORD=$testPassword }
$savedVariables = @{}
foreach ($key in @($testVariables.Keys) + 'DB_PORT') { $savedVariables[$key] = [Environment]::GetEnvironmentVariable($key) }
$created = $false
Push-Location (Join-Path $PSScriptRoot '..')
try {
  docker run --detach --name $containerName --publish '127.0.0.1::3306' --env "MYSQL_ROOT_PASSWORD=$testPassword" --env MYSQL_DATABASE=fishbowl_tools_test $Image | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not start isolated MySQL container' }
  $created = $true
  $portMapping = docker port $containerName 3306/tcp
  if ($LASTEXITCODE -ne 0 -or $portMapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Unexpected MySQL port mapping' }
  $testVariables['DB_PORT'] = $Matches[1]
  foreach ($key in $testVariables.Keys) { [Environment]::SetEnvironmentVariable($key, $testVariables[$key]) }
  $ready = $false
  for ($attempt=0; $attempt -lt 40; $attempt++) {
    docker exec --env "MYSQL_PWD=$testPassword" $containerName mysql --protocol=TCP '--host=127.0.0.1' --user=root --database=fishbowl_tools_test -e 'SELECT 1' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready=$true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'MySQL readiness timed out' }
  npm run test:gpt
  if ($LASTEXITCODE -ne 0) { throw 'GPT tests failed' }
} finally {
  if ($created) { docker rm --force --volumes $containerName | Out-Null }
  foreach ($key in $savedVariables.Keys) { [Environment]::SetEnvironmentVariable($key, $savedVariables[$key]) }
  Pop-Location
}
