$root = Get-Location
Get-ChildItem -Path app, lib -Recurse -File | ForEach-Object { $_.FullName.Replace($root.Path + '\', '') } | Out-File -FilePath file-list.txt -Encoding utf8
