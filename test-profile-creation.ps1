# Test profile creation with all required fields including gender

$token = "YOUR_TOKEN_HERE"
$userId = "YOUR_USER_ID_HERE"

$body = @{
    name = "Test User"
    age = 25
    gender = "male"
    place = "San Francisco, CA"
    profession = "Software Engineer"
    skills = @("JavaScript", "React", "Node.js")
    bio = "I am a passionate software engineer with experience in full-stack development."
    photo = "https://via.placeholder.com/150"
    photos = @("https://via.placeholder.com/150")
    websiteUrl = "https://example.com"
    college = "Stanford University"
    company = "Tech Corp"
} | ConvertTo-Json

Write-Host "Testing profile creation..." -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/profiles" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -Body $body

    Write-Host "✅ Profile created successfully!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating profile:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
