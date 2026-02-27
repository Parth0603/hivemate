# SocialHive Backend Endpoint Testing Script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Testing SocialHive Backend Endpoints" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Url" -ForegroundColor Gray
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -ErrorAction Stop
        } else {
            $jsonBody = $Body | ConvertTo-Json
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $jsonBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        }
        
        Write-Host "  Status: $($response.StatusCode) - SUCCESS" -ForegroundColor Green
        Write-Host "  Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
        Write-Host ""
        
        return @{
            Name = $Name
            Status = $response.StatusCode
            Success = $true
        }
    } catch {
        Write-Host "  Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        
        return @{
            Name = $Name
            Status = "Error"
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Test Health Endpoint
$testResults += Test-Endpoint -Name "Health Check" -Url "$baseUrl/health"

# Test Main API Endpoint
$testResults += Test-Endpoint -Name "API Root" -Url "$baseUrl/api"

# Test Auth Endpoints (these will return errors but we're checking if routes exist)
Write-Host "`n--- Authentication Endpoints ---" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Register (no data)" -Url "$baseUrl/api/auth/register" -Method "POST"
$testResults += Test-Endpoint -Name "Login (no data)" -Url "$baseUrl/api/auth/login" -Method "POST"

# Test Profile Endpoints
Write-Host "`n--- Profile Endpoints ---" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Get Profiles" -Url "$baseUrl/api/profiles"

# Test Gig Endpoints
Write-Host "`n--- Gig Endpoints ---" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Get Gigs" -Url "$baseUrl/api/gigs"

# Test Search Endpoints
Write-Host "`n--- Search Endpoints ---" -ForegroundColor Cyan
$testResults += Test-Endpoint -Name "Search" -Url "$baseUrl/api/search"

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$successCount = ($testResults | Where-Object { $_.Success }).Count
$totalCount = $testResults.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $successCount" -ForegroundColor Green
Write-Host "Failed: $($totalCount - $successCount)" -ForegroundColor Red
Write-Host ""

foreach ($result in $testResults) {
    $color = if ($result.Success) { "Green" } else { "Red" }
    $status = if ($result.Success) { "[PASS]" } else { "[FAIL]" }
    Write-Host "$status $($result.Name) - Status: $($result.Status)" -ForegroundColor $color
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
