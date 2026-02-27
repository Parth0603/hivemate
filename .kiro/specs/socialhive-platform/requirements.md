# Requirements Document

## Introduction

SocialHive is a geo-powered professional networking ecosystem that merges local connection discovery with professional collaboration, privacy controls, and encrypted peer-to-peer communication. While it uses discovery mechanics similar to dating apps (radar interface, mutual requests), it is fundamentally a professional networking platform focused on career connections, skill-based matching, and team collaboration. The platform enables users to discover nearby professionals, build meaningful work relationships, and collaborate on projects through a radar-based interface with intelligent visibility controls.

## Glossary

- **System**: The SocialHive web platform
- **User**: Any registered person using the platform
- **Profile**: A user's identity containing personal and professional information
- **Radar**: The geo-location based visual interface showing nearby users as dots
- **Explore_Mode**: A visibility state where the user is discoverable on the radar
- **Vanish_Mode**: A privacy state where the user is invisible on the radar
- **Mutual_Request**: A bidirectional connection acceptance between two users
- **Gig**: A professional opportunity (hackathon, project, startup idea, or job)
- **Friend**: A user with whom mutual request acceptance has occurred
- **AI_SEO**: Artificial intelligence system that optimizes profile keywords for discoverability
- **Encrypted_Chat**: End-to-end encrypted peer-to-peer messaging system
- **Subscription**: Paid tier that unlocks video calling features

## Requirements

### Requirement 1: User Authentication and Profile Creation

**User Story:** As a new user, I want to create a profile with my personal and professional information, so that I can be discovered by others and establish my identity on the platform.

#### Acceptance Criteria

1. WHEN a user visits the landing page, THE System SHALL display a radar interface, about section, and start button
2. WHEN a user clicks the start button without a profile, THE System SHALL redirect them to the profile creation page
3. WHEN creating a profile, THE System SHALL require name, age, place, skills, profession, and photo
4. WHEN a profile is created, THE System SHALL accept optional fields including college/company, verification status, website URL, and achievements
5. THE System SHALL limit photo uploads to a maximum of 5 recent photos per profile
6. WHEN a profile is completed, THE System SHALL redirect the user to the homepage
7. THE System SHALL store all profile data securely in the database

### Requirement 2: AI-Powered Profile Optimization

**User Story:** As a user, I want my profile to be optimized for discoverability, so that relevant people can find me based on my skills and interests.

#### Acceptance Criteria

1. WHEN a user completes their profile, THE AI_SEO SHALL analyze the profile content
2. THE AI_SEO SHALL optimize profile keywords for search discoverability
3. THE AI_SEO SHALL improve ranking in niche filters based on skills and profession
4. WHEN users search or filter, THE System SHALL use AI-optimized keywords to rank results

### Requirement 3: Visibility Control System

**User Story:** As a user, I want to control when I am visible to others, so that I can maintain privacy and manage my online presence.

#### Acceptance Criteria

1. THE System SHALL provide a global toggle between Explore_Mode and Vanish_Mode
2. WHEN Explore_Mode is enabled, THE System SHALL make the user's profile appear on the radar
3. WHEN Explore_Mode is enabled, THE System SHALL broadcast the user's location to nearby users
4. WHEN Explore_Mode is enabled, THE System SHALL allow the user to send and receive connection requests
5. WHEN Vanish_Mode is enabled, THE System SHALL make the user invisible on the radar
6. WHEN Vanish_Mode is enabled, THE System SHALL stop broadcasting the user's location
7. WHEN Vanish_Mode is enabled, THE System SHALL prevent new discovery while maintaining existing friend chats
8. WHEN a user enables Explore_Mode, THE System SHALL notify nearby users of their presence

### Requirement 4: Radar-Based Discovery Interface

**User Story:** As a professional, I want to see nearby professionals on a visual radar interface, so that I can discover and connect with potential collaborators, mentors, or team members in my area.

#### Acceptance Criteria

1. THE System SHALL display a radar interface with dot-based representation of nearby users
2. THE System SHALL represent male users as blue dots and female users as pink dots
3. THE System SHALL provide an adjustable distance range filter for the radar
4. THE System SHALL update the radar in real-time as users move or change visibility
5. WHEN a user has Explore_Mode disabled, THE System SHALL not display any dots on their radar
6. WHEN a user taps a dot on the radar, THE System SHALL display a profile preview
7. THE System SHALL show only the bio in the profile preview before mutual acceptance
8. WHEN viewing a profile preview, THE System SHALL provide an option to send a connection request
9. THE System SHALL display a chat icon that is disabled until mutual acceptance occurs

