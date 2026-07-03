
export enum ViewMode {
  MAP = 'MAP',
  PHONE = 'PHONE',
  CALENDAR = 'CALENDAR'
}

export enum SessionMode {
  USER = 'USER',
  RECEPTIONIST = 'RECEPTIONIST'
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Profile {
  _id?: string;
  userId: string;
  name: string;
  relation: string; // 'Me', 'Father', 'Mother', etc.
  age?: number | null;
  gender?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: string;
  notes?: string;
  metadata?: Record<string, any>; // flexible JSON object for category details
  createdAt?: string;
}

export interface UserPreferences {
  userId: string;
  preferredHospitals: string[];
  preferredDoctors: string[];
  preferredSalons: string[];
  preferredStylists: string[];
  preferredAppointmentTimes: string[];
  preferredLanguage: string;
  dislikedBusinesses: string[];
}

export interface Place {
  id: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  location?: {
    lat: number;
    lng: number;
  };
  phoneNumber?: string;
  category?: string;
}

export interface BookingDetails {
  _id?: string;
  userId?: string;
  profileId?: string;
  placeId: string;
  placeName: string;
  service: string;
  date: string;
  time: string;
  guests?: string;
  email?: string;
  status: 'draft' | 'pending' | 'confirmed' | 'failed' | 'negotiating';
  businessCategory?: string;
  categoryDetails?: Record<string, any>; // flexible category-specific booking details
  receptionistOutcome?: Record<string, any>; // rich outcome details
}

export interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  date: Date;
  serviceType: string;
}

export interface Feedback {
  _id?: string;
  bookingId: string;
  rating: number; // 1 to 5
  comments?: string;
  wouldVisitAgain?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
}
