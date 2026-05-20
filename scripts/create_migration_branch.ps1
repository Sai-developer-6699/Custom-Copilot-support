#!/usr/bin/env pwsh
# Create and push migration branch for shadcn/ui response-modal work
param(
  [string]$branchName = "ui/shadcn-migration/response-modal"
)

Write-Output "Creating branch $branchName"

git checkout -b $branchName
git push -u origin $branchName
Write-Output "Branch created and pushed: $branchName"
