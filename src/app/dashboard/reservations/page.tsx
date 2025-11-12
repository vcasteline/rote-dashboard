import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ReservationsClient from './_components/ReservationsClient';
import { getThisWeekMonday, toISOString } from '@/lib/utils/dateUtils';

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
    location_id: string | null;
    instructors: {
        name: string | null;
    } | null;
    locations: {
        name: string | null;
    } | null;
  } | null;
  reservation_spots: {
      spot_id: string;
      class_spots: {
          spot_number: number | null; // El número del spot/bicicleta
          label: string | null;
      } | null;
  }[]; // Array de spots reservados
};

export default async function ReservationsPage() {
  const supabase = createAdminClient();

  // Obtener el lunes de esta semana usando Luxon
  const mondayOfThisWeek = toISOString(getThisWeekMonday()).split('T')[0];

  // Obtener reservaciones futuras con detalles anidados (confirmadas Y waitlist)
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`
      id,
      status,
      created_at,
      user_id,
      users ( name, email, shoe_size ),
      classes ( id, date, start_time, location_id, instructors ( name ), locations ( name ) ),
      reservation_spots ( spot_id, class_spots ( spot_number, label ) )
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