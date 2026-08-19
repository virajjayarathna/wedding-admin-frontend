'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Globe, EyeOff, Upload, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import type { WeddingDetails } from '@/lib/types';

type Tab = 'basics' | 'media' | 'venue_rsvp' | 'timeline' | 'style' | 'pdf';

const TAB_VALUES: Tab[] = ['basics', 'media', 'venue_rsvp', 'timeline', 'style', 'pdf'];
const MAX_RSVP_CONTACTS = 8;

interface RsvpContactForm { id: string; name: string; phone: string; }

function makeContactId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `rc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Single-image upload slots and the WeddingDetails column each one writes to. */
type ImageSlot = 'cover' | 'hero' | 'logo' | 'share';

const IMAGE_SLOT_FIELDS: Record<ImageSlot, 'coverPhotoUrl' | 'heroPhotoUrl' | 'pdfLogoUrl' | 'sharePreviewUrl'> = {
  cover: 'coverPhotoUrl',
  hero: 'heroPhotoUrl',
  logo: 'pdfLogoUrl',
  share: 'sharePreviewUrl',
};

const IMAGE_SLOT_LABELS: Record<ImageSlot, string> = {
  cover: 'cover photo',
  hero: 'hero photo',
  logo: 'logo',
  share: 'link preview image',
};

// ─── Link preview (og:image) normalisation ───────────────────────────────────
// WhatsApp, Facebook and Viber fetch the og:image themselves when a link is
// shared. They are strict in ways that are invisible until it fails: an
// unedited phone photo (4000x3000, several MB) is simply dropped and the guest
// sees a text-only card. So rather than trusting whatever the admin picks, we
// crop and re-encode it to exactly 1200x630 JPEG in the browser before upload —
// that way the stored file is always something the scrapers will accept.
const SHARE_W = 1200;
const SHARE_H = 630;
const SHARE_MAX_BYTES = 300 * 1024;

function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file couldn't be read as an image.")); };
    img.src = url;
  });
}

/**
 * Centre-crop `file` to 1200x630 and re-encode as JPEG, stepping the quality
 * down until it fits under SHARE_MAX_BYTES. Returns the original file only if
 * the browser refuses to give us a canvas at all.
 */
async function normaliseSharePreview(file: File): Promise<File> {
  const img = await loadImageFile(file);

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  // White base so transparent PNGs don't come out with black edges.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Cover-fit: fill the whole 1200x630 frame, cropping the overflowing axis.
  const scale = Math.max(SHARE_W / img.naturalWidth, SHARE_H / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  ctx.drawImage(img, (SHARE_W - drawW) / 2, (SHARE_H - drawH) / 2, drawW, drawH);

  let blob: Blob | null = null;
  for (let quality = 0.88; quality >= 0.5; quality -= 0.08) {
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size <= SHARE_MAX_BYTES) break;
  }
  if (!blob) return file;

  return new File([blob], 'link-preview.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}

const COLOR_PRESETS = [
  { primary: '#c9a84c', accent: '#f0d080', label: 'Gold' },
  { primary: '#e91e8c', accent: '#f48fb1', label: 'Rose' },
  { primary: '#7c3aed', accent: '#a78bfa', label: 'Violet' },
  { primary: '#0ea5e9', accent: '#7dd3fc', label: 'Sky' },
  { primary: '#10b981', accent: '#6ee7b7', label: 'Emerald' },
];

function WeddingEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const tabParam = searchParams.get('tab') as Tab | null;
  const [tab, setTabState] = useState<Tab>(
    (tabParam && TAB_VALUES.includes(tabParam)) ? tabParam as Tab : 'basics'
  );

  const setTab = (newTab: Tab) => {
    setTabState(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && TAB_VALUES.includes(tabParam) && tabParam !== tab) {
      setTabState(tabParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);
  const [wedding, setWedding] = useState<WeddingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    brideName: '', groomName: '', weddingDate: '', weddingSlug: '',
    loveStory: '', venueName: '', venueAddress: '', venueMapsUrl: '',
    bridePhone: '', groomPhone: '', brideFatherName: '', brideFatherPhone: '',
    groomFatherName: '', groomFatherPhone: '', musicUrl: '', musicType: 'SPOTIFY' as 'SPOTIFY' | 'UPLOAD',
    primaryColor: '#c9a84c', accentColor: '#f0d080', fontFamily: 'Inter',
    pdfFont: 'Great Vibes', pdfWeddingDay: 'Saturday', pdfStartTime: '15:00', pdfEndTime: '23:00',
    pdfCeremonyName: 'The Ceremony', pdfCeremonyTime: '16:00', rsvpDeadline: '',
  });
  // RSVP point-of-contact list (name + phone pairs, max 8) — configured in the Venue & RSVP tab
  const [rsvpContacts, setRsvpContacts] = useState<RsvpContactForm[]>([]);
  // Local object URLs for image preview (avoids depending on S3 public access)
  const [localPreviews, setLocalPreviews] = useState<Partial<Record<ImageSlot, string>>>({});
  // Track which previews failed to load (404 or CORS error) so we can fall back to upload zone
  const [brokenPreviews, setBrokenPreviews] = useState<Partial<Record<ImageSlot, boolean>>>({});

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get('/admin/wedding')
      .then(r => {
        const w: WeddingDetails = r.data.data;
        if (w) {
          setWedding(w);
          setForm({
            brideName: w.brideName, groomName: w.groomName,
            weddingDate: w.weddingDate?.substring(0, 10) || '',
            weddingSlug: w.weddingSlug, loveStory: w.loveStory || '',
            venueName: w.venueName || '', venueAddress: w.venueAddress || '',
            venueMapsUrl: w.venueMapsUrl || '', bridePhone: w.bridePhone || '',
            groomPhone: w.groomPhone || '', brideFatherName: w.brideFatherName || '', brideFatherPhone: w.brideFatherPhone || '',
            groomFatherName: w.groomFatherName || '', groomFatherPhone: w.groomFatherPhone || '', musicUrl: w.musicUrl || '',
            musicType: w.musicType || 'SPOTIFY',
            primaryColor: w.primaryColor || '#c9a84c',
            accentColor: w.accentColor || '#f0d080', fontFamily: w.fontFamily || 'Inter',
            pdfFont: w.pdfFont || 'Great Vibes', pdfWeddingDay: w.pdfWeddingDay || 'Saturday',
            pdfStartTime: w.pdfStartTime || '15:00', pdfEndTime: w.pdfEndTime || '23:00',
            pdfCeremonyName: w.pdfCeremonyName || 'The Ceremony', pdfCeremonyTime: w.pdfCeremonyTime || '16:00',
            rsvpDeadline: w.rsvpDeadline?.substring(0, 10) || '',
          });
          setRsvpContacts(Array.isArray(w.rsvpContacts) ? w.rsvpContacts : []);
          // Pre-populate previews with existing S3 URLs so prior uploads show as thumbnails
          setLocalPreviews({
            cover: w.coverPhotoUrl || undefined,
            hero: w.heroPhotoUrl || undefined,
            logo: w.pdfLogoUrl || undefined,
            share: w.sharePreviewUrl || undefined,
          });
        }
      })
      .catch(() => {}) // 404 = no wedding yet, fine
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.brideName || !form.groomName || !form.weddingDate || !form.weddingSlug) {
      setTab('basics');
      toast.error('Please complete all required fields in the Basics tab first.');
      return;
    }

    // Only persist RSVP contact rows that have both a name and a phone filled in
    const cleanRsvpContacts = rsvpContacts.filter(c => c.name.trim() && c.phone.trim());
    if (cleanRsvpContacts.length > MAX_RSVP_CONTACTS) {
      setTab('venue_rsvp');
      toast.error(`You can add up to ${MAX_RSVP_CONTACTS} RSVP contacts.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        weddingDate: form.weddingDate ? new Date(form.weddingDate).toISOString() : undefined,
        rsvpDeadline: form.rsvpDeadline ? new Date(form.rsvpDeadline).toISOString() : undefined,
        musicUrl: form.musicUrl || undefined,
        venueMapsUrl: form.venueMapsUrl || undefined,
        loveStory: form.loveStory || undefined,
        rsvpContacts: cleanRsvpContacts,
        // Sent explicitly so that removing the link preview image and hitting
        // Save actually clears the column — uploads write it server-side, but
        // a removal only lives in local state until this PUT carries the null.
        sharePreviewUrl: wedding?.sharePreviewUrl ?? null,
      };
      const { data } = await api.put('/admin/wedding', payload);
      setWedding(data.data);
      toast.success('Wedding details saved!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    if (!wedding) return;
    setPublishing(true);
    try {
      const { data } = await api.patch('/admin/wedding/publish');
      setWedding(w => w ? { ...w, isPublished: data.data.isPublished } : w);
      toast.success(data.data.isPublished ? 'Wedding page published! 🎉' : 'Wedding page unpublished');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setPublishing(false);
    }
  }

  async function handlePhotoUpload(purpose: ImageSlot, file: File) {
    if (!file) return;
    const label = IMAGE_SLOT_LABELS[purpose];

    // The link preview slot is cropped and re-encoded to 1200x630 first, so the
    // thumbnail below shows the exact frame guests will see in WhatsApp.
    let outgoing = file;
    if (purpose === 'share') {
      try {
        outgoing = await normaliseSharePreview(file);
      } catch (e) {
        toast.error(getErrorMessage(e));
        return;
      }
    }

    // Show local preview immediately — doesn't depend on S3 public access
    const localUrl = URL.createObjectURL(outgoing);
    setLocalPreviews(p => ({ ...p, [purpose]: localUrl }));
    // Clear any prior broken-preview flag — blob URLs always load fine
    setBrokenPreviews(b => ({ ...b, [purpose]: false }));

    const toastId = toast.loading(`Uploading ${label}… 0%`);
    try {
      // Send file to backend — backend handles S3 upload server-side (avoids CORS)
      const formData = new FormData();
      formData.append('file', outgoing);
      formData.append('purpose', purpose);
      const { data } = await api.post('/admin/wedding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Upload to S3 via backend can take a while for large images — override global 15s timeout
        timeout: 120_000,
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          toast.loading(`Uploading ${label}… ${pct}%`, { id: toastId });
        },
      });
      const { publicUrl } = data.data;
      // Update wedding state with the S3 URL (used when page reloads from DB)
      const field: string = IMAGE_SLOT_FIELDS[purpose];
      setWedding(w => w ? { ...w, [field]: publicUrl } : w);
      // Keep the blob URL in localPreviews — it's already showing and always loads.
      // Switching to the proxy URL here would trigger onError in dev (CORS) and hide the preview.
      toast.success(
        purpose === 'share' ? 'Link preview image updated!' : 'Photo uploaded!',
        { id: toastId }
      );
    } catch (e) {
      // Revert local preview on error
      setLocalPreviews(p => ({ ...p, [purpose]: undefined }));
      toast.error(getErrorMessage(e), { id: toastId });
    }
  }

  function clearPhoto(purpose: ImageSlot) {
    setLocalPreviews(p => ({ ...p, [purpose]: undefined }));
    setBrokenPreviews(b => ({ ...b, [purpose]: false }));
    const field: string = IMAGE_SLOT_FIELDS[purpose];
    setWedding(w => w ? { ...w, [field]: null } : w);
  }

  async function handleAudioUpload(file: File) {
    if (!file) return;
    const toastId = toast.loading('Uploading audio...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'audio');
      const { data } = await api.post('/admin/wedding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      const { publicUrl } = data.data;
      set('musicUrl', publicUrl);
      setWedding(w => w ? { ...w, musicUrl: publicUrl, musicType: 'UPLOAD' } : w);
      toast.success('Audio uploaded!', { id: toastId });
    } catch (e) {
      toast.error(getErrorMessage(e), { id: toastId });
    }
  }

  async function handleAudioDelete() {
    if (!wedding?.musicUrl) return;
    const toastId = toast.loading('Deleting audio...');
    try {
      await api.delete('/admin/wedding/music');
      set('musicUrl', '');
      set('musicType', 'SPOTIFY');
      setWedding(w => w ? { ...w, musicUrl: null, musicType: 'SPOTIFY' } : w);
      toast.success('Audio deleted!', { id: toastId });
    } catch (e) {
      toast.error(getErrorMessage(e), { id: toastId });
    }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const toastId = toast.loading(`Uploading ${files.length} photo(s)...`);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('purpose', 'gallery');
        const { data } = await api.post('/admin/wedding/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120_000,
        });
        newUrls.push(data.data.publicUrl);
      }
      setWedding(w => w ? { ...w, galleryUrls: [...(w.galleryUrls || []), ...newUrls] } : w);
      toast.success('Gallery updated!', { id: toastId });
    } catch (e) {
      toast.error(getErrorMessage(e), { id: toastId });
    }
  }

  async function handleGalleryDelete(url: string) {
    const toastId = toast.loading('Deleting photo...');
    try {
      const key = encodeURIComponent(url.split('.com/')[1] || url.substring(url.lastIndexOf('/') + 1));
      await api.delete(`/admin/wedding/gallery/${key}`);
      setWedding(w => w ? { ...w, galleryUrls: (w.galleryUrls || []).filter(u => u !== url) } : w);
      toast.success('Photo deleted!', { id: toastId });
    } catch (e) {
      toast.error(getErrorMessage(e), { id: toastId });
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;

  const guestBaseUrl = process.env.NEXT_PUBLIC_GUEST_BASE_URL || 'http://localhost:3001';

  // Mirrors the og:title / og:description the invite page emits, so the Media
  // tab can show an honest preview of the card a guest will receive.
  const previewTitle = form.brideName && form.groomName
    ? `${form.brideName} & ${form.groomName}'s Wedding`
    : 'Wedding Invitation';
  const previewDateText = form.weddingDate
    ? new Date(`${form.weddingDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';
  const previewDescription = form.brideName && form.groomName
    ? `You are cordially invited to the wedding of ${form.brideName} & ${form.groomName}${previewDateText ? ` on ${previewDateText}` : ''}. View your invitation and RSVP here.`
    : 'You are invited to celebrate our special day.';
  let previewHost = guestBaseUrl;
  try { previewHost = new URL(guestBaseUrl).host; } catch { /* keep the raw value */ }
  const sharePreviewSrc = !brokenPreviews.share ? localPreviews.share : undefined;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Wedding Editor</h1>
          <p className="page-subtitle">Customize your wedding invitation page</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {wedding && (
            <a href={`${guestBaseUrl}/invite/${wedding.weddingSlug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Preview →</a>
          )}
          {wedding && (
            <button className={`btn btn-sm ${wedding.isPublished ? 'btn-secondary' : 'btn-primary'}`} onClick={handlePublishToggle} disabled={publishing}>
              {wedding.isPublished ? <><EyeOff size={14} /> Unpublish</> : <><Globe size={14} /> Publish</>}
            </button>
          )}
          {wedding?.isPublished && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-success)' }}>
              <CheckCircle size={13} /> Live
            </span>
          )}
        </div>
      </div>

      {/* Slug Display */}
      {wedding?.weddingSlug && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
          💡 <strong>Tip:</strong> This is your <strong>preview link</strong>. To invite guests, go to the <a href="/guests" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>Guests</a> tab to generate unique RSVP links.<br />
          🔗 Preview link: <code style={{ color: 'var(--color-accent)', marginLeft: '6px', fontWeight: 500 }}>{guestBaseUrl}/invite/{wedding.weddingSlug}</code>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: '24px' }}>
        {([['basics', 'Basics'], ['media', 'Photos'], ['venue_rsvp', 'Venue & RSVP'], ['timeline', 'Timeline'], ['style', 'Style'], ['pdf', 'PDF Invite']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} type="button" className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* BASICS TAB */}
        {tab === 'basics' && (
          <div className="card" style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label className="input-label">Bride's Name *</label><input id="bride-name" className="input" value={form.brideName} onChange={e => set('brideName', e.target.value)} placeholder="Hiruni" required /></div>
              <div><label className="input-label">Groom's Name *</label><input id="groom-name" className="input" value={form.groomName} onChange={e => set('groomName', e.target.value)} placeholder="Lakshitha" required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label className="input-label">Wedding Date *</label><input id="wedding-date" type="date" className="input" value={form.weddingDate} onChange={e => set('weddingDate', e.target.value)} required /></div>
              <div>
                <label className="input-label">URL Slug *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '13px' }}>/</span>
                  <input id="wedding-slug" className="input" style={{ paddingLeft: '20px' }} value={form.weddingSlug} onChange={e => set('weddingSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="hiruni-lakshitha-2025" required pattern="[a-z0-9-]+" />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label className="input-label">Bride's Phone</label><input className="input" type="tel" value={form.bridePhone} onChange={e => set('bridePhone', e.target.value)} placeholder="+94771234567" /></div>
              <div><label className="input-label">Groom's Phone</label><input className="input" type="tel" value={form.groomPhone} onChange={e => set('groomPhone', e.target.value)} placeholder="+94771234567" /></div>
            </div>
            <div><label className="input-label">Love Story (shown on invite page)</label><textarea className="input" rows={5} value={form.loveStory} onChange={e => set('loveStory', e.target.value)} placeholder="How did you two meet? Share your story…" style={{ resize: 'vertical' }} /></div>
          </div>
        )}

        {/* PDF TAB */}
        {tab === 'pdf' && (
          <div className="card" style={{ display: 'grid', gap: '20px' }}>
            <div style={{ marginBottom: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>PDF Invitation Settings</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>Configure the appearance and details for the downloadable PDF invitation.</p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="input-label">Custom Logo (Optional)</label>
              {(localPreviews['logo'] || wedding?.pdfLogoUrl) && !brokenPreviews.logo ? (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
                  <img src={localPreviews['logo'] || wedding?.pdfLogoUrl!} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '8px', padding: '8px' }} onError={() => setBrokenPreviews(b => ({ ...b, logo: true }))} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      <Upload size={14} style={{ marginRight: '6px' }} /> Replace
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload('logo', f); }} />
                    </label>
                    <button type="button" className="btn btn-danger btn-icon" onClick={() => clearPhoto('logo')}><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <label style={{ display: 'inline-block', marginTop: '8px', cursor: 'pointer' }}>
                  <div style={{ width: '120px', height: '120px', border: '2px dashed var(--color-border-2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    <Upload size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>Upload Logo</span>
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload('logo', f); }} />
                </label>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label">Bride's Father's Name *</label>
                <input className="input" value={form.brideFatherName} onChange={e => set('brideFatherName', e.target.value)} placeholder="Shirantha Dasanayake" required />
              </div>
              <div>
                <label className="input-label">Bride's Father's Phone *</label>
                <input className="input" type="tel" value={form.brideFatherPhone} onChange={e => set('brideFatherPhone', e.target.value)} placeholder="0773460699" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label">Groom's Father's Name *</label>
                <input className="input" value={form.groomFatherName} onChange={e => set('groomFatherName', e.target.value)} placeholder="J.M Jayarathna" required />
              </div>
              <div>
                <label className="input-label">Groom's Father's Phone *</label>
                <input className="input" type="tel" value={form.groomFatherPhone} onChange={e => set('groomFatherPhone', e.target.value)} placeholder="0779831707" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label">Font Style (Names) *</label>
                <select className="input" value={form.pdfFont} onChange={e => set('pdfFont', e.target.value)} required>
                  {['Great Vibes', 'Alex Brush', 'Dancing Script', 'Pinyon Script'].map(f => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Wedding Day *</label>
                <select className="input" value={form.pdfWeddingDay} onChange={e => set('pdfWeddingDay', e.target.value)} required>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label">Ceremony Name *</label>
                <input className="input" value={form.pdfCeremonyName} onChange={e => set('pdfCeremonyName', e.target.value)} placeholder="Poruwa Ceremony" required />
              </div>
              <div>
                <label className="input-label">Ceremony Time *</label>
                <input className="input" type="time" value={form.pdfCeremonyTime} onChange={e => set('pdfCeremonyTime', e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label className="input-label">Event Start Time *</label>
                <input className="input" type="time" value={form.pdfStartTime} onChange={e => set('pdfStartTime', e.target.value)} required />
              </div>
              <div>
                <label className="input-label">Event End Time *</label>
                <input className="input" type="time" value={form.pdfEndTime} onChange={e => set('pdfEndTime', e.target.value)} required />
              </div>
              <div>
                <label className="input-label">RSVP Deadline *</label>
                <input className="input" type="date" value={form.rsvpDeadline} onChange={e => set('rsvpDeadline', e.target.value)} required />
              </div>
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {tab === 'media' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {(['cover', 'hero'] as const).map(purpose => {
              const previewSrc = localPreviews[purpose];
              const label = purpose === 'cover' ? 'Cover Photo' : 'Hero Photo';
              const hint = purpose === 'cover' ? 'Main banner image' : 'Background behind couple names';
              const aspectRatio = purpose === 'cover' ? '16 / 9' : '3 / 2';
              const dimHint = purpose === 'cover'
                ? 'Recommended: 2400 × 1350 px (16:9) — looks sharp on all screens'
                : 'Recommended: 2000 × 1330 px (3:2) — will auto-crop for mobile';
              const hasPhoto = !!previewSrc && !brokenPreviews[purpose];

              return (
                <div key={purpose} className="card" style={{ padding: '20px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{label}</h2>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>{hint}</p>
                    </div>
                    {hasPhoto && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '6px' }}>
                          <Upload size={13} /> Replace
                          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(purpose, f); }} />
                        </label>
                        <button type="button" className="btn btn-danger btn-icon" onClick={() => clearPhoto(purpose)} title="Remove">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {hasPhoto ? (
                    /* ── Full aspect-ratio preview (uploaded state) ── */
                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio }}>
                      <img
                        src={previewSrc}
                        alt={label}
                        onError={(e) => {
                          console.error('Image failed to load:', previewSrc);
                          // S3 object not found or CORS error — show upload zone instead
                          setBrokenPreviews(b => ({ ...b, [purpose]: true }));
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          display: 'block',
                        }}
                      />
                      {/* Responsive overlay hints */}
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        flexDirection: 'column', justifyContent: 'flex-end',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)',
                        padding: '14px 16px', pointerEvents: 'none',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>
                          <CheckCircle size={12} />
                          Uploaded · auto-crops for mobile via CSS
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* ── Dashed upload zone (empty state) ── */
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        aspectRatio,
                        borderRadius: '10px',
                        border: '2px dashed var(--color-border-2)',
                        background: 'var(--color-surface-2)',
                        color: 'var(--color-text-muted)',
                        transition: 'border-color 0.2s, background 0.2s',
                        gap: '10px',
                      }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          background: 'var(--color-surface)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Upload size={22} style={{ opacity: 0.5 }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 4px' }}>Click to upload {label.toLowerCase()}</p>
                          <p style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>JPG, PNG or WebP · Max 10 MB</p>
                        </div>
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(purpose, f); }} />
                    </label>
                  )}

                  {/* Dimension hint */}
                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ opacity: 0.5 }}>💡</span> {dimHint}
                  </p>
                </div>
              );
            })}

            {/* ── Link preview image (og:image for WhatsApp / Facebook) ── */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Link Preview Image</h2>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    The thumbnail WhatsApp, Facebook and Viber show when a guest receives their invitation link
                  </p>
                </div>
                {sharePreviewSrc && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '6px' }}>
                      <Upload size={13} /> Replace
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload('share', f); }} />
                    </label>
                    <button type="button" className="btn btn-danger btn-icon" onClick={() => clearPhoto('share')} title="Remove">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'start' }}>
                {/* Upload / preview */}
                <div>
                  {sharePreviewSrc ? (
                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1200 / 630', border: '1px solid var(--color-border-2)' }}>
                      <img
                        src={sharePreviewSrc}
                        alt="Link preview"
                        onError={() => setBrokenPreviews(b => ({ ...b, share: true }))}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        aspectRatio: '1200 / 630', borderRadius: '10px',
                        border: '2px dashed var(--color-border-2)', background: 'var(--color-surface-2)',
                        color: 'var(--color-text-muted)', gap: '10px',
                      }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Upload size={20} style={{ opacity: 0.5 }} />
                        </div>
                        <div style={{ textAlign: 'center', padding: '0 16px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 4px' }}>Click to upload a preview image</p>
                          <p style={{ fontSize: '11px', opacity: 0.6, margin: 0 }}>Any JPG, PNG or WebP — cropped to 1200 × 630 automatically</p>
                        </div>
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload('share', f); }} />
                    </label>
                  )}

                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: '5px' }}>
                    <span style={{ opacity: 0.5 }}>💡</span>
                    <span>
                      Best results with a wide 1200 × 630 image. Anything else is centre-cropped to that shape
                      and compressed under 300 KB — WhatsApp silently ignores previews larger than that.
                    </span>
                  </p>
                </div>

                {/* WhatsApp-style mock of the resulting card */}
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                    How guests will see it
                  </p>
                  <div style={{ background: '#0b141a', borderRadius: '12px', padding: '14px 12px' }}>
                    <div style={{ background: '#005c4b', borderRadius: '10px 10px 10px 2px', padding: '4px', maxWidth: '320px', marginLeft: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
                      <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '8px', overflow: 'hidden' }}>
                        {sharePreviewSrc ? (
                          <img src={sharePreviewSrc} alt="" style={{ width: '100%', aspectRatio: '1200 / 630', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{
                            width: '100%', aspectRatio: '1200 / 630', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textAlign: 'center', padding: '0 12px',
                          }}>
                            No image yet — guests see a text-only card
                          </div>
                        )}
                        <div style={{ padding: '8px 10px 10px' }}>
                          <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 600, color: '#e9edef', lineHeight: 1.3 }}>{previewTitle}</p>
                          <p style={{
                            margin: '3px 0 0', fontSize: '11.5px', color: 'rgba(233,237,239,0.65)', lineHeight: 1.35,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>{previewDescription}</p>
                          <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(233,237,239,0.45)' }}>{previewHost}</p>
                        </div>
                      </div>
                      <p style={{ margin: '6px 8px 4px', fontSize: '12px', color: '#e9edef', lineHeight: 1.4, wordBreak: 'break-all' }}>
                        {guestBaseUrl}/invite/…
                      </p>
                    </div>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    WhatsApp caches a preview per link. Guests who were already sent their link may keep seeing
                    the old card — regenerate that guest&apos;s token to force a fresh one.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Background Music</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {(['SPOTIFY', 'UPLOAD'] as const).map(t => (
                  <button key={t} type="button" className={`btn btn-sm ${form.musicType === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set('musicType', t)}>{t === 'SPOTIFY' ? 'Spotify URL' : 'Upload MP3'}</button>
                ))}
              </div>
              
              {form.musicType === 'SPOTIFY' ? (
                <input className="input" value={form.musicUrl} onChange={e => set('musicUrl', e.target.value)} placeholder="https://open.spotify.com/track/…" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {form.musicUrl ? (
                    <>
                      <audio src={form.musicUrl} controls style={{ height: '40px', flex: 1 }} />
                      <button type="button" className="btn btn-danger btn-icon" onClick={handleAudioDelete} title="Remove Audio">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', gap: '6px' }}>
                      <Upload size={16} /> Select MP3 File
                      <input type="file" accept="audio/mpeg,audio/ogg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioUpload(f); }} />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* GALLERY SECTION */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Love Story Gallery</h2>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>Upload photos for the flip-book gallery</p>
                </div>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '6px' }}>
                  <Upload size={13} /> Add Photos
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={e => { handleGalleryUpload(e.target.files); }} />
                </label>
              </div>

              {wedding?.galleryUrls && wedding.galleryUrls.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                  {wedding.galleryUrls.map((url, i) => (
                    <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={url} alt={`Gallery photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => handleGalleryDelete(url)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px dashed var(--color-border-2)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No gallery photos uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VENUE & RSVP TAB */}
        {tab === 'venue_rsvp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ display: 'grid', gap: '16px' }}>
              <div><label className="input-label">Venue Name</label><input className="input" value={form.venueName} onChange={e => set('venueName', e.target.value)} placeholder="The Grand Ballroom" /></div>
              <div><label className="input-label">Venue Address</label><textarea className="input" rows={3} value={form.venueAddress} onChange={e => set('venueAddress', e.target.value)} placeholder="123 Main Street, Colombo 03, Sri Lanka" style={{ resize: 'vertical' }} /></div>
              <div><label className="input-label">Google Maps Link</label><input className="input" type="url" value={form.venueMapsUrl} onChange={e => set('venueMapsUrl', e.target.value)} placeholder="https://maps.google.com/…" /></div>
            </div>

            <div className="card" style={{ display: 'grid', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>RSVP Contacts</h2>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Add the people guests can reach out to about their RSVP (up to {MAX_RSVP_CONTACTS}). On the Guests page you can assign up to two of these to each guest.
                </p>
              </div>

              {rsvpContacts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px dashed var(--color-border-2)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>No RSVP contacts added yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rsvpContacts.map((contact, idx) => (
                    <div key={contact.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        {idx === 0 && <label className="input-label">Name</label>}
                        <input
                          className="input"
                          value={contact.name}
                          onChange={e => setRsvpContacts(list => list.map(c => c.id === contact.id ? { ...c, name: e.target.value } : c))}
                          placeholder="e.g. Hiruni Dasanayake"
                        />
                      </div>
                      <div>
                        {idx === 0 && <label className="input-label">Contact Number</label>}
                        <input
                          className="input"
                          type="tel"
                          value={contact.phone}
                          onChange={e => setRsvpContacts(list => list.map(c => c.id === contact.id ? { ...c, phone: e.target.value } : c))}
                          placeholder="+94771234567"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-icon"
                        onClick={() => setRsvpContacts(list => list.filter(c => c.id !== contact.id))}
                        title="Remove contact"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={rsvpContacts.length >= MAX_RSVP_CONTACTS}
                  onClick={() => setRsvpContacts(list => list.length >= MAX_RSVP_CONTACTS ? list : [...list, { id: makeContactId(), name: '', phone: '' }])}
                >
                  + Add Contact
                </button>
                {rsvpContacts.length >= MAX_RSVP_CONTACTS && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Maximum of {MAX_RSVP_CONTACTS} reached</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE TAB — handled separately via a dedicated section */}
        {tab === 'timeline' && (
          <div className="card">
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Timeline events are managed separately. Save your current changes first, then use the Timeline section below.</p>
            <TimelineEditor weddingId={wedding?.id} />
          </div>
        )}

        {/* STYLE TAB */}
        {tab === 'style' && (
          <div className="card" style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label className="input-label">Color Theme</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                {COLOR_PRESETS.map(p => (
                  <button key={p.label} type="button" onClick={() => { set('primaryColor', p.primary); set('accentColor', p.accent); }}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${p.primary}, ${p.accent})`, border: form.primaryColor === p.primary ? '3px solid white' : '3px solid transparent', cursor: 'pointer', outline: 'none', boxShadow: form.primaryColor === p.primary ? '0 0 0 2px var(--color-accent)' : 'none' }}
                    title={p.label}
                  />
                ))}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' }}>
                  <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} title="Custom primary" />
                  <input type="color" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} title="Custom accent" />
                </div>
              </div>
            </div>
            <div>
              <label className="input-label">Font Family</label>
              <select className="input" value={form.fontFamily} onChange={e => set('fontFamily', e.target.value)} style={{ maxWidth: '300px' }}>
                {['Inter', 'Playfair Display', 'Cormorant Garamond', 'Lora', 'Montserrat', 'Cinzel'].map(f => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {tab !== 'timeline' && (
          <button id="save-wedding-btn" type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ marginTop: '20px' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </form>
    </div>
  );
}

export default function WeddingEditorPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>}>
      <WeddingEditorContent />
    </Suspense>
  );
}

// ─── Inline Timeline Editor ───────────────────────────────────────────────────
interface TimelineItem { time: string; title: string; description: string; }

function TimelineEditor({ weddingId }: { weddingId?: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!weddingId) return;
    api.get('/admin/wedding').then(r => setItems(r.data.data?.timeline || [])).catch(() => {});
  }, [weddingId]);

  function addItem() { setItems(i => [...i, { time: '', title: '', description: '' }]); }
  function removeItem(idx: number) { setItems(i => i.filter((_, j) => j !== idx)); }
  function update(idx: number, key: keyof TimelineItem, val: string) {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch('/admin/wedding/timeline', { timeline: items });
      toast.success('Timeline saved!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ padding: '14px', background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '8px' }}>
              <input className="input" placeholder="Time (e.g. 4:00 PM)" value={item.time} onChange={e => update(idx, 'time', e.target.value)} />
              <input className="input" placeholder="Event title" value={item.title} onChange={e => update(idx, 'title', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input" placeholder="Description (optional)" value={item.description} onChange={e => update(idx, 'description', e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-danger btn-icon" onClick={() => removeItem(idx)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
        <button type="button" className="btn btn-secondary" onClick={addItem}>+ Add Event</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Timeline'}</button>
      </div>
    </div>
  );
}
