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
  searchParams: Promise<{ user?: string }>;
}

export default async function PackagesPage({ searchParams }: PackagesPageProps) {
  const supabase = createAdminClient();

  // Await searchParams
  const params = await searchParams;
  const filteredUserEmail = params.user || null;

  let query = supabase
    .from('purchases')
    .select(`
      id,
      purchase_date,
      expiration_date,
      credits_remaining,
      authorization_code,
      transaction_id,
      users ( name, email, phone, cedula, address ),
      packages ( name, price, class_credits, expiration_days )
    `)
    .order('purchase_date', { ascending: false });

  // Filtrar por usuario si se proporciona el parámetro
  let purchases;
  let error = null;
  
  if (filteredUserEmail) {
    // Buscar usuario ID primero
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', filteredUserEmail)
      .single();
    
    if (user) {
      // Filtrar por user_id
      query = query.eq('user_id', user.id);
      const { data, error: queryError } = await query.returns<PurchaseData[]>();
      purchases = data;
      error = queryError;
    } else {
      purchases = [];
    }
  } else {
    const { data, error: queryError } = await query.returns<PurchaseData[]>();
    purchases = data;
    error = queryError;
  }

  if (error) {
    console.error("Error fetching purchases:", error);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Paquetes Comprados
        {filteredUserEmail && (
          <span className="text-lg font-normal text-gray-600 ml-2">
            - {filteredUserEmail}
          </span>
        )}
      </h1>
      {error ? (
        <p className="text-red-500">No se pudieron cargar los paquetes. Intenta más tarde.</p>
      ) : (
        <PackagesClient initialPurchases={purchases ?? []} filteredUser={filteredUserEmail} />
      )}
    </div>
  );
} 