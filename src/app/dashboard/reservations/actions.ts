'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Acción para cancelar una reservación usando la función robusta de la base de datos
export async function cancelReservation(reservationId: string) {
  const cookieStore = cookies();
  const supabase = await createClient();

  if (!reservationId) {
    return { error: 'ID de reservación inválido.' };
  }

  try {
    // Usar la función robusta cancel_reservation que maneja todas las validaciones
    // incluyendo devolución de créditos, liberación de bicicletas, etc.
    const { data, error } = await supabase.rpc('cancel_reservation', {
      p_reservation_id: reservationId
    });

    if (error) {
      console.error('Error calling cancel_reservation:', error);
      
      // Proporcionar mensajes de error más específicos
      let userFriendlyMessage = 'Error al cancelar la reservación.';
      
      if (error.message.includes('not found')) {
        userFriendlyMessage = 'No se encontró la reservación especificada.';
      } else if (error.message.includes('already cancelled')) {
        userFriendlyMessage = 'Esta reservación ya ha sido cancelada.';
      } else if (error.message.includes('too late')) {
        userFriendlyMessage = 'Ya es muy tarde para cancelar esta reservación.';
      } else if (error.message.includes('permission')) {
        userFriendlyMessage = 'No tienes permisos para cancelar esta reservación.';
      }
      
      return { error: `${userFriendlyMessage} (${error.message})` };
    }

    console.log('cancel_reservation result:', data);

    // Verificar si la función retornó un resultado de éxito
    if (data && typeof data === 'object' && 'success' in data && !data.success) {
      return { error: data.message || 'Error desconocido al cancelar la reservación.' };
    }

    // Revalidar la ruta para que la tabla se actualice
    revalidatePath('/dashboard/reservations');
    return { 
      success: true, 
      message: 'Reservación cancelada exitosamente. Los créditos han sido devueltos al usuario.' 
    };

  } catch (e: any) {
    console.error('Unexpected error cancelling reservation:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
}

export async function updateReservationBikes(
  reservationId: string,
  newBikeStaticBikeIds: number[]
) {
  console.log('Server Action: updateReservationBikes');
  console.log('Reservation ID:', reservationId);
  console.log('New Static Bike IDs:', newBikeStaticBikeIds);

  try {
    const supabase = await createClient();

    // Validación básica
    if (!reservationId) {
      return { error: 'ID de reservación inválido.' };
    }

    // Validar que los números de bici sean válidos
    if (!Array.isArray(newBikeStaticBikeIds) || newBikeStaticBikeIds.some(id => !Number.isInteger(id) || id <= 0)) {
      return { error: 'Los números de bicicleta deben ser números enteros positivos.' };
    }

    // Primero necesitamos obtener la clase para mapear static_bike_ids a bike_ids
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservations')
      .select('class_id')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.error('Error fetching reservation:', reservationError);
      return { error: 'No se pudo obtener la información de la reservación.' };
    }

    const classId = reservationData.class_id;
    if (!classId) {
      return { error: 'La reservación no tiene una clase asociada.' };
    }

    // Obtener los bike_ids que corresponden a los static_bike_ids para esta clase
    const { data: classBikes, error: classBikesError } = await supabase
      .from('bikes')
      .select('id, static_bike_id')
      .eq('class_id', classId)
      .in('static_bike_id', newBikeStaticBikeIds);

    if (classBikesError) {
      console.error('Error fetching bikes for class:', classBikesError);
      return { error: 'Error al obtener las bicicletas de la clase.' };
    }

    // Verificar que todas las bicicletas solicitadas existen en esta clase
    const foundStaticIds = classBikes?.map(b => b.static_bike_id) || [];
    const missingBikes = newBikeStaticBikeIds.filter(id => !foundStaticIds.includes(id));
    
    if (missingBikes.length > 0) {
      return { error: `Las siguientes bicicletas no están disponibles en esta clase: ${missingBikes.join(', ')}` };
    }

    // Mapear a bike_ids para usar en la función modify_reservation
    const newBikeIds = classBikes?.map(b => b.id) || [];

    console.log('Mapped bike IDs:', newBikeIds);

    // Usar la función robusta modify_reservation que ya maneja todas las validaciones
    const { data, error } = await supabase.rpc('modify_reservation', {
      p_reservation_id: reservationId,
      p_new_bike_ids: newBikeIds
    });

    if (error) {
      console.error('Error calling modify_reservation:', error);
      // Proporcionar mensajes de error más específicos basados en el error
      let userFriendlyMessage = 'Error al modificar la reservación.';
      
      if (error.message.includes('double booking') || error.message.includes('already reserved')) {
        userFriendlyMessage = 'Una o más bicicletas ya están reservadas por otro usuario para esta clase.';
      } else if (error.message.includes('not found')) {
        userFriendlyMessage = 'No se encontró la reservación o algunas bicicletas especificadas.';
      } else if (error.message.includes('permission')) {
        userFriendlyMessage = 'No tienes permisos para modificar esta reservación.';
      }
      
      return { error: `${userFriendlyMessage} (${error.message})` };
    }

    console.log('modify_reservation result:', data);

    // Verificar si la función retornó un resultado de éxito
    if (data && typeof data === 'object' && 'success' in data && !data.success) {
      return { error: data.message || 'Error desconocido al modificar la reservación.' };
    }

    revalidatePath('/dashboard/reservations');
    return { 
      success: true, 
      message: `Bicicletas actualizadas exitosamente. Nuevas bicicletas: ${newBikeStaticBikeIds.join(', ')}` 
    };

  } catch (e: any) {
    console.error('Unexpected error updating reservation bikes:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
}

// Función para obtener bicicletas disponibles para una clase específica
export async function getAvailableBikes(classId: string, excludeReservationId?: string) {
  const cookieStore = cookies();
  const supabase = await createClient();

  if (!classId) {
    return { error: 'ID de clase inválido.' };
  }

  try {
    // Obtener todas las bicicletas de la clase
    const { data: allBikes, error: bikesError } = await supabase
      .from('bikes')
      .select('id, static_bike_id')
      .eq('class_id', classId)
      .order('static_bike_id', { ascending: true });

    if (bikesError) {
      console.error('Error fetching bikes:', bikesError);
      return { error: 'Error al obtener las bicicletas de la clase.' };
    }

    // Obtener bicicletas ya reservadas (excluyendo la reservación que estamos editando)
    let reservedBikesQuery = supabase
      .from('reservation_bikes')
      .select(`
        bike_id,
        reservations!inner(class_id, status)
      `)
      .eq('reservations.class_id', classId)
      .eq('reservations.status', 'confirmed');

    // Si estamos editando una reservación, excluir sus bicicletas de las "reservadas"
    if (excludeReservationId) {
      reservedBikesQuery = reservedBikesQuery.neq('reservation_id', excludeReservationId);
    }

    const { data: reservedBikes, error: reservedError } = await reservedBikesQuery;

    if (reservedError) {
      console.error('Error fetching reserved bikes:', reservedError);
      return { error: 'Error al obtener las bicicletas reservadas.' };
    }

    // Crear set de bike_ids reservados para comparación rápida
    const reservedBikeIds = new Set(reservedBikes?.map(rb => rb.bike_id) || []);

    // Filtrar bicicletas disponibles
    const availableBikes = allBikes?.filter(bike => !reservedBikeIds.has(bike.id)) || [];

    // También obtener las bicicletas actualmente asignadas a esta reservación (si estamos editando)
    let currentBikes: any[] = [];
    if (excludeReservationId) {
      const { data: currentReservationBikes, error: currentError } = await supabase
        .from('reservation_bikes')
        .select(`
          bikes(id, static_bike_id)
        `)
        .eq('reservation_id', excludeReservationId);

      if (!currentError && currentReservationBikes) {
        currentBikes = currentReservationBikes
          .map(rb => rb.bikes)
          .filter(bike => bike !== null);
      }
    }

    return {
      success: true,
      availableBikes: availableBikes,
      currentBikes: currentBikes
    };

  } catch (e: any) {
    console.error('Unexpected error getting available bikes:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
} 