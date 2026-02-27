# Implementation Plan: SocialHive Platform

## Overview

This implementation plan breaks down the SocialHive platform into incremental, manageable tasks. The approach follows a layered implementation strategy: foundation (auth, database) → core features (profiles, radar) → communication (chat, calls) → collaboration (gigs) → polish (notifications, subscriptions). Each task builds on previous work, ensuring the system remains functional and testable at each stage.

## Tasks

- [x] 1. Project setup and infrastructure foundation
  - Initialize TypeScript project with Node.js backend and React frontend
  - Set up MongoDB with geospatial indexing and Redis for caching
  - Configure build tools (Webpack/Vite), linting (ESLint), and testing frameworks (Jest, fast-check)
  - Create project structure: `/backend`, `/frontend`, `/shared` for types
  - Set up environment configuration and secrets management
  - _Requirements: All (foundation for entire system)_

- [x] 2. Authentication system
  - [x] 2.1 Implement user registration and login
    - Create User model with email, passwordHash, timestamps
    - Implement password hashing with bcrypt
    - Create JWT token generation and validation
    - Build REST endpoints: POST /api/auth/register, POST /api/auth/login
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Write property test for password hashing

    - **Property 41: Password Hashing**
    - **Validates: Requirements 19.1**

  - [x] 2.3 Write property test for token expiration

    - **Property 42: Authentication Token Expiration**
    - **Validates: Requirements 19.3**

  - [x] 2.4 Implement session management with Redis
    - Store active sessions in Redis with TTL
    - Create middleware for token validation
    - Build logout endpoint: POST /api/auth/logout
    - _Requirements: 14.6_

- [x] 3. Profile management system
  - [x] 3.1 Create profile data models and validation
    - Define Profile interface with all required and optional fields
    - Implement validation for required fields (name, age, place, skills, profession, photo)
    - Create MongoDB schema with indexes on skills, profession, optimizedKeywords
    - _Requirements: 1.3, 1.4_

  - [x] 3.2 Write property test for profile creation validation

    - **Property 1: Profile Creation Validation**
    - **Validates: Requirements 1.3**

  - [x] 3.3 Write property test for optional fields acceptance

    - **Property 2: Optional Fields Acceptance**
    - **Validates: Requirements 1.4**

  - [x] 3.4 Implement profile CRUD endpoints
    - POST /api/profiles - Create profile with validation
    - GET /api/profiles/:userId - Get profile (with privacy rules)
    - PUT /api/profiles/:userId - Update profile
    - DELETE /api/profiles/:userId - Soft delete profile
    - _Requirements: 1.3, 1.4, 1.6_

  - [x] 3.5 Implement photo upload system
    - Integrate AWS S3 or similar for photo storage
    - Create photo upload endpoint: POST /api/profiles/:userId/photos
    - Implement 5-photo limit validation
    - Create photo deletion endpoint: DELETE /api/profiles/:userId/photos/:photoId
    - _Requirements: 1.5_

  - [x] 3.6 Write property test for photo upload limit

    - **Property 3: Photo Upload Limit**
    - **Validates: Requirements 1.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. AI SEO optimization service
  - [x] 5.1 Implement keyword extraction and optimization
    - Create AI service using TensorFlow.js or call external ML API
    - Extract keywords from profile fields (skills, profession, bio, achievements)
    - Generate optimized keyword list using TF-IDF or similar algorithm
    - Store optimizedKeywords in profile
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Write property test for AI keyword generation

    - **Property 4: AI Keyword Generation**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 5.3 Integrate AI optimization into profile creation flow
    - Trigger AI optimization after profile creation/update
    - Update profile with optimized keywords
    - _Requirements: 2.1_

