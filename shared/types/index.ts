// Shared types between frontend and backend

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface Profile {
  userId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  place: string;
  skills: string[];
  profession: string;
  photos: string[];
  bio: string;
  college?: string;
  company?: string;
  verified: boolean;
  websiteUrl?: string;
  achievements?: string[];
  optimizedKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  userId: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  accuracy: number;
}

export interface RadarDot {
  userId: string;
  distance: number;
  gender: 'male' | 'female' | 'other';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface VisibilityState {
  userId: string;
  mode: 'explore' | 'vanish';
  updatedAt: Date;
}

export interface ConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  establishedAt: Date;
  communicationLevel: 'chat' | 'voice' | 'video';
  interactionCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  type: 'personal' | 'group';
  participants: string[];
  gigId?: string;
  createdAt: Date;
}

export interface Gig {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  skillsRequired: string[];
  type: 'hackathon' | 'project' | 'startup' | 'job';
  paymentStatus: 'paid' | 'unpaid';
  chatRoomId: string;
  applicants: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'nearby' | 'friend_request' | 'gig_application' | 'message' | 'call';
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  stripeSubscriptionId?: string;
}

export interface AuthToken {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
