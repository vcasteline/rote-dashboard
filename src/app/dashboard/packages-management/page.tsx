import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import PackagesManagementClient from './_components/PackagesManagementClient';

export type Package = {
  id: string;
  name: string;
  price: number;
  class_credits: number;
  expiration_days: number | null;
  created_at: string | null;
  deleted_at: string | null;
};

export default async function PackagesManagementPage() {
  const supabase = createAdminClient();

  // Obtener paquetes disponibles (solo los no eliminados)
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('id, name, price, class_credits, expiration_days, created_at, deleted_at')
    .is('deleted_at', null) // Solo obtener paquetes no eliminados
    .order('created_at', { ascending: false });

  if (packagesError) {
    console.error('Error fetching packages:', packagesError);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Gestión de Paquetes</h1>
      {packagesError ? (
        <p className="text-red-500">No se pudieron cargar los paquetes. Intenta más tarde.</p>
      ) : (
        <PackagesManagementClient packages={packages || []} />
      )}
    </div>
  );
} 