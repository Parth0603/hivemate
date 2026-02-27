# Design Document: Profile Photo Upload

## Overview

This feature adds local file upload capability to the profile creation process, allowing users to upload photos directly from their devices. The system will automatically optimize and compress images before storing them locally on the server. Users will have the option to either upload a file or provide an image URL.

## Architecture

### High-Level Flow

1. User selects image file in browser
2. Frontend validates file type and size
3. File is uploaded to backend via multipart/form-data
4. Backend validates file again (security)
5. Image is optimized and compressed using Sharp library
6. Optimized image is saved to local file system
7. File path is returned to frontend
8. Frontend updates form with the server URL
9. Profile is created with the image path

### Technology Stack

- **Frontend**: React file input, FormData API, Axios for upload
- **Backend**: Multer for file handling, Sharp for image optimization
- **Storage**: Local file system with organized directory structure

## Components and Interfaces

### Frontend Components

#### 1. ImageUploadField Component

```typescript
interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  onError: (error: string) => void;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  preview: string | null;
  error: string | null;
}
```

**Responsibilities:**
- Render file input button and URL input field
- Handle file selection and preview
- Upload file to backend with progress tracking
- Display upload status and errors
- Toggle between upload and URL input modes

#### 2. Upload Service

```typescript
interface UploadResponse {
  success: boolean;
  url: string;
  filename: string;
  size: number;
}

async function uploadImage(file: File): Promise<UploadResponse>
```

**Responsibilities:**
- Create FormData with file
- Send POST request to upload endpoint
- Track upload progress
- Handle errors and retries

### Backend Components

#### 1. Upload Middleware (Multer Configuration)

```typescript
interface MulterConfig {
  storage: diskStorage;
  limits: { fileSize: number };
  fileFilter: (req, file, cb) => void;
}
```

**Responsibilities:**
- Configure file storage destination
- Set file size limits (10MB)
- Filter allowed file types
- Generate unique filenames

#### 2. Image Optimization Service

```typescript
interface OptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: OptimizationOptions
): Promise<OptimizedImageInfo>
```

**Responsibilities:**
- Load image using Sharp
- Resize if dimensions exceed limits
- Compress with quality settings
- Convert to optimal format (WebP preferred)
- Save optimized image
- Delete original if different from optimized

#### 3. Upload Controller

```typescript
async function handleImageUpload(req: Request, res: Response): Promise<void>
```

**Responsibilities:**
- Receive uploaded file from Multer
- Validate file exists
- Call optimization service
- Generate public URL
- Return response with image URL
- Handle errors

#### 4. Static File Server

```typescript
app.use('/uploads', express.static(uploadsDirectory))
```

**Responsibilities:**
- Serve uploaded images as static files
- Set appropriate cache headers
- Handle 404 for missing files

## Data Models

### Upload Directory Structure

```
backend/
  uploads/
    profiles/
      2024/
        02/
          24/
            abc123-profile.webp
            def456-profile.webp
```

### Database Schema Update

