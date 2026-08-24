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
export type GuestTitle  = 'MR' | 'MRS' | 'MR_AND_MRS' | 'MS' | 'DR' | 'FAMILY' | 'MASTER' | 'BRIG' | 'BRIG_AND_MRS' | 'MAJ';
export type MusicType   = 'SPOTIFY' | 'UPLOAD';

// ─── Admin ──────────────────────────────────────────────────────────────────
/**
 * Which invitation card template an admin account renders.
 * WEDDING is the original (bride-first) card; HOME_COMING is the groom's-side
 * card, which flips the couple order and the "daughter & son" wording.
 */
export type CeremonyType = 'WEDDING' | 'HOME_COMING';

export const CEREMONY_TYPE_LABELS: Record<CeremonyType, string> = {
  WEDDING: 'Wedding',
  HOME_COMING: 'Home-coming',
};

export interface Admin {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  status: AdminStatus;
  ceremonyType: CeremonyType;
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

export interface RsvpContact {
  id: string;
  name: string;
  phone: string;
}

export interface WeddingDetails {
  id: string;
  adminId: string;
  // Set on the parent Admin account by the superadmin, joined in here by
  // GET /admin/wedding — drives the wedding/homecoming preview wording below.
  ceremonyType?: CeremonyType;
  brideName: string;
  groomName: string;
  weddingDate: string;
  weddingSlug: string;
  loveStory?: string | null;
  coverPhotoUrl?: string | null;
  heroPhotoUrl?: string | null;
  /**
   * 1200x630 og:image shown when a guest's invite link is shared on
   * WhatsApp / Facebook / Viber. Normalised in the browser before upload.
   */
  sharePreviewUrl?: string | null;
  galleryUrls: string[];
  venueName?: string | null;
  venueAddress?: string | null;
  venueMapsUrl?: string | null;
  bridePhone?: string | null;
  groomPhone?: string | null;
  brideFatherName?: string | null;
  brideFatherPhone?: string | null;
  groomFatherName?: string | null;
  groomFatherPhone?: string | null;
  rsvpContacts: RsvpContact[];
  timeline: TimelineEvent[];
  musicUrl?: string | null;
  musicType?: MusicType | null;
  // ── Theme ──────────────────────────────────────────────────────────────
  // null / absent means "inherit from themePreset", and an unset preset means
  // Classic Gold. See src/lib/theme.ts for how these resolve.
  themePreset?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  bgColor?: string | null;
  surfaceColor?: string | null;
  cardColor?: string | null;
  textColor?: string | null;
  mutedColor?: string | null;
  /** Heading font family. */
  fontFamily?: string | null;
  bodyFont?: string | null;
  pdfLogoUrl?: string | null;
  pdfFont?: string | null;
  pdfWeddingDay?: string | null;
  pdfStartTime?: string | null;
  pdfEndTime?: string | null;
  pdfCeremonyName?: string | null;
  pdfCeremonyTime?: string | null;
  rsvpDeadline?: string | null;
  isPublished: boolean;
  _count?: { guests: number };
}

// ─── Guest ───────────────────────────────────────────────────────────────────
export interface Guest {
  id: string;
  weddingId: string;
  title: GuestTitle;
  isFamily: boolean;
  firstName: string;
  lastName: string;
  phone?: string | null;
  maxAttendants: number;
  token: string;
  sent: boolean;
  rsvpStatus: RsvpStatus;
  attendingCount?: number | null;
  dietaryNotes?: string | null;
  notes?: string | null;
  rsvpSubmittedAt?: string | null;
  firstRsvpContactId?: string | null;
  secondRsvpContactId?: string | null;
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
