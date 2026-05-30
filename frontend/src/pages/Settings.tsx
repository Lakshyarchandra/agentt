import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Check, Trash2 } from 'lucide-react';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

const VENDORS = [
  { key: 'groq',        label: 'Groq',        placeholder: 'gsk_...',      link: 'https://console.groq.com/keys',              free: true },
  { key: 'google',      label: 'Google Gemini', placeholder: 'AIza...',    link: 'https://aistudio.google.com/app/apikey',     free: true },
  { key: 'mistral',     label: 'Mistral AI',   placeholder: '...',          link: 'https://console.mistral.ai/api-keys',        free: true },
  { key: 'openrouter',  label: 'OpenRouter',   placeholder: 'sk-or-v1-...',link: 'https://openrouter.ai/keys',                 free: true },
  { key: 'tavily',      label: 'Tavily Search', placeholder: 'tvly-...',   link: 'https://app.tavily.com',                     free: false },
];

export default function Settings() {
  const [savedVendors, setSavedVendors] = useState<string[]>([]);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    authApi.getApiKeys().then(({ data }) => setSavedVendors(data.vendors || [])).catch(() => {});
  }, []);

  const handleSaveKey = async (vendor: string) => {
    const key = keyInputs[vendor]?.trim();
    if (!key) { toast.error('Enter an API key'); return; }
    setSaving(vendor);
    try {
      const { data } = await authApi.updateApiKeys({ [vendor]: key });
      setSavedVendors(data.vendors);
      setKeyInputs((prev) => ({ ...prev, [vendor]: '' }));
      toast.success(`${vendor} key saved!`);
    } catch {
      toast.error('Failed to save key');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteKey = async (vendor: string) => {
    if (!confirm(`Remove ${vendor} API key?`)) return;
    try {
      const { data } = await authApi.deleteApiKey(vendor);
      setSavedVendors(data.vendors);
      toast.success(`${vendor} key removed`);
    } catch {
      toast.error('Failed to remove key');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SettingsIcon size={28} />
            Settings
          </h1>
          <p>Manage your API keys for LLM vendors and tools</p>
        </div>
      </div>

      {/* API Keys section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Key size={18} color="var(--text-accent)" />
          <h3 style={{ margin: 0 }}>API Keys</h3>
          <span className="badge badge-purple" style={{ marginLeft: '0.25rem' }}>Encrypted at rest</span>
        </div>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Your keys are encrypted with AES-128 before being stored. Only you can use them.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {VENDORS.map((vendor) => {
            const isSaved = savedVendors.includes(vendor.key);
            return (
              <div
                key={vendor.key}
                className="card"
                style={{
                  padding: '1rem',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${isSaved ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{vendor.label}</span>
                    {vendor.free && <span className="badge badge-success">Free tier</span>}
                    {isSaved && (
                      <span className="badge badge-success">
                        <Check size={10} /> Saved
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <a
                      href={vendor.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--text-accent)', textDecoration: 'none' }}
                    >
                      Get key ↗
                    </a>
                    {isSaved && (
                      <button
                        id={`btn-delete-key-${vendor.key}`}
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => handleDeleteKey(vendor.key)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id={`key-input-${vendor.key}`}
                    type="password"
                    className="input-field"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                    placeholder={isSaved ? '••••••••••••••••' : vendor.placeholder}
                    value={keyInputs[vendor.key] || ''}
                    onChange={(e) => setKeyInputs((prev) => ({ ...prev, [vendor.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(vendor.key)}
                  />
                  <button
                    id={`btn-save-key-${vendor.key}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSaveKey(vendor.key)}
                    disabled={saving === vendor.key}
                  >
                    {saving === vendor.key ? <span className="spinner" /> : isSaved ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <div className="card" style={{ marginTop: '1rem', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.2)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-accent)' }}>🔐 Security note:</strong> API keys are encrypted using Fernet (AES-128-CBC) before
          being stored in the database. They are decrypted in-memory only during agent execution and are never returned via the API.
          Only the vendor names of saved keys are exposed.
        </div>
      </div>
    </div>
  );
}