### Requirement 5: Connection Request System

**User Story:** As a professional, I want to send and receive connection requests, so that I can build my professional network with mutual consent and establish meaningful work relationships.

#### Acceptance Criteria

1. WHEN a user views another user's profile preview, THE System SHALL provide a send request button
2. WHEN a connection request is sent, THE System SHALL notify the recipient
3. WHEN a user receives a connection request, THE System SHALL allow them to accept or decline
4. WHEN both users accept each other's requests, THE System SHALL establish a Mutual_Request connection
5. WHEN a Mutual_Request is established, THE System SHALL unlock the full profile view including all photos
6. WHEN a Mutual_Request is established, THE System SHALL enable the chat feature between the users
7. THE System SHALL add mutually connected users to each user's Friend list

### Requirement 6: Friend Management System

**User Story:** As a user, I want to manage my connections, so that I can maintain my network and control who can interact with me.

#### Acceptance Criteria

1. THE System SHALL display a Friend_List showing all mutually accepted connections
2. WHEN viewing the Friend_List, THE System SHALL provide options to remove friend, block, or message each friend
3. WHEN a user removes a friend, THE System SHALL revoke access to full profile and photos
4. WHEN a user blocks another user, THE System SHALL prevent all future interactions and hide both users from each other
5. THE System SHALL maintain the Friend_List accessible from the hamburger menu

### Requirement 7: Encrypted Communication System

**User Story:** As a user, I want to communicate securely with my connections, so that my conversations remain private.

#### Acceptance Criteria

1. WHEN a Mutual_Request is established, THE System SHALL enable encrypted peer-to-peer chat
2. THE Encrypted_Chat SHALL use end-to-end encryption protocol
3. THE Encrypted_Chat SHALL implement secure key exchange between users
4. THE System SHALL ensure no third-party can access message content
5. WHEN users exchange messages, THE System SHALL encrypt all message data before transmission
6. THE System SHALL support both personal chat and group chat types

### Requirement 8: Progressive Communication Unlocking

**User Story:** As a user, I want communication features to unlock progressively, so that trust is built gradually through interactions.

#### Acceptance Criteria

1. WHEN a first Mutual_Request is accepted, THE System SHALL unlock text chat between users
2. WHEN a second mutual interaction occurs between users, THE System SHALL unlock voice call capability
3. WHEN either user has an active Subscription, THE System SHALL unlock video call capability for both users
4. THE System SHALL disable communication features that have not been unlocked yet
5. THE System SHALL display locked features with clear indicators of unlock requirements

### Requirement 9: Professional Gig System

**User Story:** As a user, I want to create and discover professional opportunities, so that I can collaborate on projects and find team members.

#### Acceptance Criteria

1. THE System SHALL allow users to create gigs from their profile
2. WHEN creating a gig, THE System SHALL require title, description, skills required, type, and payment status
3. THE System SHALL support gig types: hackathon, project, startup idea, and job
4. THE System SHALL support payment status options: paid and unpaid
5. WHEN a gig is created, THE System SHALL make it discoverable in the Find a Team Mate mode
6. THE System SHALL provide a chat option for each gig
7. WHEN users apply to a gig, THE System SHALL enable group chat for collaboration

### Requirement 10: Dual Mode Homepage

**User Story:** As a user, I want to switch between discovering individual professionals and browsing professional opportunities, so that I can use the platform for networking and collaboration purposes.

#### Acceptance Criteria

1. WHEN a user accesses the homepage, THE System SHALL display a toggle switch with options "Find a Partner" and "Find a Team Mate"
2. THE System SHALL default to "Find a Partner" mode on first access
3. WHEN the toggle is switched to "Find a Partner", THE System SHALL display the radar interface
4. WHEN the toggle is switched to "Find a Team Mate", THE System SHALL display the gig listing feed
5. THE System SHALL update the page layout dynamically without page reload when toggling modes

### Requirement 11: Gig Discovery and Filtering

**User Story:** As a user, I want to browse and filter professional opportunities, so that I can find relevant gigs matching my interests.

#### Acceptance Criteria

1. WHEN in "Find a Team Mate" mode, THE System SHALL display a feed of all available gigs
2. THE System SHALL provide filter options: All, Jobs, Startup, Projects, Hackathon
3. WHEN a filter is selected, THE System SHALL display only gigs matching that type
4. WHEN viewing a gig, THE System SHALL display title, description, skills required, type, payment status, and chat option
5. THE System SHALL allow users to apply to gigs through the interface

### Requirement 12: Advanced Search and Filtering

