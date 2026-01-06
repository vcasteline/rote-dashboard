import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import PackagesClient from './_components/PackagesClient';
import { getNowInEcuador, toISOString } from '@/lib/utils/dateUtils';

export type PurchaseData = {
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
        contabilidad,
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
    // Usar zona horaria de Guayaquil para consistencia con make_reservation
    // IMPORTANTE: Comparar por FECHA (día), no por timestamp exacto
    // Para que un paquete que vence "hoy" sea válido durante todo el día
    const now = getNowInEcuador();
    const todayStartIso = toISOString(now.startOf('day')); // Inicio del día actual en Guayaquil
    const tomorrowStartIso = toISOString(now.plus({ days: 1 }).startOf('day')); // Inicio de mañana
    const in7DaysStartIso = toISOString(now.plus({ days: 7 }).startOf('day')); // Inicio del día en 7 días

    if (status && status !== 'todos') {
      switch (status) {
        case 'agotado':
          base = base.lte('credits_remaining', 0);
          break;
        case 'vencido':
          // Vencido = fecha de expiración es ANTERIOR al inicio del día actual
          base = base.lt('expiration_date', todayStartIso).gt('credits_remaining', 0);
          break;
        case 'por-vencer':
          // Por vencer = expira entre hoy y los próximos 7 días
          base = base.gte('expiration_date', todayStartIso).lt('expiration_date', in7DaysStartIso).gt('credits_remaining', 0);
          break;
        case 'activo':
          // Activo = expira en más de 7 días o no tiene fecha de expiración
          base = base.gt('credits_remaining', 0).or(`expiration_date.is.null,expiration_date.gte.${in7DaysStartIso}`);
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