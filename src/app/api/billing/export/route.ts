import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const ids = request.nextUrl.searchParams.get('ids');
  let query = supabase.from('invoices').select('*');
  if (ids) query = query.in('id', ids.split(','));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Error exportando' }, { status: 500 });

  const headers = [
    'id', 'customer_name', 'customer_email', 'customer_address', 'customer_cedula',
    'package_name', 'quantity', 'subtotal', 'iva_amount', 'total', 'status', 'missing_fields'
  ];
  const rows = (data || []).map((d: any) => [
    d.id, d.customer_name, d.customer_email, d.customer_address, d.customer_cedula,
    d.package_name, d.quantity, d.subtotal, d.iva_amount, d.total, d.status, (d.missing_fields || []).join('|')
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(v => (v ?? '').toString().replace(/,/g, ' ')).join(','))].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}


