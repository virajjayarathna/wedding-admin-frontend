'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Globe, EyeOff, Upload, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import type { WeddingDetails } from '@/lib/types';

type Tab = 'basics' | 'media' | 'venue' | 'timeline' | 'style';

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
    (tabParam && ['basics', 'media', 'venue', 'timeline', 'style'].includes(tabParam)) ? tabParam : 'basics'
  );

  const setTab = (newTab: Tab) => {
    setTabState(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && ['basics', 'media', 'venue', 'timeline', 'style'].includes(tabParam) && tabParam !== tab) {
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
    bridePhone: '', groomPhone: '', musicUrl: '', musicType: 'SPOTIFY' as 'SPOTIFY' | 'UPLOAD',
    primaryColor: '#c9a84c', accentColor: '#f0d080', fontFamily: 'Inter',
  });
  // Local object URLs for image preview (avoids depending on S3 public access)
  const [localPreviews, setLocalPreviews] = useState<{ cover?: string; hero?: string }>({});
  // Track which previews failed to load (404 or CORS error) so we can fall back to upload zone
  const [brokenPreviews, setBrokenPreviews] = useState<{ cover?: boolean; hero?: boolean }>({});

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
            groomPhone: w.groomPhone || '', musicUrl: w.musicUrl || '',
            musicType: w.musicType || 'SPOTIFY',
            primaryColor: w.primaryColor || '#c9a84c',
            accentColor: w.accentColor || '#f0d080', fontFamily: w.fontFamily || 'Inter',
          });
          // Pre-populate previews with existing S3 URLs so prior uploads show as thumbnails
          setLocalPreviews({
            cover: w.coverPhotoUrl || undefined,
            hero: w.heroPhotoUrl || undefined,
          });
        }
      })
      .catch(() => {}) // 404 = no wedding yet, fine
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        weddingDate: form.weddingDate ? new Date(form.weddingDate).toISOString() : undefined,
        musicUrl: form.musicUrl || undefined,
        venueMapsUrl: form.venueMapsUrl || undefined,
        loveStory: form.loveStory || undefined,
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

  async function handlePhotoUpload(purpose: 'cover' | 'hero', file: File) {
    if (!file) return;
    // Show local preview immediately — doesn't depend on S3 public access
    const localUrl = URL.createObjectURL(file);
    setLocalPreviews(p => ({ ...p, [purpose]: localUrl }));
    // Clear any prior broken-preview flag — blob URLs always load fine
    setBrokenPreviews(b => ({ ...b, [purpose]: false }));

    const toastId = toast.loading(`Uploading ${purpose} photo… 0%`);
    try {
      // Send file to backend — backend handles S3 upload server-side (avoids CORS)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      const { data } = await api.post('/admin/wedding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Upload to S3 via backend can take a while for large images — override global 15s timeout
        timeout: 120_000,
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          toast.loading(`Uploading ${purpose} photo… ${pct}%`, { id: toastId });
        },
      });
      const { publicUrl } = data.data;
      // Update wedding state with the S3 URL (used when page reloads from DB)
      const field = purpose === 'cover' ? 'coverPhotoUrl' : 'heroPhotoUrl';
      setWedding(w => w ? { ...w, [field]: publicUrl } : w);
      // Keep the blob URL in localPreviews — it's already showing and always loads.
      // Switching to the proxy URL here would trigger onError in dev (CORS) and hide the preview.
      toast.success('Photo uploaded!', { id: toastId });
    } catch (e) {
      // Revert local preview on error
      setLocalPreviews(p => ({ ...p, [purpose]: undefined }));
      toast.error(getErrorMessage(e), { id: toastId });
    }
  }

  function clearPhoto(purpose: 'cover' | 'hero') {
    setLocalPreviews(p => ({ ...p, [purpose]: undefined }));
    const field = purpose === 'cover' ? 'coverPhotoUrl' : 'heroPhotoUrl';
    setWedding(w => w ? { ...w, [field]: null } : w);
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;

  const guestBaseUrl = process.env.NEXT_PUBLIC_GUEST_BASE_URL || 'http://localhost:3001';

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Wedding Editor</h1>
          <p className="page-subtitle">Customize your wedding invitation page</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {wedding && (
            <a href={`${guestBaseUrl}/invite`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Preview →</a>
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
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          🔗 Invitation link: <code style={{ color: 'var(--color-accent)', marginLeft: '6px', fontWeight: 500 }}>{guestBaseUrl}/invite/{wedding.weddingSlug}</code>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: '24px' }}>
        {([['basics', 'Basics'], ['media', 'Photos'], ['venue', 'Venue'], ['timeline', 'Timeline'], ['style', 'Style']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
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

            <div className="card">
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Background Music</h2>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {(['SPOTIFY', 'UPLOAD'] as const).map(t => (
                  <button key={t} type="button" className={`btn btn-sm ${form.musicType === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set('musicType', t)}>{t}</button>
                ))}
              </div>
              <input className="input" value={form.musicUrl} onChange={e => set('musicUrl', e.target.value)} placeholder={form.musicType === 'SPOTIFY' ? 'https://open.spotify.com/track/…' : 'https://s3-wedding-app.s3.us-east-1.amazonaws.com/…'} />
            </div>
          </div>
        )}

        {/* VENUE TAB */}
        {tab === 'venue' && (
          <div className="card" style={{ display: 'grid', gap: '16px' }}>
            <div><label className="input-label">Venue Name</label><input className="input" value={form.venueName} onChange={e => set('venueName', e.target.value)} placeholder="The Grand Ballroom" /></div>
            <div><label className="input-label">Venue Address</label><textarea className="input" rows={3} value={form.venueAddress} onChange={e => set('venueAddress', e.target.value)} placeholder="123 Main Street, Colombo 03, Sri Lanka" style={{ resize: 'vertical' }} /></div>
            <div><label className="input-label">Google Maps Link</label><input className="input" type="url" value={form.venueMapsUrl} onChange={e => set('venueMapsUrl', e.target.value)} placeholder="https://maps.google.com/…" /></div>
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
