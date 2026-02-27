# Implementation Plan: Profile Photo Upload

## Overview

This implementation adds local file upload capability to the profile creation process. The current system only supports URL-based photo input. We need to add file upload with automatic optimization, local storage, and proper validation.

## Tasks

- [ ] 1. Install and configure dependencies
  - Install Sharp library for image optimization (`npm install sharp` and `npm install --save-dev @types/sharp`)
  - Verify Multer is installed (already in package.json)
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 2. Create upload directory structure and utilities
  - [ ] 2.1 Create uploads directory structure helper
    - Write utility function to create date-based subdirectories (YYYY/MM/DD)
    - Ensure directories are created with proper permissions
    - _Requirements: 4.1, 4.3_
  
  - [ ] 2.2 Create unique filename generator
    - Implement function to generate collision-free filenames using timestamp and random string
    - Sanitize original filenames to prevent path traversal
    - _Requirements: 4.2_
  
  - [ ]* 2.3 Write property test for unique filename generation
    - **Property 5: Unique filename generation**
    - **Validates: Requirements 4.2**

  - [ ]* 2.4 Write property test for path traversal prevention
    - **Property 8: Path traversal prevention**
    - **Validates: Requirements 4.1**

- [ ] 3. Implement image optimization service
  - [ ] 3.1 Create ImageOptimizationService class
    - Implement optimizeImage function using Sharp
    - Configure resize to max 1920px (fit: 'inside', withoutEnlargement: true)
    - Configure WebP conversion with 80% quality
    - Handle cleanup of original files after optimization
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 3.2 Write property test for image optimization reduces size
    - **Property 3: Image optimization reduces size**
    - **Validates: Requirements 3.5**
  
  - [ ]* 3.3 Write property test for image dimensions constraint
    - **Property 4: Image dimensions constraint**
    - **Validates: Requirements 3.3**

- [ ] 4. Configure Multer middleware for file uploads
  - [ ] 4.1 Create Multer configuration with diskStorage
    - Configure destination to use date-based directory structure
    - Configure filename to use unique generator
    - Set file size limit to 10MB
    - Implement fileFilter for allowed types (JPEG, PNG, WebP, GIF)
    - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3_
  
  - [ ]* 4.2 Write property test for file type validation
    - **Property 1: File type validation**
    - **Validates: Requirements 2.1, 2.3**
  
  - [ ]* 4.3 Write property test for file size enforcement
    - **Property 2: File size enforcement**
    - **Validates: Requirements 2.2**

- [ ] 5. Create upload controller endpoint
  - [ ] 5.1 Implement POST /api/profiles/upload endpoint
    - Accept multipart/form-data with file field
    - Validate file exists from Multer
    - Call image optimization service
    - Generate public URL for the optimized image
    - Return response with URL, filename, and size
    - Handle errors and cleanup on failure
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 6.3_
  
  - [ ]* 5.2 Write property test for URL accessibility
    - **Property 6: URL accessibility**
    - **Validates: Requirements 4.5, 5.4**
  
  - [ ]* 5.3 Write property test for upload idempotency
    - **Property 7: Upload idempotency for errors**
    - **Validates: Requirements 6.4**
  
  - [ ]* 5.4 Write unit tests for upload controller
    - Test successful upload flow
    - Test validation errors (invalid type, too large)
    - Test server errors and cleanup
    - _Requirements: 2.3, 2.4, 6.3_

- [ ] 6. Add static file serving for uploads
  - Configure Express to serve /uploads directory as static files
  - Set appropriate cache headers
  - Add to backend/src/index.ts
  - _Requirements: 4.5, 5.4_

- [ ] 7. Update Profile model and controller
  - [ ] 7.1 Add photoType field to Profile schema
    - Add enum field: 'local' | 'external'
    - Update profile creation to detect and set photoType
    - _Requirements: 5.3_
  
  - [ ] 7.2 Update profile controller to handle local paths
    - Modify createProfile to accept local file paths
    - Update photo serving logic to handle local vs external
    - _Requirements: 5.2, 5.3, 5.4_

- [ ] 8. Create frontend ImageUploadField component
  - [ ] 8.1 Implement ImageUploadField component
    - Create file input with custom styling
    - Add URL input field as alternative
    - Implement toggle between upload and URL modes
    - Show image preview for selected files
    - Display upload progress with percentage
    - Show success/error messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_
  
  - [ ] 8.2 Implement upload service function
    - Create FormData with selected file
    - Send POST request to /api/profiles/upload
    - Track upload progress using Axios onUploadProgress
    - Handle errors and return user-friendly messages
    - _Requirements: 1.4, 6.1, 6.3, 6.4_
  
  - [ ]* 8.3 Write unit tests for ImageUploadField
    - Test file selection and preview
    - Test mode toggle (upload vs URL)
    - Test error display
    - _Requirements: 1.1, 1.2, 1.3, 6.2, 6.3_

- [ ] 9. Integrate ImageUploadField into CreateProfilePage
  - Replace URL input with ImageUploadField component in step 3
  - Update form submission to handle both local and external URLs
  - Maintain backward compatibility with URL input
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 10. Add comprehensive error handling
  - [ ] 10.1 Map Multer errors to user-friendly messages
    - LIMIT_FILE_SIZE → "File size must be under 10MB"
    - LIMIT_UNEXPECTED_FILE → "Invalid file upload"
    - Add error mapping utility
    - _Requirements: 2.2, 2.3, 2.4, 6.3_
  
  - [ ] 10.2 Implement cleanup on errors
    - Delete temporary files if optimization fails
    - Delete partial uploads on network errors
    - Add cleanup utility function
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 10.3 Write unit tests for error handling
    - Test file cleanup on errors
    - Test error message mapping
    - Test retry capability
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 11. Checkpoint - Test end-to-end upload flow
  - Ensure all tests pass
  - Manually test file upload from frontend
  - Verify image optimization works correctly
  - Verify files are stored in correct directory structure
  - Verify uploaded images are accessible via URL
  - Ask the user if questions arise

- [ ] 12. Add security enhancements
  - [ ] 12.1 Implement rate limiting on upload endpoint
    - Add rate limiter middleware (e.g., express-rate-limit)
    - Set reasonable limits (e.g., 10 uploads per hour per user)
    - _Requirements: 2.2_
  
  - [ ] 12.2 Add Content-Type validation
    - Verify Content-Type header matches file extension
    - Add magic number validation for image files
    - _Requirements: 2.1, 2.3_
  
  - [ ]* 12.3 Write unit tests for security features
    - Test rate limiting
    - Test Content-Type validation
    - Test magic number validation
    - _Requirements: 2.1, 2.3_

- [ ] 13. Final checkpoint and integration testing
  - Run all unit and property tests
  - Test complete profile creation flow with file upload
  - Test profile creation with URL input (backward compatibility)
  - Test error scenarios (large files, invalid types, network errors)
  - Verify cleanup of temporary files
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with URL-based photo input
