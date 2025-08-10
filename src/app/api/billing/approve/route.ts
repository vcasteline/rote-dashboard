import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DateTime } from 'luxon';

type ApproveRequest = {
  invoiceIds: string[];
  prefix: string;
  start: number;
};

export async function POST(request: Request) {
  const supabase = createAdminClient();

  try {
    const body = (await request.json()) as ApproveRequest;
    const { invoiceIds, prefix, start } = body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ success: false, message: 'IDs requeridos' }, { status: 400 });
    }
    if (!/^\d{3}-\d{3}-$/.test(prefix) || start <= 0 || start.toString().length > 9) {
      return NextResponse.json({ success: false, message: 'Secuencia inválida' }, { status: 400 });
    }

    // Validar envs (POS y API KEY)
    const apiKey = process.env.CONTIFICO_API_KEY;
    const posId = 'b04ab486-63b5-4164-9ecf-a22212dbec6d';
    const defaultProductId = process.env.CONTIFICO_PRODUCT_ID_DEFAULT || 'ID_PRODUCTO_PENDIENTE';
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Falta CONTIFICO_API_KEY en variables de entorno' }, { status: 500 });
    }

    // Obtener facturas
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .in('id', invoiceIds)
      .eq('status', 'Draft');

    if (error) {
      return NextResponse.json({ success: false, message: 'Error obteniendo facturas' }, { status: 500 });
    }
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ success: false, message: 'No hay facturas en estado Draft' }, { status: 400 });
    }

    // Mapear package_id -> contifico_product_id cuando exista en packages
    const packageIds = Array.from(new Set((invoices || []).map((i: any) => i.package_id).filter(Boolean)));
    const packageMap = new Map<string, string | null>();
    if (packageIds.length > 0) {
      const { data: pkgRows } = await supabase
        .from('packages')
        .select('id, contifico_product_id')
        .in('id', packageIds);
      (pkgRows || []).forEach((r: any) => packageMap.set(r.id, r.contifico_product_id || null));
    }

    let sequence = start;
    const results: { id: string; ok: boolean; error?: string; document?: string }[] = [];

    for (const inv of invoices as any[]) {
      const document = `${prefix}${String(sequence).padStart(9, '0')}`;
      sequence++;

      try {
        // Validaciones de datos de factura
        // Dirección no es obligatoria
        if (!inv.customer_name || !inv.customer_cedula) {
          throw new Error('Datos del cliente incompletos');
        }
        if (!inv.total || !inv.subtotal || !inv.quantity) {
          throw new Error('Totales incompletos');
        }

        const porcentajeIva = Math.round(Number(inv.iva_percentage ?? 0.15) * 100); // 15 => 15%
        const unitBasePrice = Number(inv.subtotal) / Number(inv.quantity);

        // Payload Contífico - fecha en zona horaria de Ecuador
        const nowEc = DateTime.now().setZone('America/Guayaquil');
        const fecha_emision = nowEc.toFormat('dd/LL/yyyy');
        const productId = packageMap.get(inv.package_id) || defaultProductId;
        const detalles = [
          {
            producto_id: productId,
            cantidad: Number(inv.quantity),
            precio: Number(unitBasePrice.toFixed(6)),
            porcentaje_iva: porcentajeIva,
            porcentaje_descuento: 0,
            base_cero: porcentajeIva > 0 ? 0 : Number(inv.subtotal),
            base_gravable: porcentajeIva > 0 ? Number(inv.subtotal) : 0,
            base_no_gravable: 0,
            descripcion_adicional: inv.package_name || 'SERVICIO',
          },
        ];

        const payload = {
          pos: posId,
          fecha_emision,
          tipo_documento: 'FAC',
          documento: document,
          estado: 'P',
          autorizacion: '',
          cliente: {
            cedula: inv.customer_cedula,
            razon_social: inv.customer_name,
            direccion: inv.customer_address || '',
            tipo: 'N',
            email: inv.customer_email || '',
          },
          descripcion: inv.package_name || 'SERVICIO',
          subtotal_0: porcentajeIva > 0 ? 0 : Number(inv.subtotal),
          subtotal_12: porcentajeIva > 0 ? Number(inv.subtotal) : 0,
          iva: Number(Number(inv.iva_amount).toFixed(2)),
          total: Number(Number(inv.total).toFixed(2)),
          detalles,
          electronico: true,
        } as const;

        const resp = await fetch('https://api.contifico.com/sistema/api/v1/documento/', {
          method: 'POST',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Contifico HTTP ${resp.status}: ${text}`);
        }
        const data = await resp.json();
        const contificoId = data?.id ?? null;
        if (!contificoId) {
          throw new Error('Respuesta de Contífico sin id');
        }

        const { error: upErr } = await supabase
          .from('invoices')
          .update({ status: 'Sent', document_number: document, contifico_id: contificoId, contifico_error: null, sent_at: new Date().toISOString() })
          .eq('id', inv.id);
        if (upErr) {
          results.push({ id: inv.id, ok: false, error: upErr.message });
        } else {
          results.push({ id: inv.id, ok: true, document });
        }
      } catch (err: any) {
        await supabase
          .from('invoices')
          .update({ contifico_error: err.message })
          .eq('id', inv.id);
        results.push({ id: inv.id, ok: false, error: err.message });
      }
    }

    const ok = results.filter(r => r.ok).length;
    const ko = results.length - ok;
    return NextResponse.json({ success: true, approved: ok, errors: ko, results });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message || 'Error' }, { status: 500 });
  }
}