- [x] 6. Geolocation and radar system
  - [x] 6.1 Implement location tracking and storage
    - Create Location model with userId, coordinates (GeoJSON Point), mode, timestamp
    - Create 2dsphere geospatial index on coordinates field
    - Build location update endpoint: POST /api/location/update
    - Implement location update validation and rate limiting
    - _Requirements: 17.1_

  - [x] 6.2 Write property test for location tracking in explore mode

    - **Property 35: Location Tracking in Explore Mode**
    - **Validates: Requirements 17.1**

  - [x] 6.3 Implement visibility mode management
    - Create VisibilityState tracking (explore/vanish)
    - Build visibility toggle endpoint: PUT /api/visibility/mode
    - Implement logic to show/hide users based on mode
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 6.4 Write property test for explore mode visibility

    - **Property 6: Explore Mode Visibility**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 6.5 Write property test for vanish mode invisibility

    - **Property 7: Vanish Mode Invisibility**
    - **Validates: Requirements 3.5, 3.6**

  - [x] 6.4 Implement geospatial radar queries
    - Build nearby users query using $nearSphere (MongoDB) or ST_DWithin (PostGIS)
    - Create radar endpoint: GET /api/radar/nearby?lat=X&lng=Y&radius=Z
    - Filter results by visibility mode (only explore mode users)
    - Return RadarDot array with userId, distance, gender, coordinates
    - _Requirements: 4.4, 17.3_

  - [x] 6.7 Write property test for distance calculation accuracy

    - **Property 36: Distance Calculation Accuracy**
    - **Validates: Requirements 17.3**

  - [x] 6.8 Write property test for distance filter accuracy

    - **Property 37: Distance Filter Accuracy**
    - **Validates: Requirements 17.4**

- [x] 7. WebSocket real-time communication
  - [x] 7.1 Set up WebSocket server with Socket.IO
    - Initialize Socket.IO server
    - Implement connection authentication using JWT
    - Create connection/disconnection handlers
    - Set up room-based messaging for targeted updates
    - _Requirements: 4.4, 17.2_

  - [x] 7.2 Implement real-time location broadcasting
    - Listen for 'location:update' events from clients
    - Broadcast location updates to nearby users
    - Emit 'radar:update' events with updated RadarDot arrays
    - Implement debouncing to prevent excessive updates
    - _Requirements: 3.3, 4.4_

  - [x] 7.3 Write property test for real-time radar updates

    - **Property 10: Real-Time Radar Updates**
    - **Validates: Requirements 4.4, 17.2**

  - [x] 7.4 Implement nearby user notifications
    - Detect when user enables explore mode
    - Query nearby users within radar range
    - Emit 'nearby:notification' events to nearby users
    - _Requirements: 3.8_

  - [x] 7.5 Write property test for nearby user notifications

    - **Property 9: Nearby User Notifications**
    - **Validates: Requirements 3.8, 13.1**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Connection request and friendship system
  - [x] 9.1 Implement connection request functionality
    - Create ConnectionRequest model with senderId, receiverId, status
    - Build send request endpoint: POST /api/connections/request
    - Implement duplicate request prevention
    - Create accept/decline endpoints: PUT /api/connections/:requestId/accept, PUT /api/connections/:requestId/decline
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.2 Write property test for connection request notifications

    - **Property 13: Connection Request Notifications**
    - **Validates: Requirements 5.2, 13.2**

  - [x] 9.3 Implement mutual acceptance detection and friendship creation
    - Detect when both users have accepted each other's requests
    - Create Friendship model with user1Id, user2Id, communicationLevel, interactionCount
    - Automatically create friendship when mutual acceptance occurs
    - _Requirements: 5.4_

  - [x] 9.4 Write property test for mutual acceptance creates friendship

    - **Property 14: Mutual Acceptance Creates Friendship**
    - **Validates: Requirements 5.4**

  - [x] 9.5 Write property test for friendship bidirectional visibility

    - **Property 17: Friendship Bidirectional Visibility**
    - **Validates: Requirements 5.7**

  - [x] 9.6 Implement friend list management
    - Build friend list endpoint: GET /api/friends
    - Create remove friend endpoint: DELETE /api/friends/:friendshipId
    - Implement block functionality: POST /api/friends/:friendshipId/block
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.7 Write property test for friend removal revokes access

    - **Property 18: Friend Removal Revokes Access**
    - **Validates: Requirements 6.3**

  - [x] 9.8 Write property test for blocking prevents interactions

    - **Property 19: Blocking Prevents All Interactions**
    - **Validates: Requirements 6.4**