**User Story:** As a user, I want to filter users and gigs by specific criteria, so that I can find exactly what I'm looking for.

#### Acceptance Criteria

1. THE System SHALL provide filtering options for niche, skills, profession, distance range, and gig type
2. WHEN filters are applied to the radar, THE System SHALL display only users matching the criteria
3. WHEN filters are applied to gigs, THE System SHALL display only gigs matching the criteria
4. THE System SHALL use AI_SEO optimized keywords to improve filter result ranking
5. THE System SHALL allow multiple filters to be applied simultaneously

### Requirement 13: Notification System

**User Story:** As a user, I want to receive notifications for important events, so that I stay informed about platform activity.

#### Acceptance Criteria

1. WHEN a user with Explore_Mode enabled comes nearby, THE System SHALL notify other nearby users
2. WHEN a user receives a friend request, THE System SHALL send a notification
3. WHEN a user receives a gig application, THE System SHALL send a notification
4. WHEN a user receives a message, THE System SHALL send a notification
5. WHEN a user receives a call request, THE System SHALL send a notification
6. THE System SHALL display notifications in real-time without requiring page refresh

### Requirement 14: Navigation and Menu System

**User Story:** As a user, I want easy access to key features and settings, so that I can navigate the platform efficiently.

#### Acceptance Criteria

1. THE System SHALL display a top navigation bar with app name and hamburger menu
2. WHEN the hamburger menu is opened, THE System SHALL display options: Profile, Friend List, About Us, and Logout
3. WHEN Profile is selected, THE System SHALL navigate to the user's profile page
4. WHEN Friend List is selected, THE System SHALL display the user's Friend_List
5. WHEN About Us is selected, THE System SHALL display information about the platform
6. WHEN Logout is selected, THE System SHALL log the user out and redirect to the landing page

### Requirement 15: Subscription and Monetization

**User Story:** As a user, I want to access premium features through subscription, so that I can unlock advanced communication capabilities.

#### Acceptance Criteria

1. THE System SHALL offer a paid Subscription tier
2. WHEN a user subscribes, THE System SHALL unlock video call capability for their conversations
3. WHEN either participant in a conversation has a Subscription, THE System SHALL enable video calls for both users
4. THE System SHALL process subscription payments securely
5. THE System SHALL maintain subscription status and renewal information

### Requirement 16: Landing Page for Unauthenticated Users

**User Story:** As a visitor, I want to understand the platform before signing up, so that I can make an informed decision about joining this professional networking community.

#### Acceptance Criteria

1. WHEN an unauthenticated user visits the site, THE System SHALL display the landing page
2. THE System SHALL display a radar interface on the landing page (non-interactive)
3. THE System SHALL display an "About the app" section explaining the professional networking focus
4. THE System SHALL display a "Start" button for registration
5. WHEN a user clicks on radar dots without a profile, THE System SHALL prevent interaction and prompt for registration
6. WHEN the Start button is clicked, THE System SHALL redirect to the profile creation page

### Requirement 17: Real-Time Geo-Location Processing

**User Story:** As a user, I want the radar to reflect real-time location data, so that I can discover users who are actually nearby right now.

#### Acceptance Criteria

1. WHEN Explore_Mode is enabled, THE System SHALL continuously track the user's geo-location
2. THE System SHALL update the user's location on the radar in real-time
3. THE System SHALL calculate distances between users based on current coordinates
4. WHEN a user adjusts the distance range, THE System SHALL recalculate and update visible dots
5. THE System SHALL use WebSocket connections for real-time radar updates
6. THE System SHALL handle location permission requests from the browser

### Requirement 18: Profile Privacy and Visibility Rules

**User Story:** As a user, I want my full profile and photos to be private until mutual connection, so that I maintain control over my personal information.

#### Acceptance Criteria

1. THE System SHALL display only the bio publicly in profile previews
2. THE System SHALL hide all photos until Mutual_Request is established
3. WHEN a Mutual_Request is established, THE System SHALL reveal all profile details to both users
4. WHEN a Mutual_Request is established, THE System SHALL make all uploaded photos visible to both users
5. THE System SHALL maintain privacy rules even if users change their profile information

### Requirement 19: Data Security and Encryption

**User Story:** As a user, I want my data to be secure, so that my personal information and communications are protected.

#### Acceptance Criteria

1. THE System SHALL encrypt all user passwords before storage
2. THE System SHALL use HTTPS for all data transmission
3. THE System SHALL implement secure authentication token management
4. THE System SHALL encrypt message content end-to-end before transmission
5. THE System SHALL securely store encryption keys for each user
6. THE System SHALL comply with data protection regulations for user information storage
