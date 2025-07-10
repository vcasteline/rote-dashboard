import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ReservationsClient from './_components/ReservationsClient';
import { getNextMonday, toISOString } from '@/lib/utils/dateUtils';

// Tipo actualizado
export type ReservationData = {
  id: string; // reservation id
  status: string | null;
  from_purchase_id: string | null;
  users: {
    name: string | null; // Cambiado de full_name a name
    email: string | null;
  } | null;
  classes: {
    id: string; // class id
    date: string;
    start_time: string;
    instructors: {
        name: string | null;
    } | null;
  } | null;
  reservation_bikes: {
      bikes: {
          static_bike_id: number; // El número de la bici
      } | null;
  }[]; // Array de bicicletas reservadas
};

export default async function ReservationsPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  // Obtener el lunes de esta semana usando Luxon
  const mondayOfThisWeek = toISOString(getNextMonday()).split('T')[0];

  console.log('Filtrando reservaciones desde (Luxon):', mondayOfThisWeek); // Para debug

  // Obtener reservaciones futuras con detalles anidados
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`
      id,
      status,
      users ( name, email ),
      classes ( id, date, start_time, instructors ( name ) ),
      reservation_bikes ( bikes ( static_bike_id ) )
    `)
    .eq('status', 'confirmed') // Solo confirmadas
    .gte('classes.date', mondayOfThisWeek) // Solo clases desde esta semana
    // Ordenar por fecha y hora de clase para agrupar visualmente
    .order('date', { referencedTable: 'classes', ascending: true })
    .order('start_time', { referencedTable: 'classes', ascending: true })
    .returns<ReservationData[]>();

  if (error) {
    console.error("Error fetching reservations:", error);
    // Manejar error en el cliente
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Próximas Reservaciones</h1>
      {error ? (
        <p className="text-red-500">No se pudieron cargar las reservaciones. Intenta más tarde.</p>
      ) : (
        <ReservationsClient initialReservations={reservations ?? []} />
      )}
    </div>
  );
} 