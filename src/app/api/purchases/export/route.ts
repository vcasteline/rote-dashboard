import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type PurchaseRow = {
  id: string;
  purchase_date: string | null;
  expiration_date: string | null;
  credits_remaining: number;
  authorization_code: string | null;
  transaction_id: string | null;
  contabilidad: boolean;
  users: {
    name: string | null;
    email: string;
    phone: string | null;
    cedula: string | null;
    address: string | null;
  } | null;
  packages: {
    name: string | null;
    price: number | null;
    class_credits: number | null;
    expiration_days: number | null;
  } | null;
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const status = url.searchParams.get('status') || 'todos';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const q = url.searchParams.get('q') || '';
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  const supabase = createAdminClient();

  try {
    let base = supabase
      .from('purchases')
      .select(
        `
        id,
        purchase_date,
        expiration_date,
        credits_remaining,
        authorization_code,
        transaction_id,
        contabilidad,
        users ( name, email, phone, cedula, address ),
        packages ( name, price, class_credits, expiration_days )
      `
      )
      .eq('contabilidad', true)
      .order('purchase_date', { ascending: order === 'asc' });

    if (user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('email', user)
        .single();
      if (userRow) {
        base = base.eq('user_id', userRow.id);
      } else {
        // No hay datos que exportar
        const emptyCsv = '\ufeff' + ['TIPO,CANTIDAD,VALOR X UNIDAD,VALOR TOTAL,MÉTODO DE PAGO,NOMBRE,APELLIDO,CÉDULA,DIRECCIÓN,CORREO,TELÉFONO,TRANSACTION ID'];
        return new Response(emptyCsv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="paquetes_clases_agrupados_vacio.csv"`,
          },
        });
      }
    }

    // Filtros por estado
    const nowIso = new Date().toISOString();
    const in7DaysIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (status && status !== 'todos') {
      switch (status) {
        case 'agotado':
          base = base.lte('credits_remaining', 0);
          break;
        case 'vencido':
          base = base.lt('expiration_date', nowIso).gt('credits_remaining', 0);
          break;
        case 'por-vencer':
          base = base.gte('expiration_date', nowIso).lte('expiration_date', in7DaysIso).gt('credits_remaining', 0);
          break;
        case 'activo':
          base = base.gt('credits_remaining', 0).or(`expiration_date.is.null,expiration_date.gte.${in7DaysIso}`);
          break;
      }
    }

    // Filtros por fecha de compra
    if (dateFrom) base = base.gte('purchase_date', `${dateFrom}T00:00:00.000Z`);
    if (dateTo) base = base.lte('purchase_date', `${dateTo}T23:59:59.999Z`);

    // Filtro de búsqueda (cliente/email/paquete)
    if (q) {
      const like = `%${q}%`;
      base = base.or(
        [
          `users.name.ilike.${like}`,
          `users.email.ilike.${like}`,
          `packages.name.ilike.${like}`,
        ].join(',')
      );
    }

    // Obtener todo por lotes
    const all: PurchaseRow[] = [];
    const pageSize = 1000;
    for (let offset = 0; offset < 100000; offset += pageSize) {
      const { data, error } = await base
        .range(offset, offset + pageSize - 1)
        .returns<PurchaseRow[]>();
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
    }

    // Construir CSV
    const headers = [
      'TIPO',
      'CANTIDAD',
      'VALOR X UNIDAD',
      'VALOR TOTAL',
      'MÉTODO DE PAGO',
      'NOMBRE',
      'APELLIDO',
      'CÉDULA',
      'DIRECCIÓN',
      'CORREO',
      'TELÉFONO',
      'TRANSACTION ID'
    ];

    // Agrupar compras por usuario y paquete
    const groupedPurchases = new Map();
    
    all.forEach((p) => {
      const key = `${p.users?.email || 'N/A'}_${p.packages?.name || 'N/A'}`;
      
      if (groupedPurchases.has(key)) {
        const existing = groupedPurchases.get(key);
        existing.cantidad += 1;
        existing.valorTotal += (p.packages?.price ?? 0);
        
        // Agregar transaction_id y authorization_code a las listas
        if (p.transaction_id && p.transaction_id !== 'N/A') {
          existing.transactionIds.push(p.transaction_id);
        }
        if (p.authorization_code && p.authorization_code !== 'N/A') {
          existing.authorizationCodes.push(p.authorization_code);
        }
      } else {
        // Separar nombre y apellido
        const fullName = p.users?.name || 'N/A';
        const nameParts = fullName.split(' ');
        const nombre = nameParts[0] || 'N/A';
        const apellido = nameParts.slice(1).join(' ') || '';
        
        // Crear arrays para recopilar todos los IDs
        const transactionIds: string[] = [];
        const authorizationCodes: string[] = [];
        
        if (p.transaction_id && p.transaction_id !== 'N/A') {
          transactionIds.push(p.transaction_id);
        }
        if (p.authorization_code && p.authorization_code !== 'N/A') {
          authorizationCodes.push(p.authorization_code);
        }
        
        groupedPurchases.set(key, {
          tipo: p.packages?.name || 'N/A',
          cantidad: 1,
          valorXUnidad: p.packages?.price ?? 0,
          valorTotal: p.packages?.price ?? 0,
          nombre: nombre,
          apellido: apellido,
          cedula: p.users?.cedula || 'N/A',
          direccion: p.users?.address || 'N/A',
          correo: p.users?.email || 'N/A',
          telefono: p.users?.phone || 'N/A',
          transactionIds: transactionIds,
          authorizationCodes: authorizationCodes
        });
      }
    });

    const rows = Array.from(groupedPurchases.values()).map((group) => {
      // Calcular valor por unidad con IVA y redondearlo a 2 decimales
      const valorXUnidadConIva = Math.round((group.valorXUnidad * 1.15) * 100) / 100;
      
      // Calcular total: precio unitario con IVA redondeado × cantidad
      const total = valorXUnidadConIva * group.cantidad;
      
      // Determinar método de pago
      const hasTransactionId = group.transactionIds.length > 0;
      const hasAuthorizationCode = group.authorizationCodes.length > 0;
      const metodoPago = (hasTransactionId || hasAuthorizationCode) ? 'App' : 'Otros';
      
      // Crear lista de todos los IDs (transaction_ids primero, luego authorization_codes si no hay transaction_ids)
      let allIds: string[] = [];
      if (hasTransactionId) {
        allIds = [...group.transactionIds];
      } else if (hasAuthorizationCode) {
        allIds = [...group.authorizationCodes];
      }
      
      const transactionIdString = allIds.length > 0 ? allIds.join(', ') : 'N/A';
      
      return [
        group.tipo,
        String(group.cantidad),
        `$${valorXUnidadConIva.toFixed(2)}`, // Valor por unidad con IVA incluido
        `$${total.toFixed(2)}`, // Total: valor unitario con IVA × cantidad
        metodoPago,
        group.nombre,
        group.apellido,
        group.cedula,
        group.direccion,
        group.correo,
        group.telefono,
        transactionIdString // Todos los transaction IDs o authorization codes
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const fileNameParts = ['paquetes_clases_agrupados'];
    if (user) fileNameParts.push(`usuario_${user}`);
    if (status && status !== 'todos') fileNameParts.push(status);
    if (dateFrom || dateTo) fileNameParts.push('filtrado_fecha');
    const fileName = `${fileNameParts.join('_')}_${new Date().toISOString().slice(0, 16).replace(/[-T]/g, '_').replace(/:/g, '-')}.csv`;

    return new Response('\ufeff' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting purchases:', error);
    return new Response('Error al exportar', { status: 500 });
  }
}