- [x] 10. Profile privacy and access control
  - [x] 10.1 Implement profile preview with privacy rules
    - Create profile preview logic that shows only bio for non-friends
    - Modify GET /api/profiles/:userId to respect friendship status
    - Hide photos, achievements, contact info for non-friends
    - _Requirements: 4.7, 18.1_

  - [x] 10.2 Write property test for profile preview privacy

    - **Property 11: Profile Preview Privacy**
    - **Validates: Requirements 4.7, 18.1**

  - [x] 10.3 Implement full profile access for friends
    - Unlock all profile fields when friendship exists
    - Make all photos accessible to friends
    - _Requirements: 5.5, 18.3, 18.4_

  - [x] 10.4 Write property test for friendship unlocks full profile

    - **Property 15: Friendship Unlocks Full Profile**
    - **Validates: Requirements 5.5, 18.3**

  - [x] 10.5 Write property test for photo privacy before friendship

    - **Property 38: Photo Privacy Before Friendship**
    - **Validates: Requirements 18.2**

  - [x] 10.6 Write property test for photo visibility after friendship

    - **Property 39: Photo Visibility After Friendship**
    - **Validates: Requirements 18.4**

  - [x] 10.7 Write property test for privacy persistence after updates

    - **Property 40: Privacy Persistence After Profile Updates**
    - **Validates: Requirements 18.5**

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Encrypted messaging system
  - [x] 12.1 Implement encryption key management
    - Create EncryptionKeys model to store public keys
    - Build key exchange endpoint: POST /api/keys/exchange
    - Create public key retrieval endpoint: GET /api/keys/:userId/public
    - Implement client-side key pair generation using Web Crypto API
    - _Requirements: 7.2, 7.3_

  - [x] 12.2 Implement chat room creation and management
    - Create ChatRoom model with type (personal/group), participants, gigId
    - Auto-create personal chat rooms when friendship is established
    - Build chat room retrieval endpoint: GET /api/chats
    - _Requirements: 5.6, 7.6_

  - [x] 12.3 Implement message sending and receiving
    - Create Message model with senderId, receiverId, encryptedContent, timestamp
    - Build message send endpoint: POST /api/messages
    - Implement authorization check (must be friends)
    - Store encrypted message content
    - Emit 'message:receive' WebSocket event to recipient
    - _Requirements: 7.5, 5.6_

  - [x] 12.4 Write property test for chat disabled before mutual acceptance

    - **Property 12: Chat Disabled Before Mutual Acceptance**
    - **Validates: Requirements 4.9**

  - [x] 12.5 Write property test for friendship enables chat

    - **Property 16: Friendship Enables Chat**
    - **Validates: Requirements 5.6, 7.1, 8.1**

  - [x] 12.6 Write property test for message encryption

    - **Property 20: Message Encryption**
    - **Validates: Requirements 7.5, 19.4**

  - [x] 12.7 Implement message retrieval and history
    - Build message history endpoint: GET /api/messages/chat/:chatRoomId
    - Implement pagination for message history
    - Mark messages as delivered/read
    - _Requirements: 7.1_

