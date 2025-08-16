import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ReservationsClient from './_components/ReservationsClient';
import { getNextMonday, toISOString } from '@/lib/utils/dateUtils';

// Tipo actualizado
export type ReservationData = {
  id: string; // reservation id
  status: string | null;
  created_at: string; // Para ordenar waitlist por orden de llegada
  from_purchase_id: string | null;
  user_id: string | null; // ID del usuario para poder usar en funciones
  users: {
    name: string | null; // Cambiado de full_name a name
    email: string | null;
    shoe_size: string | null;
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
          static_bike_id: number; // ID de la tabla static_bikes
          static_bikes: {
              number: number; // El número físico real de la bici
          };
      } | null;
  }[]; // Array de bicicletas reservadas
};

export default async function ReservationsPage() {
  const supabase = createAdminClient();

  // Obtener el lunes de esta semana usando Luxon
  const mondayOfThisWeek = toISOString(getNextMonday()).split('T')[0];

  console.log('Filtrando reservaciones desde (Luxon):', mondayOfThisWeek); // Para debug

  // Obtener reservaciones futuras con detalles anidados (confirmadas Y waitlist)
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`
      id,
      status,
      created_at,
      user_id,
      users ( name, email, shoe_size ),
      classes ( id, date, start_time, instructors ( name ) ),
      reservation_bikes ( bikes ( static_bike_id, static_bikes!inner(number) ) )
    `)
    .in('status', ['confirmed', 'waitlist']) // Incluir tanto confirmadas como waitlist
    .gte('classes.date', mondayOfThisWeek) // Solo clases desde esta semana
    // Ordenar por fecha y hora de clase para agrupar visualmente
    .order('date', { referencedTable: 'classes', ascending: true })
    .order('start_time', { referencedTable: 'classes', ascending: true })
    .order('status', { ascending: false }) // 'waitlist' antes que 'confirmed' alfabéticamente
    .order('created_at', { ascending: true }) // Waitlist en orden de llegada
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