// Shared TypeScript types for wedding admin frontend

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
  status?: AdminStatus;
  subscriptionEnd?: string | null;
}

export type AdminStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type RsvpStatus  = 'PENDING' | 'ATTENDING' | 'DECLINING' | 'MAYBE';
export type GuestTitle  = 'MR' | 'MRS' | 'MS' | 'DR' | 'FAMILY' | 'MASTER';
export type MusicType   = 'SPOTIFY' | 'UPLOAD';

// ─── Admin ──────────────────────────────────────────────────────────────────
export interface Admin {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  status: AdminStatus;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  createdAt: string;
  wedding?: WeddingSummary | null;
}

export interface WeddingSummary {
  id: string;
  weddingSlug: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  isPublished: boolean;
  _count?: { guests: number };
}

// ─── Wedding ─────────────────────────────────────────────────────────────────
export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  icon?: string;
}

export interface WeddingDetails {
  id: string;
  adminId: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  weddingSlug: string;
  loveStory?: string | null;
  coverPhotoUrl?: string | null;
  heroPhotoUrl?: string | null;
  galleryUrls: string[];
  venueName?: string | null;
  venueAddress?: string | null;
  venueMapsUrl?: string | null;
  bridePhone?: string | null;
  groomPhone?: string | null;
  timeline: TimelineEvent[];
  musicUrl?: string | null;
  musicType?: MusicType | null;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  isPublished: boolean;
  _count?: { guests: number };
}

// ─── Guest ───────────────────────────────────────────────────────────────────
export interface Guest {
  id: string;
  weddingId: string;
  title: GuestTitle;
  firstName: string;
  lastName: string;
  phone?: string | null;
  maxAttendants: number;
  token: string;
  rsvpStatus: RsvpStatus;
  attendingCount?: number | null;
  dietaryNotes?: string | null;
  notes?: string | null;
  rsvpSubmittedAt?: string | null;
  createdAt: string;
}

export interface RsvpSummary {
  attending: number;
  declining: number;
  pending: number;
  maybe: number;
  totalGuests: number;
  totalConfirmedHeadcount: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface SuperAdminDashboard {
  totalAdmins: number;
  activeAdmins: number;
  expiredAdmins: number;
  suspendedAdmins: number;
  totalGuests: number;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export interface WhatsAppLinkData {
  guestName: string;
  inviteUrl: string;
  whatsappUrl: string;
  message: string;
  hasPhone: boolean;
}