- [x] 13. Progressive communication unlocking
  - [x] 13.1 Implement interaction tracking
    - Track interaction count in Friendship model
    - Increment count on each meaningful interaction (message, call)
    - Update communicationLevel based on interaction count and subscription
    - _Requirements: 8.1, 8.2_

  - [x] 13.2 Implement voice call capability unlocking
    - Check interaction count >= 2 for voice call unlock
    - Build call initiation endpoint: POST /api/calls/initiate
    - Implement authorization check for voice calls
    - Emit 'call:incoming' WebSocket event
    - _Requirements: 8.2_

  - [x]* 13.3 Write property test for voice call unlock after interactions
    - **Property 21: Voice Call Unlock After Interactions**
    - **Validates: Requirements 8.2**

  - [x] 13.3 Implement WebRTC signaling for voice/video calls
    - Create CallSession model with type, participants, status
    - Implement WebRTC offer/answer exchange via WebSocket
    - Handle ICE candidate exchange
    - Build call end endpoint: PUT /api/calls/:callId/end
    - _Requirements: 8.2, 8.3_

  - [x]* 13.5 Write property test for locked features return errors
    - **Property 23: Locked Features Return Errors**
    - **Validates: Requirements 8.4**

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 15. Subscription and payment system
  - [x] 15.1 Implement subscription management
    - Create Subscription model with userId, plan, status, dates
    - Integrate Stripe API for payment processing
    - Build subscription creation endpoint: POST /api/subscriptions/create
    - Implement subscription status checking
    - _Requirements: 15.1, 15.4_

  - [x] 15.2 Implement video call unlocking with subscription
    - Check if either user in conversation has active subscription
    - Unlock video call capability for both users if condition met
    - Update communicationLevel to 'video' when unlocked
    - _Requirements: 8.3, 15.2, 15.3_

  - [x]* 15.3 Write property test for subscription enables video for both users
    - **Property 22: Subscription Enables Video for Both Users**
    - **Validates: Requirements 8.3, 15.2, 15.3**

  - [x] 15.4 Implement subscription cancellation and renewal
    - Build cancel endpoint: POST /api/subscriptions/cancel
    - Handle Stripe webhooks for subscription events
    - Update subscription status based on payment status
    - _Requirements: 15.5_

- [ ] 16. Gig management system
  - [x] 16.1 Create gig data models and validation
    - Define Gig interface with all required fields
    - Implement validation for required fields (title, description, skills, type, payment status)
    - Create MongoDB schema with indexes on type, skillsRequired
    - _Requirements: 9.1, 9.2_

  - [x]* 16.2 Write property test for gig creation validation
    - **Property 24: Gig Creation Validation**
    - **Validates: Requirements 9.2**

  - [x]* 16.3 Write property test for gig type validation
    - **Property 25: Gig Type Validation**
    - **Validates: Requirements 9.3**

  - [x]* 16.4 Write property test for gig payment status validation
    - **Property 26: Gig Payment Status Validation**
    - **Validates: Requirements 9.4**

  - [x] 16.5 Implement gig CRUD endpoints
    - POST /api/gigs - Create gig with validation
    - GET /api/gigs - List gigs with filtering
    - GET /api/gigs/:gigId - Get single gig
    - PUT /api/gigs/:gigId - Update gig
    - DELETE /api/gigs/:gigId - Delete gig
    - _Requirements: 9.1, 9.5_

  - [x]* 16.6 Write property test for gig discoverability
    - **Property 27: Gig Discoverability**
    - **Validates: Requirements 9.5**

  - [x] 16.7 Implement gig application system
    - Create GigApplication model with gigId, applicantId, status
    - Build apply endpoint: POST /api/gigs/:gigId/apply
    - Create applicant management endpoints for gig creators
    - Auto-create group chat room when application is accepted
    - _Requirements: 9.7_

  - [x]* 16.8 Write property test for gig application creates group chat
    - **Property 28: Gig Application Creates Group Chat**
    - **Validates: Requirements 9.7**

