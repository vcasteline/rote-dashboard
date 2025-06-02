import { createClient } from '@/lib/supabase/server';
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

export default async function PackagesPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  const { data: purchases, error } = await supabase
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
    .order('purchase_date', { ascending: false })
    .returns<PurchaseData[]>();

  if (error) {
    console.error("Error fetching purchases:", error);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Paquetes Comprados</h1>
      {error ? (
        <p className="text-red-500">No se pudieron cargar los paquetes. Intenta más tarde.</p>
      ) : (
        <PackagesClient initialPurchases={purchases ?? []} />
      )}
    </div>
  );
} 