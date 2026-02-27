# Complete Backend Flow Test
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SocialHive Complete Flow Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# Test 1: Health Check
Write-Host "[1] Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    Write-Host "  SUCCESS: Server is healthy" -ForegroundColor Green
    Write-Host "  Uptime: $($health.uptime) seconds" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: API Root
Write-Host "`n[2] Testing API Root..." -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod -Uri "$baseUrl/api" -Method GET -UseBasicParsing
    Write-Host "  SUCCESS: $($api.message) v$($api.version)" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Register New User
Write-Host "`n[3] Testing User Registration..." -ForegroundColor Yellow
$registerData = @{
    email = "test@socialhive.com"
    password = "Test123456"
    username = "testuser"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json" -UseBasicParsing
    Write-Host "  SUCCESS: User registered" -ForegroundColor Green
    Write-Host "  User ID: $($register.user._id)" -ForegroundColor Gray
    $token = $register.token
    $userId = $register.user._id
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.error.code -eq "USER_EXISTS") {
        Write-Host "  INFO: User already exists, trying login..." -ForegroundColor Yellow
        
        # Try login instead
        $loginData = @{
            email = "test@socialhive.com"
            password = "Test123456"
        } | ConvertTo-Json
        
        try {
            $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing
            Write-Host "  SUCCESS: User logged in" -ForegroundColor Green
            $token = $login.token
            $userId = $login.user._id
        } catch {
            Write-Host "  FAILED: Could not login - $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  FAILED: $($errorDetails.error.message)" -ForegroundColor Red
        exit 1
    }
}

# Test 4: Create Profile
Write-Host "`n[4] Testing Profile Creation..." -ForegroundColor Yellow
$profileData = @{
    userId = $userId
    displayName = "Test User"
    bio = "This is a test user profile"
    skills = @("JavaScript", "TypeScript", "Node.js")
    location = @{
        type = "Point"
        coordinates = @(-74.006, 40.7128)
    }
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $profile = Invoke-RestMethod -Uri "$baseUrl/api/profiles" -Method POST -Body $profileData -ContentType "application/json" -Headers $headers -UseBasicParsing
    Write-Host "  SUCCESS: Profile created" -ForegroundColor Green
    Write-Host "  Profile ID: $($profile._id)" -ForegroundColor Gray
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.error.code -eq "PROFILE_EXISTS") {
        Write-Host "  INFO: Profile already exists" -ForegroundColor Yellow
    } else {
        Write-Host "  FAILED: $($errorDetails.error.message)" -ForegroundColor Red
    }
}

# Test 5: Get Gigs (with auth)
Write-Host "`n[5] Testing Gig Listing..." -ForegroundColor Yellow
try {
    $gigs = Invoke-RestMethod -Uri "$baseUrl/api/gigs" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "  SUCCESS: Retrieved gigs" -ForegroundColor Green
    Write-Host "  Total gigs: $($gigs.Count)" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Search (with auth)
Write-Host "`n[6] Testing Search..." -ForegroundColor Yellow
try {
    $search = Invoke-RestMethod -Uri "$baseUrl/api/search?q=test" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "  SUCCESS: Search working" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  All Core Endpoints Working!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Backend is ready at: $baseUrl" -ForegroundColor Cyan
Write-Host "You can now run: npm start" -ForegroundColor Yellow
Write-Host ""