- [ ] 17. Search and filtering system
  - [x] 17.1 Implement profile search with filters
    - Build search endpoint: POST /api/search/profiles
    - Implement filters: skills, profession, niche, distance
    - Use AI-optimized keywords for ranking
    - Apply geospatial filtering for distance
    - _Requirements: 12.1, 12.2_

  - [x] 17.2 Write property test for user profile filtering

    - **Property 30: User Profile Filtering**
    - **Validates: Requirements 12.2**

  - [x] 17.3 Write property test for AI-optimized search ranking

    - **Property 5: AI-Optimized Search Ranking**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 17.4 Implement gig search with filters
    - Build search endpoint: POST /api/search/gigs
    - Implement filters: type, skills, payment status
    - Return paginated results
    - _Requirements: 11.2, 11.3_

  - [x]* 17.5 Write property test for gig type filtering
    - **Property 29: Gig Type Filtering**
    - **Validates: Requirements 11.3, 12.3**

  - [x]* 17.6 Write property test for multiple filter combination
    - **Property 31: Multiple Filter Combination**
    - **Validates: Requirements 12.5**

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Notification system
  - [x] 19.1 Implement notification creation and storage
    - Create Notification model with userId, type, title, message, data, read status
    - Build notification creation service
    - Set up TTL index for automatic notification cleanup
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 19.2 Implement real-time notification delivery
    - Emit 'notification:new' WebSocket events
    - Create notification retrieval endpoint: GET /api/notifications
    - Build mark as read endpoint: PUT /api/notifications/:notificationId/read
    - _Requirements: 13.6_

  - [x]* 19.3 Write property test for gig application notifications
    - **Property 32: Gig Application Notifications**
    - **Validates: Requirements 13.3**

  - [x]* 19.4 Write property test for message notifications
    - **Property 33: Message Notifications**
    - **Validates: Requirements 13.4**

  - [x]* 19.5 Write property test for call request notifications
    - **Property 34: Call Request Notifications**
    - **Validates: Requirements 13.5**

- [ ] 20. Frontend - Landing page and authentication
  - [x] 20.1 Create landing page UI
    - Build landing page with non-interactive radar visualization
    - Add "About the app" section explaining professional networking focus
    - Create "Start" button that redirects to registration
    - Implement responsive design
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 20.2 Create registration and login forms
    - Build registration form with validation
    - Create login form with error handling
    - Implement JWT token storage in localStorage
    - Add redirect to profile creation after registration
    - _Requirements: 1.1, 1.2_

  - [x] 20.3 Create profile creation form
    - Build multi-step profile form with all required fields
    - Implement photo upload with preview
    - Add validation for required fields
    - Redirect to homepage after completion
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [ ] 21. Frontend - Homepage and radar interface
  - [x] 21.1 Create homepage with mode toggle
    - Build top navigation with app name and hamburger menu
    - Create toggle switch: "Find a Partner" / "Find a Team Mate"
    - Implement dynamic layout switching without page reload
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 21.2 Implement interactive radar visualization
    - Create canvas-based radar with dot representation
    - Color code dots: blue for male, pink for female
    - Add distance range slider
    - Implement real-time updates via WebSocket
    - Make dots clickable to show profile previews
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 21.3 Implement explore/vanish mode toggle
    - Create visibility mode toggle UI
    - Connect to backend visibility API
    - Update radar visibility based on mode
    - _Requirements: 3.1_

  - [x] 21.4 Implement profile preview modal
    - Show bio-only preview for non-friends
    - Add "Send Request" button
    - Show chat icon (disabled until mutual acceptance)
    - _Requirements: 4.7, 4.8, 4.9_

- [ ] 22. Frontend - Profile and friend management
  - [x] 22.1 Create profile view and edit pages
    - Build profile display with all fields
    - Create edit form for profile updates
    - Implement photo management (upload, delete)
    - Show different views for own profile vs others
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 22.2 Create friend list page
    - Display all friends with profile previews
    - Add remove, block, and message buttons for each friend
    - Implement search/filter within friend list
    - _Requirements: 6.1, 6.2_

  - [x] 22.3 Implement connection request UI
    - Show pending sent and received requests
    - Add accept/decline buttons for received requests
    - Display request status
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 23. Frontend - Messaging and calls
  - [x] 23.1 Create chat interface
    - Build chat list showing all conversations
    - Create chat window with message history
    - Implement real-time message updates via WebSocket
    - Add message input with send button
    - Show encryption indicator
    - _Requirements: 7.1, 7.5, 7.6_

  - [x] 23.2 Implement client-side encryption
    - Generate RSA key pair on first use
    - Store private key securely in browser
    - Encrypt messages before sending
    - Decrypt received messages
    - _Requirements: 7.2, 7.3, 7.5_

  - [x] 23.3 Implement voice and video call UI
    - Create call initiation buttons (with lock indicators)
    - Build incoming call modal
    - Implement WebRTC peer connection
    - Add call controls (mute, end call)
    - Show subscription prompt for video if locked
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 24. Frontend - Gig management
  - [x] 24.1 Create gig listing page
    - Build gig feed with filter options (All, Jobs, Startup, Projects, Hackathon)
    - Display gig cards with title, description, skills, type, payment status
    - Implement pagination or infinite scroll
    - Add search functionality
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 24.2 Create gig creation and management forms
    - Build gig creation form with validation
    - Create gig edit form
    - Add applicant management interface for gig creators
    - Implement accept/reject applicant actions
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 24.3 Implement gig application flow
    - Add "Apply" button on gig details
    - Show application status
    - Create group chat access after acceptance
    - _Requirements: 9.7, 11.5_