```typescript
interface Profile {
  // ... existing fields
  photo: string; // Can be local path or external URL
  photoType: 'local' | 'external'; // Track source
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File Type Validation

*For any* uploaded file, if the file type is not JPEG, PNG, WebP, or GIF, then the upload SHALL be rejected with an appropriate error message.

**Validates: Requirements 2.1, 2.3**

### Property 2: File Size Enforcement

*For any* uploaded file, if the file size exceeds 10MB, then the upload SHALL be rejected before processing.

**Validates: Requirements 2.2**

### Property 3: Image Optimization Reduces Size

*For any* valid image file uploaded, the optimized output file size SHALL be smaller than the original file size.

**Validates: Requirements 3.5**

### Property 4: Image Dimensions Constraint

*For any* optimized image, both width and height SHALL be less than or equal to 1920 pixels.

**Validates: Requirements 3.3**

### Property 5: Unique Filename Generation

*For any* two uploaded files, even if they have the same original filename, the system SHALL generate unique filenames that do not collide.

**Validates: Requirements 4.2**

### Property 6: URL Accessibility

*For any* successfully uploaded image, the returned URL SHALL be accessible via HTTP GET request and return the image data.

**Validates: Requirements 4.5, 5.4**

### Property 7: Upload Idempotency for Errors

*For any* failed upload attempt, retrying with the same file SHALL not create duplicate files or corrupt existing data.

**Validates: Requirements 6.4**

### Property 8: Path Traversal Prevention

*For any* uploaded file, the saved file path SHALL not allow directory traversal outside the designated uploads directory.

**Validates: Requirements 4.1** (Security consideration)

## Error Handling

### Frontend Error Scenarios

1. **File too large**: Display "File size must be under 10MB"
2. **Invalid file type**: Display "Please upload a JPEG, PNG, WebP, or GIF image"
3. **Network error**: Display "Upload failed. Please check your connection and try again"
4. **Server error**: Display "Upload failed. Please try again later"
5. **No file selected**: Prevent upload attempt

### Backend Error Scenarios

1. **Multer errors**: Map to user-friendly messages
2. **Disk space full**: Return 507 Insufficient Storage
3. **Optimization fails**: Clean up partial files, return 500
4. **Invalid image data**: Return 400 Bad Request
5. **Permission errors**: Log and return 500

### Error Recovery

- Frontend: Allow retry without page reload
- Backend: Clean up temporary files on error
- Partial uploads: Delete incomplete files
- Failed optimization: Keep original if optimization fails

## Testing Strategy

### Unit Tests

1. **File validation**:
   - Test allowed file types (JPEG, PNG, WebP, GIF)
   - Test rejected file types (PDF, EXE, etc.)
   - Test file size limits

2. **Filename generation**:
   - Test uniqueness with same original names
   - Test special character handling
   - Test path traversal prevention

3. **Image optimization**:
   - Test compression reduces file size
   - Test dimension resizing
   - Test format conversion
   - Test quality preservation

4. **URL generation**:
   - Test correct path construction
   - Test accessibility of generated URLs

### Property-Based Tests

Each property test will run a minimum of 100 iterations with randomized inputs.

1. **Property 1 Test**: Generate random file types, verify only valid types pass
   - **Feature: profile-photo-upload, Property 1**: File type validation

2. **Property 2 Test**: Generate files of various sizes, verify 10MB limit enforced
   - **Feature: profile-photo-upload, Property 2**: File size enforcement

3. **Property 3 Test**: Upload random valid images, verify output size < input size
   - **Feature: profile-photo-upload, Property 3**: Image optimization reduces size

4. **Property 4 Test**: Upload images of various dimensions, verify max 1920px
   - **Feature: profile-photo-upload, Property 4**: Image dimensions constraint

5. **Property 5 Test**: Upload multiple files with same name, verify unique filenames
   - **Feature: profile-photo-upload, Property 5**: Unique filename generation

6. **Property 6 Test**: Upload random images, verify all returned URLs are accessible
   - **Feature: profile-photo-upload, Property 6**: URL accessibility

7. **Property 7 Test**: Simulate failed uploads and retries, verify no duplicates
   - **Feature: profile-photo-upload, Property 7**: Upload idempotency for errors

8. **Property 8 Test**: Generate filenames with path traversal attempts, verify blocked
   - **Feature: profile-photo-upload, Property 8**: Path traversal prevention

### Integration Tests

1. End-to-end upload flow from frontend to storage
2. Profile creation with uploaded image
3. Image serving via static file endpoint
4. Error handling across frontend and backend
5. Concurrent uploads from multiple users

## Implementation Notes

### Sharp Library Configuration

```typescript
sharp(inputBuffer)
  .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(outputPath)
```

### Multer Configuration

```typescript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const date = new Date();
    const dir = `uploads/profiles/${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}-profile${ext}`);
  }
});
```

### Security Considerations

1. Validate file type on both frontend and backend
2. Use Content-Type checking, not just file extension
3. Sanitize filenames to prevent injection
4. Set appropriate file permissions (read-only for served files)
5. Implement rate limiting on upload endpoint
6. Scan for malicious content (future enhancement)

### Performance Considerations

1. Process optimization asynchronously if possible
2. Set reasonable timeout for uploads (30 seconds)
3. Use streaming for large files
4. Consider adding upload queue for high traffic
5. Implement cleanup job for orphaned files
