import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type PurchaseRow = {
  id: string;
  purchase_date: string | null;
  expiration_date: string | null;
  credits_remaining: number;
  authorization_code: string | null;
  transaction_id: string | null;
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
        users ( name, email, phone, cedula, address ),
        packages ( name, price, class_credits, expiration_days )
      `
      )
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
        const emptyCsv = '\ufeff' + ['Fecha Compra,Cliente,Email,Teléfono,Cédula,Dirección,Paquete,Precio,Créditos Totales,Créditos Restantes,Fecha Vencimiento,Estado,Código Autorización,ID Transacción'];
        return new Response(emptyCsv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="paquetes_comprados_vacio.csv"`,
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
      'Fecha Compra',
      'Cliente',
      'Email',
      'Teléfono',
      'Cédula',
      'Dirección',
      'Paquete',
      'Precio',
      'Créditos Totales',
      'Créditos Restantes',
      'Fecha Vencimiento',
      'Estado',
      'Código Autorización',
      'ID Transacción',
    ];

    const rows = all.map((p) => {
      const now = new Date();
      const exp = p.expiration_date ? new Date(p.expiration_date) : null;
      let estado = 'Activo';
      if (p.credits_remaining <= 0) estado = 'Agotado';
      else if (exp && exp < now) estado = 'Vencido';
      else if (exp) {
        const daysToExpire = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToExpire <= 7) estado = `Vence en ${daysToExpire} días`;
      }
      return [
        formatDate(p.purchase_date),
        p.users?.name || 'N/A',
        p.users?.email || 'N/A',
        p.users?.phone || 'N/A',
        p.users?.cedula || 'N/A',
        p.users?.address || 'N/A',
        p.packages?.name || 'N/A',
        String(p.packages?.price ?? 0),
        String(p.packages?.class_credits ?? 0),
        String(p.credits_remaining),
        formatDate(p.expiration_date),
        estado,
        p.authorization_code || 'N/A',
        p.transaction_id || 'N/A',
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const fileNameParts = ['paquetes_comprados'];
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