- [x] 25. Frontend - Notifications and navigation
  - [x] 25.1 Implement notification system
    - Create notification bell icon with unread count
    - Build notification dropdown/panel
    - Show real-time notifications via WebSocket
    - Add mark as read functionality
    - Implement notification types with icons
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 25.2 Create hamburger menu and navigation
    - Build hamburger menu with Profile, Friend List, About Us, Logout options
    - Implement navigation between pages
    - Add logout functionality with token cleanup
    - Create About Us page
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 26. Frontend - Subscription and payments
  - [x] 26.1 Create subscription page
    - Build subscription plan display
    - Integrate Stripe checkout
    - Show current subscription status
    - Add cancel subscription option
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 26.2 Implement subscription prompts
    - Show video call unlock prompt for non-subscribers
    - Display subscription benefits
    - Add "Upgrade" CTAs in appropriate places
    - _Requirements: 8.5, 15.1_

- [x] 27. Frontend - Search and filters
  - [x] 27.1 Implement advanced search interface
    - Create search bar with autocomplete
    - Build filter panel with all filter options
    - Add distance range slider for location-based search
    - Show search results with relevance ranking
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 27.2 Implement filter UI for radar and gigs
    - Add filter controls to radar interface
    - Create filter panel for gig listings
    - Show active filters with clear/remove options
    - Update results in real-time as filters change
    - _Requirements: 11.2, 12.1_

- [x] 28. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 29. Integration testing and bug fixes
  - [ ]* 29.1 Write integration tests for complete user flows
    - Test registration → profile creation → radar discovery → connection → chat flow
    - Test gig creation → application → group chat flow
    - Test subscription → video call unlock flow
    - _Requirements: All_

  - [x] 29.2 Perform cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Verify WebSocket connections work across browsers
    - Test Web Crypto API compatibility
    - Fix browser-specific issues
    - _Requirements: All_

  - [x] 29.3 Fix bugs and edge cases
    - Address any failing tests
    - Fix UI/UX issues discovered during testing
    - Optimize performance bottlenecks
    - _Requirements: All_

- [x] 30. Performance optimization and polish
  - [x] 30.1 Optimize database queries
    - Add missing indexes
    - Optimize geospatial queries
    - Implement query result caching in Redis
    - _Requirements: 17.3, 17.4_

  - [x] 30.2 Optimize frontend performance
    - Implement code splitting and lazy loading
    - Optimize bundle size
    - Add service worker for offline support
    - Implement image optimization and lazy loading
    - _Requirements: All_

  - [x] 30.3 Add error handling and loading states
    - Implement global error boundary
    - Add loading spinners and skeletons
    - Show user-friendly error messages
    - Implement retry logic for failed requests
    - _Requirements: All_

- [x] 31. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation follows a layered approach: backend foundation → core features → frontend → polish
- WebSocket integration is critical for real-time features (radar, chat, notifications)
- Encryption is implemented client-side to ensure true end-to-end security
- Geospatial queries require proper indexing for performance at scale
