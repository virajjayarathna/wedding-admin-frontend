'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Trash2, MessageCircle, RefreshCw, Download, Upload, X, Copy, Check, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@/lib/api';
import type { Guest, GuestTitle, RsvpContact, RsvpStatus, WhatsAppLinkData } from '@/lib/types';

const TITLES: GuestTitle[] = ['MR', 'MRS', 'MR_AND_MRS', 'MS', 'DR', 'MASTER', 'BRIG', 'BRIG_AND_MRS', 'MAJ'];
const TITLE_LABELS: Record<string, string> = { MR:'Mr.', MRS:'Mrs.', MR_AND_MRS:'Mr. & Mrs.', MS:'Ms.', DR:'Dr.', FAMILY:'Family', MASTER:'Master', BRIG:'Brig.', BRIG_AND_MRS:'Brig. and Mrs.', MAJ:'Maj.' };
const RSVP_FILTERS = ['ALL', 'PENDING', 'ATTENDING', 'DECLINING', 'MAYBE'] as const;

/**
 * Copy text to the clipboard, falling back to a hidden textarea + execCommand.
 * `navigator.clipboard` is only available in a secure context, so the modern
 * path silently disappears whenever the admin panel is reached over plain
 * http:// on a LAN address — which is exactly how it gets used before a domain
 * is set up. Returns false only if both paths fail, so the caller can tell the
 * user to select the text manually instead of showing a false success toast.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or unavailable — fall through to the legacy path.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function RsvpBadge({ status }: { status: RsvpStatus }) {
  const cls = { ATTENDING:'badge-attending', DECLINING:'badge-declining', PENDING:'badge-pending-rsvp', MAYBE:'badge-maybe' };
  return <span className={`badge ${cls[status]}`}>{status}</span>;
}

interface AddGuestModalProps { onClose: () => void; onSaved: () => void; rsvpContacts: RsvpContact[]; }
function AddGuestModal({ onClose, onSaved, rsvpContacts }: AddGuestModalProps) {
  const [form, setForm] = useState({ title: 'MR' as GuestTitle, isFamily: false, firstName: '', lastName: '', phone: '', maxAttendants: 1, firstRsvpContactId: '', secondRsvpContactId: '' });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/guests', {
        ...form,
        firstRsvpContactId: form.firstRsvpContactId || undefined,
        secondRsvpContactId: form.secondRsvpContactId || undefined,
      });
      toast.success('Guest added!');
      onSaved();
      onClose();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Add Guest</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="input-label">Title</label>
            <select className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value as GuestTitle }))}>
              {TITLES.map(t => <option key={t} value={t}>{TITLE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isFamily} onChange={e => setForm(f => ({ ...f, isFamily: e.target.checked }))} />
              Invite as family (adds &quot;and Family&quot; to the guest&apos;s name)
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="input-label">First Name *</label><input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
            <div><label className="input-label">Last Name *</label><input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
          </div>
          <div>
            <label className="input-label">Phone (for WhatsApp)</label>
            <input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+94771234567" style={{ marginBottom: '12px' }} />

            {rsvpContacts.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                No RSVP contacts configured yet. Add them under Wedding Editor → Venue &amp; RSVP to assign one here.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">First RSVP Contact</label>
                  <select className="input" value={form.firstRsvpContactId} onChange={e => setForm(f => ({ ...f, firstRsvpContactId: e.target.value }))}>
                    <option value="">None</option>
                    {rsvpContacts.filter(c => c.id !== form.secondRsvpContactId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Second RSVP Contact</label>
                  <select className="input" value={form.secondRsvpContactId} onChange={e => setForm(f => ({ ...f, secondRsvpContactId: e.target.value }))}>
                    <option value="">None</option>
                    {rsvpContacts.filter(c => c.id !== form.firstRsvpContactId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="input-label">Max Attendants</label>
            <input className="input" type="number" min={1} max={20} value={form.maxAttendants} onChange={e => setForm(f => ({ ...f, maxAttendants: parseInt(e.target.value) }))} style={{ maxWidth: '100px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add Guest'}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditGuestModalProps { guest: Guest; onClose: () => void; onSaved: () => void; rsvpContacts: RsvpContact[]; }
function EditGuestModal({ guest, onClose, onSaved, rsvpContacts }: EditGuestModalProps) {
  const [form, setForm] = useState({
    title: guest.title,
    isFamily: guest.isFamily,
    firstName: guest.firstName,
    lastName: guest.lastName,
    phone: guest.phone || '',
    maxAttendants: guest.maxAttendants,
    firstRsvpContactId: guest.firstRsvpContactId || '',
    secondRsvpContactId: guest.secondRsvpContactId || '',
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/admin/guests/${guest.id}`, {
        ...form,
        firstRsvpContactId: form.firstRsvpContactId || undefined,
        secondRsvpContactId: form.secondRsvpContactId || undefined,
      });
      toast.success('Guest updated!');
      onSaved();
      onClose();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Edit Guest</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="input-label">Title</label>
            <select className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value as GuestTitle }))}>
              {TITLES.map(t => <option key={t} value={t}>{TITLE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isFamily} onChange={e => setForm(f => ({ ...f, isFamily: e.target.checked }))} />
              Invite as family (adds &quot;and Family&quot; to the guest&apos;s name)
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label className="input-label">First Name *</label><input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
            <div><label className="input-label">Last Name *</label><input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
          </div>
          <div>
            <label className="input-label">Phone (for WhatsApp)</label>
            <input className="input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+94771234567" style={{ marginBottom: '12px' }} />

            {rsvpContacts.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                No RSVP contacts configured yet. Add them under Wedding Editor → Venue &amp; RSVP to assign one here.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">First RSVP Contact</label>
                  <select className="input" value={form.firstRsvpContactId} onChange={e => setForm(f => ({ ...f, firstRsvpContactId: e.target.value }))}>
                    <option value="">None</option>
                    {rsvpContacts.filter(c => c.id !== form.secondRsvpContactId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Second RSVP Contact</label>
                  <select className="input" value={form.secondRsvpContactId} onChange={e => setForm(f => ({ ...f, secondRsvpContactId: e.target.value }))}>
                    <option value="">None</option>
                    {rsvpContacts.filter(c => c.id !== form.firstRsvpContactId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="input-label">Max Attendants</label>
            <input className="input" type="number" min={1} max={20} value={form.maxAttendants} onChange={e => setForm(f => ({ ...f, maxAttendants: parseInt(e.target.value) }))} style={{ maxWidth: '100px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface WhatsAppModalProps { data: WhatsAppLinkData; onClose: () => void; }
function WhatsAppModal({ data, onClose }: WhatsAppModalProps) {
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  async function handleCopyMessage() {
    const ok = await copyToClipboard(data.message);
    if (!ok) {
      toast.error('Clipboard blocked by the browser — select the message above and copy it manually.');
      return;
    }
    setCopied(true);
    toast.success('Message copied — paste it into the WhatsApp chat');
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Send Invitation</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '12px' }}>Invite link for <strong>{data.guestName}</strong>:</p>
        <div style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '8px', fontSize: '13px', wordBreak: 'break-all', color: 'var(--color-accent)', marginBottom: '16px' }}>{data.inviteUrl}</div>
        <div style={{ padding: '12px 14px', background: 'var(--color-surface-2)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', maxHeight: '200px', overflow: 'auto', marginBottom: '10px' }}>{data.message}</div>
        <p style={{ margin: '0 0 16px', fontSize: '11.5px', lineHeight: 1.55, color: 'var(--color-text-muted)' }}>
          Copy this and paste it into the guest&apos;s WhatsApp chat. The preview card — photo,
          couple names and date — is built by WhatsApp from the link itself, so it appears above
          the message on its own once you paste. Give it a second to load before you hit send.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleCopyMessage}>
            {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy Message</>}
          </button>
          {data.whatsappUrl && (
            <a href={data.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <MessageCircle size={16} /> Open WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const searchParams = useSearchParams();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<string>('ALL');
  const [showAdd, setShowAdd] = useState(searchParams.get('action') === 'add');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [whatsApp, setWhatsApp] = useState<WhatsAppLinkData | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [rsvpContacts, setRsvpContacts] = useState<RsvpContact[]>([]);

  useEffect(() => {
    api.get('/admin/wedding')
      .then(r => setRsvpContacts(Array.isArray(r.data.data?.rsvpContacts) ? r.data.data.rsvpContacts : []))
      .catch(() => {});
  }, []);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (rsvpFilter !== 'ALL') params.set('rsvpStatus', rsvpFilter);
      const { data } = await api.get(`/admin/guests?${params}`);
      setGuests(data.data);
      setTotal(data.total);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [search, rsvpFilter]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/guests/${id}`);
      toast.success('Guest removed');
      fetchGuests();
    } catch (e) { toast.error(getErrorMessage(e)); }
  }

  async function handleToggleSent(id: string, sent: boolean) {
    setGuests(list => list.map(g => g.id === id ? { ...g, sent } : g));
    try {
      await api.patch(`/admin/guests/${id}`, { sent });
    } catch (e) {
      setGuests(list => list.map(g => g.id === id ? { ...g, sent: !sent } : g));
      toast.error(getErrorMessage(e));
    }
  }

  async function handleWhatsApp(id: string) {
    try {
      const { data } = await api.get(`/admin/guests/${id}/whatsapp-link`);
      setWhatsApp(data.data);
    } catch (e) { toast.error(getErrorMessage(e)); }
  }

  async function handleRegenerateToken(id: string) {
    if (!confirm('Regenerate invite link? The old link will stop working.')) return;
    try {
      await api.post(`/admin/guests/${id}/regenerate-token`);
      toast.success('Invite link regenerated');
      fetchGuests();
    } catch (e) { toast.error(getErrorMessage(e)); }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    try {
      const text = await file.text();
      const { data } = await api.post('/admin/guests/bulk', { csv: text });
      toast.success(`Imported ${data.data.created} guests!`);
      fetchGuests();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setCsvLoading(false); e.target.value = ''; }
  }

  async function handleTemplateDownload() {
    try {
      const res = await api.get('/admin/guests/csv-template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'guest-import-template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(getErrorMessage(e)); }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Guests & RSVP</h1>
          <p className="page-subtitle">{total} total guests</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleTemplateDownload} title="Download CSV template"><Download size={15} /> Template</button>
          <label className={`btn btn-secondary btn-sm ${csvLoading ? 'opacity-50' : ''}`} style={{ cursor: 'pointer' }}>
            <Upload size={15} /> {csvLoading ? 'Importing…' : 'Import CSV'}
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} disabled={csvLoading} />
          </label>
          <button id="add-guest-btn" className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Guest</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input id="guest-search" className="input" style={{ paddingLeft: '36px' }} placeholder="Search guests…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tab-bar" style={{ flex: 'none' }}>
          {RSVP_FILTERS.map(f => (
            <button key={f} className={`tab-btn ${rsvpFilter === f ? 'active' : ''}`} onClick={() => setRsvpFilter(f)}>{f === 'ALL' ? 'All' : f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Phone</th>
              <th>Max Attendants</th>
              <th>Sent</th>
              <th>RSVP</th>
              <th>Attending Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px' }} /></td>)}</tr>
            )) : guests.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px' }}>No guests found. Click "+ Add Guest" to get started.</td></tr>
            ) : guests.map(g => (
              <tr key={g.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{TITLE_LABELS[g.title] || g.title} {g.firstName} {g.lastName}{g.isFamily ? ' and Family' : ''}</div>
                  {g.dietaryNotes && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>🍽 {g.dietaryNotes}</div>}
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{g.phone || '—'}</td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center' }}>{g.maxAttendants}</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={g.sent}
                    onChange={e => handleToggleSent(g.id, e.target.checked)}
                    title="Mark invite as sent"
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </td>
                <td><RsvpBadge status={g.rsvpStatus} /></td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center' }}>{g.rsvpStatus === 'ATTENDING' ? (g.attendingCount ?? '—') : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Edit guest" onClick={() => setEditingGuest(g)}><Pencil size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Send WhatsApp invite" onClick={() => handleWhatsApp(g.id)}><MessageCircle size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Regenerate link" onClick={() => handleRegenerateToken(g.id)}><RefreshCw size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Delete guest" style={{ color: 'var(--color-error)' }} onClick={() => handleDelete(g.id, `${g.firstName} ${g.lastName}`)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddGuestModal onClose={() => setShowAdd(false)} onSaved={fetchGuests} rsvpContacts={rsvpContacts} />}
      {editingGuest && <EditGuestModal guest={editingGuest} onClose={() => setEditingGuest(null)} onSaved={fetchGuests} rsvpContacts={rsvpContacts} />}
      {whatsApp && <WhatsAppModal data={whatsApp} onClose={() => setWhatsApp(null)} />}
    </div>
  );
}
