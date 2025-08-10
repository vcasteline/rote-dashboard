'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Crea borradores a partir de purchases válidos
export async function createDraftInvoices() {
  const supabase = createAdminClient();

  // 0) Obtener purchase_ids que YA tienen factura enviada para NO volver a generar borrador
  const { data: sentInvoices } = await supabase
    .from('invoices')
    .select('purchase_id, status')
    .in('status', ['Sent', 'Error'])
    .not('purchase_id', 'is', null);
  const sentPurchaseIds = new Set((sentInvoices || []).map((i: any) => i.purchase_id));

  // 1) Obtener purchases con authorization_code válido y sin 'simulated'
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
      id, user_id, package_id, authorization_code,
      users ( email, name, address, cedula ),
      packages ( name, price )
    `)
    .not('authorization_code', 'is', null)
    .not('authorization_code', 'ilike', '%SIMULATED%');

  if (purchasesError) {
    return { error: 'Error obteniendo compras' };
  }

  const draftsToInsert: any[] = [];

  for (const p of purchases || []) {
    // Extra guard: si el authorization_code incluye 'SIMULATED' (cualquier casing), saltar
    const isSimulated = String(p.authorization_code || '').toUpperCase().includes('SIMULATED') || String(p.authorization_code || '').toUpperCase().includes('DEV');
    if (isSimulated) continue;

    // Saltar si el purchase ya fue facturado (estado 'Sent')
    if (sentPurchaseIds.has(p.id)) continue;

    // Evitar duplicados: si ya existe un borrador para este purchase y estado Draft o Draft-Incomplete, saltar
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('purchase_id', p.id)
      .in('status', ['Draft', 'Draft-Incomplete']);

    if (existing && existing.length > 0) continue;

    const quantity = 1;
    const iva_percentage = 0.15; // alineado con el schema actual
    const packageData = Array.isArray(p.packages) ? p.packages[0] : p.packages;
    // Excluir paquetes de prueba por nombre (case-insensitive)
    const packageNameLc = String(packageData?.name || '').toLowerCase();
    if (packageNameLc.includes('prueba')) continue;
    const userData = Array.isArray(p.users) ? p.users[0] : p.users;
    // El precio del paquete incluye IVA (precio bruto)
    const unitGrossPrice = Number(packageData?.price ?? 0);
    const total = Math.round(unitGrossPrice * quantity * 100) / 100; // total con IVA
    // Subtotal (base imponible) = total / (1 + IVA)
    const rawBase = total / (1 + iva_percentage);
    const subtotal = Math.round(rawBase * 100) / 100;
    // IVA = total - subtotal (asegura consistencia tras redondeo)
    const iva_amount = Math.round((total - subtotal) * 100) / 100;

    const missing: string[] = [];
    // Dirección ya no es obligatoria; solo validar cédula
    if (!userData?.cedula) missing.push('cedula');

    draftsToInsert.push({
      purchase_id: p.id,
      user_id: p.user_id,
      package_id: p.package_id,
      package_name: packageData?.name ?? null,
      package_price: unitGrossPrice,
      quantity,
      iva_percentage,
      subtotal,
      iva_amount,
      total,
      status: missing.length > 0 ? 'Draft-Incomplete' : 'Draft',
      customer_name: userData?.name ?? null,
      customer_email: userData?.email ?? null,
      customer_address: userData?.address ?? null,
      customer_cedula: userData?.cedula ?? null,
      missing_fields: missing,
    });
  }

  if (draftsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('invoices').insert(draftsToInsert);
    if (insertError) {
      return { error: 'Error creando borradores' };
    }
  }

  const { data: drafts } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['Draft', 'Draft-Incomplete'])
    .order('created_at', { ascending: false });

  revalidatePath('/dashboard/billing');
  return { drafts };
}

export async function approveInvoices({ ids, prefix, startNumber }: { ids: string[]; prefix: string; startNumber: number }) {
  const supabase = createAdminClient();

  if (!/^\d{3}-\d{3}-$/.test(prefix) || startNumber <= 0 || startNumber.toString().length > 9) {
    return { error: 'Secuencia inválida' };
  }

  // Traer facturas seleccionadas listas (no incompletas)
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .in('id', ids)
    .eq('status', 'Draft');

  if (error) return { error: 'Error obteniendo facturas' };
  if (!invoices || invoices.length === 0) return { error: 'No hay facturas listas' };

  // Llamar API interna para enviar a Contifico y actualizar
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${base}/api/billing/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceIds: ids, prefix, start: startNumber }),
    cache: 'no-store'
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    return { error: json.message || 'Error enviando a Contífico' };
  }

  const { data: updatedDrafts } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['Draft', 'Draft-Incomplete'])
    .order('created_at', { ascending: false });

  const { data: sent } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'Sent')
    .order('created_at', { ascending: false });

  revalidatePath('/dashboard/billing');
  return { updatedDrafts, sent };
}

// Sincroniza borradores incompletos: si ya NO faltan campos requeridos, pasa de 'Draft-Incomplete' a 'Draft'
export async function syncIncompleteDrafts(): Promise<{ updated: number; drafts: any[] }> {
  const supabase = createAdminClient();

  // Traer borradores incompletos
  const { data: incompletos } = await supabase
    .from('invoices')
    .select('id, user_id, missing_fields')
    .eq('status', 'Draft-Incomplete');

  if (!incompletos || incompletos.length === 0) {
    const { data: drafts } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['Draft', 'Draft-Incomplete'])
      .order('created_at', { ascending: false });
    return { updated: 0, drafts: drafts || [] };
  }

  let updated = 0;
  for (const inv of incompletos) {
    if (!inv.user_id) continue;
    // Verificar datos actuales del usuario
    const { data: user } = await supabase
      .from('users')
      .select('address, cedula, name, email')
      .eq('id', inv.user_id)
      .single();

    const missing: string[] = [];
    // Dirección ya no es obligatoria; solo validar cédula
    if (!user?.cedula) missing.push('cedula');

    if (missing.length === 0) {
      // Actualizar factura con datos frescos y pasar a Draft normal
      const { error: upErr } = await supabase
        .from('invoices')
        .update({
          status: 'Draft',
          customer_address: user?.address ?? null,
          customer_cedula: user?.cedula ?? null,
          customer_name: user?.name ?? null,
          customer_email: user?.email ?? null,
          missing_fields: [],
        })
        .eq('id', inv.id);
      if (!upErr) updated++;
    } else {
      // Mantener incompleta pero actualizar lista de faltantes
      await supabase
        .from('invoices')
        .update({ missing_fields: missing })
        .eq('id', inv.id);
    }
  }

  revalidatePath('/dashboard/billing');
  const { data: drafts } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['Draft', 'Draft-Incomplete'])
    .order('created_at', { ascending: false });

  return { updated, drafts: drafts || [] };
}


