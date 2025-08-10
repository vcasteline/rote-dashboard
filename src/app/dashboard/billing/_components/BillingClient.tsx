'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Download, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import type { InvoiceRow } from '../page';
import { createDraftInvoices, approveInvoices, syncIncompleteDrafts } from '@/app/dashboard/billing/actions';

type Props = {
  initialDrafts: InvoiceRow[];
  initialSent: InvoiceRow[];
};

export default function BillingClient({ initialDrafts, initialSent }: Props) {
  const [drafts, setDrafts] = useState<InvoiceRow[]>(initialDrafts);
  const [sent, setSent] = useState<InvoiceRow[]>(initialSent);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sequencePrefix, setSequencePrefix] = useState('001-001-');
  const [sequenceStart, setSequenceStart] = useState<number | ''>('' as any);
  const [creating, setCreating] = useState(false);
  const [draftQuery, setDraftQuery] = useState('');
  const [sentQuery, setSentQuery] = useState('');
  const headerSelectRef = useRef<HTMLInputElement>(null);
  const [approving, setApproving] = useState(false);
  const [approveProgress, setApproveProgress] = useState({ current: 0, total: 0 });
  const [showIncompleteUsers, setShowIncompleteUsers] = useState(false);

  const incompleteCount = useMemo(() => drafts.filter(d => d.status === 'Draft-Incomplete').length, [drafts]);
  const incompleteUsers = useMemo(() => {
    const map = new Map<string, { user_id: string; name: string | null; email: string | null; count: number }>();
    drafts.forEach(d => {
      if (d.status !== 'Draft-Incomplete' || !d.user_id) return;
      const key = d.user_id;
      const entry = map.get(key) || { user_id: key, name: d.customer_name || null, email: d.customer_email || null, count: 0 };
      entry.count += 1;
      // Actualiza nombre/email si llegan vacíos inicialmente
      if (!entry.name && d.customer_name) entry.name = d.customer_name;
      if (!entry.email && d.customer_email) entry.email = d.customer_email;
      map.set(key, entry);
    });
    return Array.from(map.values());
  }, [drafts]);
  const filteredDrafts = useMemo(() => {
    const q = draftQuery.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter(d =>
      (d.customer_name || '').toLowerCase().includes(q) ||
      (d.customer_email || '').toLowerCase().includes(q) ||
      (d.package_name || '').toLowerCase().includes(q) ||
      (d.document_number || '').toLowerCase().includes(q)
    );
  }, [drafts, draftQuery]);

  const filteredSent = useMemo(() => {
    const q = sentQuery.trim().toLowerCase();
    if (!q) return sent;
    return sent.filter(s =>
      (s.customer_name || '').toLowerCase().includes(q) ||
      (s.customer_email || '').toLowerCase().includes(q) ||
      (s.package_name || '').toLowerCase().includes(q) ||
      (s.document_number || '').toLowerCase().includes(q)
    );
  }, [sent, sentQuery]);

  // Gestionar estado indeterminado del checkbox de cabecera (select all)
  useEffect(() => {
    const selectableIds = filteredDrafts
      .filter(d => d.status !== 'Draft-Incomplete')
      .map(d => d.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id));
    const someSelected = selectableIds.some(id => selectedIds.includes(id)) && !allSelected;
    if (headerSelectRef.current) {
      headerSelectRef.current.indeterminate = someSelected;
      headerSelectRef.current.checked = allSelected;
    }
  }, [filteredDrafts, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreateDrafts = async () => {
    setCreating(true);
    setIsLoading(true);
    try {
      const res = await createDraftInvoices();
      if (res?.drafts) setDrafts(res.drafts);
    } finally {
      setIsLoading(false);
      setCreating(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedIds.length) params.set('ids', selectedIds.join(','));
      const res = await fetch(`/api/billing/export?${params.toString()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'facturas_borrador.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!sequencePrefix || !sequenceStart || selectedIds.length === 0) return;
    setIsLoading(true);
    setApproving(true);
    try {
      // Procesar en tandas de 10
      const batchSize = 10;
      const batches: string[][] = [];
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        batches.push(selectedIds.slice(i, i + batchSize));
      }
      setApproveProgress({ current: 0, total: batches.length });

      let nextSeq = Number(sequenceStart);
      for (let i = 0; i < batches.length; i++) {
        const batchIds = batches[i];
        const res = await approveInvoices({ ids: batchIds, prefix: sequencePrefix, startNumber: nextSeq });
        // Cada lote consume tantos documentos como cantidad de facturas del lote
        nextSeq += batchIds.length;
        setApproveProgress({ current: i + 1, total: batches.length });

        // Refrescar data desde API para evitar estados inconsistentes
        const refresh = await fetch('/api/billing/list', { cache: 'no-store' });
        const json = await refresh.json();
        if (json?.drafts) setDrafts(json.drafts);
        if (json?.sent) setSent(json.sent);
      }
      setSelectedIds([]);
    } finally {
      setIsLoading(false);
      setApproving(false);
      setApproveProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-8 text-gray-900">
      <div className="flex items-center gap-3">
        <button onClick={handleCreateDrafts} disabled={isLoading} className="bg-[#6758C2] hover:bg-[#5b4fba] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-80">
          {creating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {creating ? 'Creando…' : 'Crear facturas borrador'}
        </button>
        <button
          onClick={async () => {
            setIsLoading(true);
            try {
              const res = await syncIncompleteDrafts();
              if (res?.drafts) setDrafts(res.drafts);
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
          title="Revisar si los usuarios ya completaron datos y mover a Draft"
        >
          <RefreshCw size={16} /> Sincronizar incompletas
        </button>
        <button onClick={handleExport} disabled={isLoading || drafts.length === 0} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2">
          <Download size={16} /> Exportar CSV
        </button>
        <div className="ml-auto flex items-center gap-3 text-yellow-600">
          <span className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>
              {incompleteCount} borradores incompletos · {incompleteUsers.length} usuarios
            </span>
          </span>
          {incompleteUsers.length > 0 && (
            <button
              className="text-xs underline text-yellow-700 hover:text-yellow-800"
              onClick={() => setShowIncompleteUsers(v => !v)}
            >
              {showIncompleteUsers ? 'ocultar' : 'ver usuarios'}
            </button>
          )}
        </div>
      </div>

      {showIncompleteUsers && incompleteUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900">
          <div className="font-medium mb-2">Usuarios con datos faltantes</div>
          <ul className="list-disc pl-5 space-y-1">
            {incompleteUsers.map(u => (
              <li key={u.user_id}>
                <span className="font-medium">{u.name || 'Sin nombre'}</span>
                {u.email ? <span className="text-yellow-800"> · {u.email}</span> : null}
                <span className="text-yellow-700"> — {u.count} borrador(es)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-3">
          Borradores
          <span className="text-sm bg-gray-200 text-gray-700 rounded px-2 py-0.5">{drafts.length}</span>
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Buscar por cliente, email, paquete o documento"
            className="bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded w-full max-w-md"
          />
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[420px] overflow-y-auto">
          <table className="min-w-full text-sm bg-white rounded shadow border border-gray-200">
            <thead>
              <tr className="text-left text-gray-600 bg-gray-50">
                <th className="p-3">
                  <input
                    ref={headerSelectRef}
                    type="checkbox"
                    onChange={() => {
                      const selectableIds = filteredDrafts
                        .filter(d => d.status !== 'Draft-Incomplete')
                        .map(d => d.id);
                      const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id));
                      if (allSelected) {
                        // deseleccionar solo los seleccionables
                        setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)));
                      } else {
                        // seleccionar todo (union)
                        setSelectedIds(prev => Array.from(new Set([...prev, ...selectableIds])));
                      }
                    }}
                  />
                </th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Paquete</th>
                <th className="p-3">Cant.</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">IVA</th>
                <th className="p-3">Total</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Faltantes</th>
                <th className="p-3">Error Contífico</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrafts.map(d => (
                <tr key={d.id} className="border-b border-gray-200">
                  <td className="p-3">
                    <input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => toggleSelect(d.id)} disabled={d.status === 'Draft-Incomplete'} />
                  </td>
                  <td className="p-3 text-gray-900">{d.customer_name || d.customer_email}</td>
                  <td className="p-3 text-gray-900">{d.package_name}</td>
                  <td className="p-3 text-gray-900">{d.quantity}</td>
                  <td className="p-3 text-gray-900">{d.subtotal?.toFixed(2)}</td>
                  <td className="p-3 text-gray-900">{d.iva_amount?.toFixed(2)}</td>
                  <td className="p-3 text-gray-900">{d.total?.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={d.status === 'Draft-Incomplete' ? 'text-yellow-700' : 'text-gray-700'}>{d.status}</span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">{d.missing_fields?.join(', ')}</td>
                  <td className="p-3 text-xs text-red-600 max-w-[320px] truncate" title={d.contifico_error || ''}>{d.contifico_error || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <input className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded w-32" placeholder="001-001-" value={sequencePrefix} onChange={(e) => setSequencePrefix(e.target.value)} />
          <input className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded w-32" placeholder="Inicio secuencia" type="number" value={sequenceStart} onChange={(e) => setSequenceStart(e.target.value ? Number(e.target.value) : '')} />
          <button onClick={handleApprove} disabled={isLoading || selectedIds.length === 0 || !sequencePrefix || !sequenceStart} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70">
            {approving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {approving
              ? `Aprobando… (${approveProgress.current}/${approveProgress.total})`
              : `Aprobar y enviar a Contífico${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
          </button>
        </div>

        {approving && (
          <div className="mt-2 w-full max-w-lg">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div
                className="h-2 bg-green-600 rounded"
                style={{ width: `${approveProgress.total ? Math.round((approveProgress.current / approveProgress.total) * 100) : 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">Procesando en tandas de 10…</div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-3">
          Enviadas
          <span className="text-sm bg-gray-200 text-gray-700 rounded px-2 py-0.5">{sent.length}</span>
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <input
            value={sentQuery}
            onChange={(e) => setSentQuery(e.target.value)}
            placeholder="Buscar por cliente, email, paquete o documento"
            className="bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded w-full max-w-md"
          />
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[420px] overflow-y-auto">
          <table className="min-w-full text-sm bg-white rounded shadow border border-gray-200">
            <thead>
              <tr className="text-left text-gray-600 bg-gray-50">
                <th className="p-3">Documento</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Total</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredSent.map(s => (
                <tr key={s.id} className="border-b border-gray-200">
                  <td className="p-3 text-gray-900">{s.document_number}</td>
                  <td className="p-3 text-gray-900">{s.customer_name || s.customer_email}</td>
                  <td className="p-3 text-gray-900">{s.total?.toFixed(2)}</td>
                  <td className="p-3 text-gray-900">{s.sent_at ? DateTime.fromISO(s.sent_at).setZone('America/Guayaquil').toFormat('dd/LL/yyyy HH:mm') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}


