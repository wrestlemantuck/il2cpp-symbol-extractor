'use client';

import { useState, useCallback } from 'react';

export default function Home() {
  const [soFile, setSoFile] = useState<File | null>(null);
  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleDrop = useCallback((e: React.DragEvent, type: 'so' | 'meta') => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) type === 'so' ? setSoFile(f) : setMetaFile(f);
  }, []);

  const extract = async () => {
    if (!soFile) return;
    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('libil2cpp', soFile);
    if (metaFile) form.append('metadata', metaFile);

    try {
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `il2cpp-symbols-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>IL2CPP Symbol Extractor</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Upload <code>libil2cpp.so</code> to extract ELF symbols, IL2CPP exports, and strings.
        Optionally upload <code>global-metadata.dat</code> for metadata analysis.
      </p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'so')}
          style={{ border: '2px dashed #444', borderRadius: 12, padding: 24, textAlign: 'center', background: soFile ? '#112211' : '#111' }}
        >
          <input type="file" accept=".so" id="so-input" style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && setSoFile(e.target.files[0])} />
          <label htmlFor="so-input" style={{ cursor: 'pointer' }}>
            <div style={{ fontWeight: 600 }}>libil2cpp.so {soFile && '✓'}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {soFile ? `${soFile.name} (${(soFile.size / 1024 / 1024).toFixed(1)} MB)` : 'Click or drag file here'}
            </div>
          </label>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'meta')}
          style={{ border: '2px dashed #444', borderRadius: 12, padding: 24, textAlign: 'center', background: metaFile ? '#112211' : '#111' }}
        >
          <input type="file" accept=".dat" id="meta-input" style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && setMetaFile(e.target.files[0])} />
          <label htmlFor="meta-input" style={{ cursor: 'pointer' }}>
            <div style={{ fontWeight: 600 }}>global-metadata.dat {metaFile && '✓'}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {metaFile ? metaFile.name : 'Optional: click or drag file here'}
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={extract}
        disabled={!soFile || loading}
        style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: loading ? '#333' : '#2ea44f', color: '#fff', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Parsing ELF...' : 'Extract Symbol Map'}
      </button>

      {error && <div style={{ marginTop: 16, padding: 12, background: '#331111', borderRadius: 8, color: '#ff6666' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Results</h2>
            <button onClick={downloadJSON} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#444', color: '#fff', cursor: 'pointer' }}>
              Download JSON
            </button>
          </div>

          {result.elf?.warnings?.map((w: string, i: number) => (
            <div key={i} style={{ padding: 10, background: '#332200', borderRadius: 6, marginBottom: 8, color: '#ffaa44', fontSize: 13 }}>⚠️ {w}</div>
          ))}

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
            <Stat label="Dynamic Symbols" value={result.elf?.dynamicSymbols?.length || 0} />
            <Stat label="Static Symbols" value={result.elf?.staticSymbols?.length || 0} />
            <Stat label="IL2CPP Exports" value={result.elf?.il2cppExports?.length || 0} />
            <Stat label="IL2CPP Strings" value={result.elf?.il2cppStrings?.length || 0} />
            {result.metadata?.valid && (
              <>
                <Stat label="Metadata Types" value={result.metadata?.summary?.totalTypes || 0} />
                <Stat label="Metadata Methods" value={result.metadata?.summary?.totalMethods || 0} />
              </>
            )}
          </div>

          <details style={{ background: '#111', borderRadius: 8, padding: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Raw JSON Output</summary>
            <pre style={{ overflow: 'auto', maxHeight: 500, fontSize: 12, marginTop: 12 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: '#111', padding: 16, borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#2ea44f' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );
}
