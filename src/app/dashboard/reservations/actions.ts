'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { toISOString, getNowInEcuador } from '@/lib/utils/dateUtils';

// Interfaces para tipos de datos
export interface UserWithCredits {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  activeCredits: number;
  activePurchases: Array<{
    id: string;
    credits_remaining: number;
    expiration_date: string | null;
    package_name: string;
  }>;
}

export interface AvailableClass {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  name: string | null;
  instructor_name: string | null;
  availableSpots: number;
  location_id: string | null;
  location_name: string | null;
}

// Acción para cancelar una reservación usando la función robusta de la base de datos
export async function cancelReservation(reservationId: string) {
  const supabase = createAdminClient();

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
  newBikeNumbers: number[] // Ahora recibe números físicos reales
) {
  console.log('Server Action: updateReservationBikes');
  console.log('Reservation ID:', reservationId);
  console.log('New Spot Numbers:', newBikeNumbers);

  try {
    const supabase = createAdminClient();

    // Validación básica
    if (!reservationId) {
      return { error: 'ID de reservación inválido.' };
    }

    // Validar que los números de bici sean válidos
    if (!Array.isArray(newBikeNumbers) || newBikeNumbers.some(id => !Number.isInteger(id) || id <= 0)) {
      return { error: 'Los números de spot deben ser números enteros positivos.' };
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

    // Validar que los números de spot sean válidos
    if (!Array.isArray(newBikeNumbers) || newBikeNumbers.length === 0) {
      return { error: 'Debes seleccionar al menos un spot.' };
    }

    // Obtener los spot_ids que corresponden a los números de spot para esta clase
    const { data: classSpots, error: classSpotsError } = await supabase
      .from('class_spots')
      .select('id, spot_number')
      .eq('class_id', classId)
      .in('spot_number', newBikeNumbers);

    if (classSpotsError) {
      console.error('Error fetching spots for class:', classSpotsError);
      return { error: 'Error al obtener los spots de la clase.' };
    }

    // Verificar que todos los spots solicitados existen en esta clase
    const foundSpotNumbers = classSpots?.map(cs => cs.spot_number) || [];
    const missingSpotNumbers = newBikeNumbers.filter(num => !foundSpotNumbers.includes(num));
    
    if (missingSpotNumbers.length > 0) {
      return { error: `Los siguientes spots no están disponibles en esta clase: ${missingSpotNumbers.join(', ')}` };
    }

    // Mapear a spot_ids
    const newSpotIds = classSpots?.map(cs => cs.id) || [];

    console.log('Mapped spot IDs:', newSpotIds);

    // Verificar que los nuevos spots no estén ya reservados por otra reservación
    const { data: reservedSpots, error: reservedError } = await supabase
      .from('reservation_spots')
      .select(`
        spot_id,
        reservation_id,
        reservations!inner(status)
      `)
      .in('spot_id', newSpotIds)
      .neq('reservation_id', reservationId)
      .eq('reservations.status', 'confirmed');

    if (reservedError) {
      console.error('Error checking reserved spots:', reservedError);
      return { error: 'Error al verificar disponibilidad de spots.' };
    }

    if (reservedSpots && reservedSpots.length > 0) {
      return { error: 'Uno o más spots ya están reservados por otro usuario.' };
    }

    // Obtener información de la reservación actual para manejar créditos
    const { data: currentReservation, error: currentResError } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('id', reservationId)
      .single();

    if (currentResError || !currentReservation) {
      return { error: 'No se encontró la reservación.' };
    }

    // Obtener cantidad actual de spots
    const { data: currentSpots, error: currentSpotsError } = await supabase
      .from('reservation_spots')
      .select('id')
      .eq('reservation_id', reservationId);

    if (currentSpotsError) {
      console.error('Error fetching current spots:', currentSpotsError);
      return { error: 'Error al obtener los spots actuales.' };
    }

    const currentSpotCount = currentSpots?.length || 0;
    const newSpotCount = newSpotIds.length;
    const spotDifference = newSpotCount - currentSpotCount;

    // Eliminar spots actuales
    const { error: deleteError } = await supabase
      .from('reservation_spots')
      .delete()
      .eq('reservation_id', reservationId);

    if (deleteError) {
      console.error('Error deleting current spots:', deleteError);
      return { error: 'Error al eliminar los spots actuales.' };
    }

    // Insertar nuevos spots
    const newReservationSpots = newSpotIds.map(spotId => ({
      reservation_id: reservationId,
      spot_id: spotId
    }));

    const { error: insertError } = await supabase
      .from('reservation_spots')
      .insert(newReservationSpots);

    if (insertError) {
      console.error('Error inserting new spots:', insertError);
      return { error: 'Error al asignar los nuevos spots.' };
    }

    // Si cambió la cantidad de spots, ajustar créditos
    if (spotDifference !== 0) {
      // Obtener créditos usados actualmente
      const { data: currentCredits, error: creditsError } = await supabase
        .from('reservation_credits')
        .select('id, purchase_id, credits_used')
        .eq('reservation_id', reservationId);

      if (!creditsError && currentCredits) {
        // Si se redujeron spots, devolver créditos
        if (spotDifference < 0) {
          const creditsToRefund = Math.abs(spotDifference);
          let remainingToRefund = creditsToRefund;
          
          for (const credit of currentCredits) {
            if (remainingToRefund <= 0) break;
            
            const refundAmount = Math.min(remainingToRefund, credit.credits_used);
            
            // Obtener créditos actuales para actualizar
            const { data: purchaseData } = await supabase
              .from('purchases')
              .select('credits_remaining')
              .eq('id', credit.purchase_id)
              .single();
            
            if (purchaseData) {
              await supabase
                .from('purchases')
                .update({ credits_remaining: purchaseData.credits_remaining + refundAmount })
                .eq('id', credit.purchase_id);
              
              await supabase
                .from('reservation_credits')
                .update({ credits_used: credit.credits_used - refundAmount })
                .eq('id', credit.id);
            }
            
            remainingToRefund -= refundAmount;
          }
        } else {
          // Si se aumentaron spots, consumir más créditos (similar a make_reservation)
          // Por ahora, solo logueamos - esto podría requerir lógica más compleja
          console.log(`Reservation needs ${spotDifference} more credits`);
        }
      }
    }

    revalidatePath('/dashboard/reservations');
    return { 
      success: true, 
      message: `Spots actualizados exitosamente. Nuevos spots: ${newBikeNumbers.join(', ')}` 
    };

  } catch (e: any) {
    console.error('Unexpected error updating reservation bikes:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
}

// Función para obtener spots disponibles para una clase específica
export async function getAvailableBikes(classId: string, excludeReservationId?: string) {
  const supabase = createAdminClient();

  if (!classId) {
    return { error: 'ID de clase inválido.' };
  }

  try {
    // Obtener todos los spots de la clase
    const { data: allSpots, error: spotsError } = await supabase
      .from('class_spots')
      .select(`
        id, 
        spot_number,
        label
      `)
      .eq('class_id', classId);

    if (spotsError) {
      console.error('Error fetching spots:', spotsError);
      return { error: 'Error al obtener los spots de la clase.' };
    }

    // Obtener spots ya reservados (excluyendo la reservación que estamos editando)
    let reservedSpotsQuery = supabase
      .from('reservation_spots')
      .select(`
        spot_id,
        reservations!inner(class_id, status)
      `)
      .eq('reservations.class_id', classId)
      .eq('reservations.status', 'confirmed');

    // Si estamos editando una reservación, excluir sus spots de los "reservados"
    if (excludeReservationId) {
      reservedSpotsQuery = reservedSpotsQuery.neq('reservation_id', excludeReservationId);
    }

    const { data: reservedSpots, error: reservedError } = await reservedSpotsQuery;

    if (reservedError) {
      console.error('Error fetching reserved spots:', reservedError);
      return { error: 'Error al obtener los spots reservados.' };
    }

    // Crear set de spot_ids reservados para comparación rápida
    const reservedSpotIds = new Set(reservedSpots?.map(rs => rs.spot_id) || []);

    // Filtrar spots disponibles y ordenar por número
    const availableSpots = allSpots
      ?.filter(spot => !reservedSpotIds.has(spot.id))
      .sort((a, b) => {
        const aNum = a.spot_number ?? 0;
        const bNum = b.spot_number ?? 0;
        return aNum - bNum;
      }) || [];

    // También obtener los spots actualmente asignados a esta reservación (si estamos editando)
    let currentSpots: any[] = [];
    if (excludeReservationId) {
      const { data: currentReservationSpots, error: currentError } = await supabase
        .from('reservation_spots')
        .select(`
          class_spots(id, spot_number, label)
        `)
        .eq('reservation_id', excludeReservationId);

      if (!currentError && currentReservationSpots) {
        currentSpots = currentReservationSpots
          .map(rs => (rs as any).class_spots)
          .filter(spot => spot !== null)
          .sort((a, b) => {
            const aNum = a.spot_number ?? 0;
            const bNum = b.spot_number ?? 0;
            return aNum - bNum;
          });
      }
    }

    return {
      success: true,
      availableBikes: availableSpots.map(spot => ({
        id: spot.id,
        static_bike_id: spot.id, // Mantener compatibilidad con el código existente
        number: spot.spot_number || 0,
        displayNumber: spot.spot_number || 0
      })),
      currentBikes: currentSpots.map(spot => ({
        id: spot.id,
        static_bike_id: spot.id, // Mantener compatibilidad con el código existente
        number: spot.spot_number || 0,
        displayNumber: spot.spot_number || 0
      }))
    };

  } catch (e: any) {
    console.error('Unexpected error getting available spots:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
} 

// Nueva función para obtener usuarios con créditos disponibles
export async function getUsersWithCredits(): Promise<{ success: boolean; users?: UserWithCredits[]; error?: string }> {
  const supabase = createAdminClient();

  try {
    // Obtener todas las compras activas (con créditos > 0 y no vencidas)
    const today = new Date().toISOString();
    const { data: activePurchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        user_id,
        credits_remaining,
        expiration_date,
        packages ( name )
      `)
      .gt('credits_remaining', 0)
      .or(`expiration_date.is.null,expiration_date.gte.${today}`)
      .order('expiration_date', { ascending: true });

    if (purchasesError) {
      console.error('Error fetching active purchases:', purchasesError);
      return { success: false, error: 'Error al obtener compras activas' };
    }

    if (!activePurchases || activePurchases.length === 0) {
      return { success: true, users: [] };
    }

    // Obtener IDs únicos de usuarios
    const userIds = [...new Set(activePurchases.map(p => p.user_id))];

    // Obtener información de usuarios
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .in('id', userIds)
      .order('name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return { success: false, error: 'Error al obtener usuarios' };
    }

    // Combinar datos
    const usersWithCredits: UserWithCredits[] = users?.map(user => {
      const userPurchases = activePurchases.filter(p => p.user_id === user.id);
      const totalCredits = userPurchases.reduce((sum, p) => sum + p.credits_remaining, 0);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        activeCredits: totalCredits,
        activePurchases: userPurchases.map(p => ({
          id: p.id,
          credits_remaining: p.credits_remaining,
          expiration_date: p.expiration_date,
          package_name: (p.packages as any)?.name || 'Paquete sin nombre'
        }))
      };
    }) || [];

    // Filtrar solo usuarios con créditos > 0
    const filteredUsers = usersWithCredits.filter(u => u.activeCredits > 0);

    return { success: true, users: filteredUsers };
  } catch (error: any) {
    console.error('Error in getUsersWithCredits:', error);
    return { success: false, error: `Error inesperado: ${error.message}` };
  }
}

// Nueva función para obtener clases futuras disponibles
export async function getAvailableClasses(): Promise<{ success: boolean; classes?: AvailableClass[]; error?: string }> {
  const supabase = createAdminClient();

  try {
    // Obtener fecha y hora actual en Ecuador
    const nowInEcuador = getNowInEcuador();
    const todayInEcuador = toISOString(nowInEcuador).split('T')[0];
    const currentTimeInEcuador = nowInEcuador.toFormat('HH:mm:ss'); // HH:MM:SS

    // Obtener clases futuras no canceladas (incluyendo clases de hoy que aún no han comenzado)
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        date,
        start_time,
        end_time,
        name,
        location_id,
        instructors ( name ),
        locations ( name )
      `)
      .gte('date', todayInEcuador)
      .eq('is_cancelled', false)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return { success: false, error: 'Error al obtener clases' };
    }

    if (!classes || classes.length === 0) {
      return { success: true, classes: [] };
    }

    // Para cada clase, calcular spots disponibles
    const classesWithSpots: AvailableClass[] = [];

    for (const cls of classes) {
      // Si es una clase de hoy, verificar que aún no haya comenzado
      if (cls.date === todayInEcuador && cls.start_time <= currentTimeInEcuador) {
        continue; // Saltar clases de hoy que ya comenzaron
      }
      // Obtener total de spots para esta clase
      const { data: totalSpotsData, error: spotsError } = await supabase
        .from('class_spots')
        .select('id')
        .eq('class_id', cls.id);

      if (spotsError) {
        console.error('Error fetching spots for class:', cls.id, spotsError);
        continue;
      }

      // Obtener spots ya reservados para esta clase
      const { data: reservedSpotsData, error: reservedError } = await supabase
        .from('reservation_spots')
        .select(`
          spot_id,
          reservations!inner(class_id, status)
        `)
        .eq('reservations.class_id', cls.id)
        .eq('reservations.status', 'confirmed');

      if (reservedError) {
        console.error('Error fetching reserved spots for class:', cls.id, reservedError);
        continue;
      }

      // Filtrar solo los spots reservados de esta clase específica
      const reservedSpotIds = new Set(
        reservedSpotsData?.filter(rs => {
          // Verificar si el spot pertenece a esta clase
          return totalSpotsData?.some(ts => ts.id === rs.spot_id);
        }).map(rs => rs.spot_id) || []
      );

      const totalSpots = totalSpotsData?.length || 0;
      const reservedSpots = reservedSpotIds.size;
      const availableSpots = totalSpots - reservedSpots;

      // Solo incluir clases con spots disponibles
      if (availableSpots > 0) {
        classesWithSpots.push({
          id: cls.id,
          date: cls.date,
          start_time: cls.start_time,
          end_time: cls.end_time,
          name: cls.name,
          instructor_name: (cls.instructors as any)?.name || null,
          availableSpots,
          location_id: cls.location_id || null,
          location_name: (cls.locations as any)?.name || null,
        });
      }
    }

    return { success: true, classes: classesWithSpots };
  } catch (error: any) {
    console.error('Error in getAvailableClasses:', error);
    return { success: false, error: `Error inesperado: ${error.message}` };
  }
}

// Nueva función para obtener ubicaciones
export async function getLocations(): Promise<{ success: boolean; locations?: Array<{ id: string; name: string; address: string | null }>; error?: string }> {
  const supabase = createAdminClient();

  try {
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, address')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      return { success: false, error: 'Error al obtener ubicaciones' };
    }

    return { success: true, locations: locations || [] };
  } catch (error: any) {
    console.error('Error in getLocations:', error);
    return { success: false, error: `Error inesperado: ${error.message}` };
  }
}

// Nueva función para crear una reserva
export async function createReservation(data: {
  user_id: string;
  class_id: string;
  bike_numbers: number[]; // Números de spot
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = createAdminClient();

  try {
    // Validaciones básicas
    if (!data.user_id || !data.class_id || !data.bike_numbers || data.bike_numbers.length === 0) {
      return { success: false, error: 'Faltan datos requeridos' };
    }

    // Obtener los spot_ids correspondientes a los números de spot para esta clase
    const { data: classSpots, error: spotsError } = await supabase
      .from('class_spots')
      .select('id, spot_number')
      .eq('class_id', data.class_id)
      .in('spot_number', data.bike_numbers);

    if (spotsError) {
      console.error('Error fetching spots for class:', spotsError);
      return { success: false, error: 'Error al obtener spots de la clase' };
    }

    if (!classSpots || classSpots.length !== data.bike_numbers.length) {
      const foundNumbers = classSpots?.map(cs => cs.spot_number) || [];
      const missingNumbers = data.bike_numbers.filter(num => !foundNumbers.includes(num));
      return { success: false, error: `Spots no encontrados en esta clase: ${missingNumbers.join(', ')}` };
    }

    // Mapear a spot_ids
    const spotIds = classSpots.map(cs => cs.id);

    console.log('Creating reservation with data:', {
      user_id: data.user_id,
      class_id: data.class_id,
      spot_ids: spotIds
    });

    // Usar la función make_reservation de Supabase
    // La función espera: p_user_id, p_class_id, p_spot_ids
    // No acepta p_purchase_id ni p_credits_to_use - maneja créditos automáticamente
    const { data: result, error: rpcError } = await supabase.rpc('make_reservation', {
      p_user_id: data.user_id,
      p_class_id: data.class_id,
      p_spot_ids: spotIds
    });

    if (rpcError) {
      console.error('Error calling make_reservation:', rpcError);
      
      // Proporcionar mensajes de error más específicos
      let userFriendlyMessage = 'Error al crear la reservación.';
      
      if (rpcError.message.includes('insufficient credits')) {
        userFriendlyMessage = 'El usuario no tiene suficientes créditos para esta reservación.';
      } else if (rpcError.message.includes('already reserved') || rpcError.message.includes('double booking')) {
        userFriendlyMessage = 'Uno o más spots ya están reservados para esta clase.';
      } else if (rpcError.message.includes('expired')) {
        userFriendlyMessage = 'Los créditos del usuario han expirado.';
      } else if (rpcError.message.includes('class not found')) {
        userFriendlyMessage = 'La clase especificada no existe.';
      } else if (rpcError.message.includes('user not found')) {
        userFriendlyMessage = 'El usuario especificado no existe.';
      }
      
      return { success: false, error: `${userFriendlyMessage} (${rpcError.message})` };
    }

    console.log('make_reservation result:', result);

    // Verificar si la función retornó un resultado de éxito
    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      return { success: false, error: result.message || 'Error desconocido al crear la reservación.' };
    }

    // Revalidar la página para mostrar la nueva reservación
    revalidatePath('/dashboard/reservations');
    
    return { 
      success: true, 
      message: 'Reservación creada exitosamente' 
    };

  } catch (error: any) {
    console.error('Error in createReservation:', error);
    return { success: false, error: `Error inesperado: ${error.message}` };
  }
}

// Nueva función para salir de la lista de espera
export async function leaveWaitlist(userId: string, classId: string) {
  const supabase = createAdminClient();

  if (!userId || !classId) {
    return { error: 'Faltan datos requeridos: usuario y clase.' };
  }

  try {
    console.log('Removing user from waitlist:', { userId, classId });

    // Usar la función leave_waitlist de la base de datos
    const { data, error } = await supabase.rpc('leave_waitlist', {
      p_user_id: userId,
      p_class_id: classId
    });

    if (error) {
      console.error('Error calling leave_waitlist:', error);
      
      // Proporcionar mensajes de error más específicos
      let userFriendlyMessage = 'Error al salir de la lista de espera.';
      
      if (error.message.includes('No estás en la lista de espera')) {
        userFriendlyMessage = 'No estás en la lista de espera para esta clase.';
      }
      
      return { error: `${userFriendlyMessage} (${error.message})` };
    }

    console.log('leave_waitlist result:', data);

    // Verificar si la función retornó un resultado de éxito
    if (data && typeof data === 'object' && 'message' in data) {
      revalidatePath('/dashboard/reservations');
      return { 
        success: true, 
        message: data.message || 'Usuario removido de la lista de espera exitosamente.' 
      };
    }

    revalidatePath('/dashboard/reservations');
    return { 
      success: true, 
      message: 'Usuario removido de la lista de espera exitosamente.' 
    };

  } catch (e: any) {
    console.error('Unexpected error leaving waitlist:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
} 