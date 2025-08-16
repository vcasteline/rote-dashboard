import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import PackagesClient from './_components/PackagesClient';

export type PurchaseData = {
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
    name: string;
    price: number;
    class_credits: number;
    expiration_days: number | null;
  } | null;
};

interface PackagesPageProps {
  searchParams: Promise<{ user?: string; page?: string; pageSize?: string; order?: string; status?: string; dateFrom?: string; dateTo?: string; q?: string }>;
}

export default async function PackagesPage({ searchParams }: PackagesPageProps) {
  const supabase = createAdminClient();

  // Await searchParams
  const params = await searchParams;
  const filteredUserEmail = params.user || null;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Math.min(200, Number(params.pageSize) || 50));
  const order = params.order === 'asc' ? 'asc' : 'desc';
  const status = params.status || 'todos';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';
  const q = params.q || '';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let total = 0;
  let purchases: PurchaseData[] = [];
  let error = null as unknown as Error | null;

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
      `,
        { count: 'exact' }
      )
      .order('purchase_date', { ascending: order === 'asc' });

    if (filteredUserEmail) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', filteredUserEmail)
        .single();

      if (user) {
        base = base.eq('user_id', user.id);
      } else {
        return (
          <div>
            <h1 className="text-3xl font-bold mb-6 text-gray-900">
              Paquetes Comprados <span className="text-lg font-normal text-gray-600 ml-2">- {filteredUserEmail}</span>
            </h1>
            <PackagesClient purchases={[]} total={0} page={page} pageSize={pageSize} order={order as 'asc' | 'desc'} status={status} dateFrom={dateFrom} dateTo={dateTo} q={q} filteredUser={filteredUserEmail} />
          </div>
        );
      }
    }

    // Filtros por estado (server-side) para paginación consistente
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

    // Filtro por rango de fechas de compra
    if (dateFrom) {
      base = base.gte('purchase_date', `${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo) {
      base = base.lte('purchase_date', `${dateTo}T23:59:59.999Z`);
    }

    const { data, count, error: qError } = await base.range(from, to).returns<PurchaseData[]>();
    purchases = data ?? [];
    total = count ?? 0;
    error = qError as Error | null;
  } catch (e: any) {
    console.error('Error fetching purchases:', e);
    error = e;
  }

  if (error) {
    console.error('Error fetching purchases:', error);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Paquetes Comprados
        {filteredUserEmail && (
          <span className="text-lg font-normal text-gray-600 ml-2">- {filteredUserEmail}</span>
        )}
      </h1>
      <PackagesClient purchases={purchases} total={total} page={page} pageSize={pageSize} order={order as 'asc' | 'desc'} status={status} dateFrom={dateFrom} dateTo={dateTo} q={q} filteredUser={filteredUserEmail} />
    </div>
  );
}