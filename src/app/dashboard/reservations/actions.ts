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
  console.log('New Bike Numbers:', newBikeNumbers);

  try {
    const supabase = createAdminClient();

    // Validación básica
    if (!reservationId) {
      return { error: 'ID de reservación inválido.' };
    }

    // Validar que los números de bici sean válidos
    if (!Array.isArray(newBikeNumbers) || newBikeNumbers.some(id => !Number.isInteger(id) || id <= 0)) {
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

    // Primero convertir números físicos a static_bike_ids
    const { data: staticBikesData, error: staticBikesError } = await supabase
      .from('static_bikes')
      .select('id, number')
      .in('number', newBikeNumbers);

    if (staticBikesError) {
      console.error('Error fetching static bikes:', staticBikesError);
      return { error: 'Error al obtener información de bicicletas.' };
    }

    if (!staticBikesData || staticBikesData.length !== newBikeNumbers.length) {
      const foundNumbers = staticBikesData?.map(sb => sb.number) || [];
      const missingNumbers = newBikeNumbers.filter(num => !foundNumbers.includes(num));
      return { error: `Los siguientes números de bicicleta no existen: ${missingNumbers.join(', ')}` };
    }

    // Obtener los static_bike_ids correspondientes
    const newBikeStaticBikeIds = staticBikesData.map(sb => sb.id);

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
    const missingStaticBikeIds = newBikeStaticBikeIds.filter(id => !foundStaticIds.includes(id));
    
    if (missingStaticBikeIds.length > 0) {
      // Convertir los static_bike_ids faltantes a números para el mensaje de error
      const { data: missingStaticBikes } = await supabase
        .from('static_bikes')
        .select('number')
        .in('id', missingStaticBikeIds);
      
      const missingNumbers = missingStaticBikes?.map(sb => sb.number) || missingStaticBikeIds;
      return { error: `Las siguientes bicicletas no están disponibles en esta clase: ${missingNumbers.join(', ')}` };
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
      message: `Bicicletas actualizadas exitosamente. Nuevas bicicletas: ${newBikeNumbers.join(', ')}` 
    };

  } catch (e: any) {
    console.error('Unexpected error updating reservation bikes:', e);
    return { error: `Error inesperado: ${e.message}` };
  }
}

// Función para obtener bicicletas disponibles para una clase específica
export async function getAvailableBikes(classId: string, excludeReservationId?: string) {
  const supabase = createAdminClient();

  if (!classId) {
    return { error: 'ID de clase inválido.' };
  }

  try {
    // Obtener todas las bicicletas de la clase con el número real de static_bikes
    const { data: allBikes, error: bikesError } = await supabase
      .from('bikes')
      .select(`
        id, 
        static_bike_id,
        static_bikes!inner(number)
      `)
      .eq('class_id', classId);

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

    // Filtrar bicicletas disponibles y ordenar por número físico
    const availableBikes = allBikes
      ?.filter(bike => !reservedBikeIds.has(bike.id))
      .sort((a, b) => {
        const aNum = (((a as any)?.static_bikes as any)?.number ?? 0) as number;
        const bNum = (((b as any)?.static_bikes as any)?.number ?? 0) as number;
        return aNum - bNum;
      }) || [];

    // También obtener las bicicletas actualmente asignadas a esta reservación (si estamos editando)
    let currentBikes: any[] = [];
    if (excludeReservationId) {
      const { data: currentReservationBikes, error: currentError } = await supabase
        .from('reservation_bikes')
        .select(`
          bikes(id, static_bike_id, static_bikes!inner(number))
        `)
        .eq('reservation_id', excludeReservationId);

      if (!currentError && currentReservationBikes) {
        currentBikes = currentReservationBikes
          .map(rb => (rb as any).bikes)
          .filter(bike => bike !== null)
          .sort((a, b) => {
            const aNum = ((((a as any))?.static_bikes as any)?.number ?? 0) as number;
            const bNum = ((((b as any))?.static_bikes as any)?.number ?? 0) as number;
            return aNum - bNum;
          });
      }
    }

    return {
      success: true,
      availableBikes: availableBikes.map(bike => ({
        id: bike.id, // Mantener el ID para operaciones internas
        static_bike_id: bike.static_bike_id, // ID de la tabla static_bikes
        number: (bike.static_bikes as any)?.number || 0, // Número físico real de la bicicleta
        displayNumber: (bike.static_bikes as any)?.number || 0 // Alias claro para el número a mostrar
      })),
      currentBikes: currentBikes.map(bike => ({
        id: bike.id,
        static_bike_id: bike.static_bike_id,
        number: (bike.static_bikes as any)?.number || 0,
        displayNumber: (bike.static_bikes as any)?.number || 0
      }))
    };

  } catch (e: any) {
    console.error('Unexpected error getting available bikes:', e);
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
        instructors ( name )
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
      // Obtener total de bicicletas para esta clase
      const { data: totalBikes, error: bikesError } = await supabase
        .from('bikes')
        .select('id')
        .eq('class_id', cls.id);

      if (bikesError) {
        console.error('Error fetching bikes for class:', cls.id, bikesError);
        continue;
      }

      // Obtener bicicletas ya reservadas para esta clase
      const { data: reservedBikes, error: reservedError } = await supabase
        .from('reservation_bikes')
        .select(`
          bike_id,
          reservations!inner(status)
        `)
        .eq('reservations.status', 'confirmed');

      if (reservedError) {
        console.error('Error fetching reserved bikes for class:', cls.id, reservedError);
        continue;
      }

      // Filtrar solo las bicicletas reservadas de esta clase específica
      const reservedBikeIds = new Set(
        reservedBikes?.filter(rb => {
          // Verificar si la bicicleta pertenece a esta clase
          return totalBikes?.some(tb => tb.id === rb.bike_id);
        }).map(rb => rb.bike_id) || []
      );

      const totalSpots = totalBikes?.length || 0;
      const reservedSpots = reservedBikeIds.size;
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
          availableSpots
        });
      }
    }

    return { success: true, classes: classesWithSpots };
  } catch (error: any) {
    console.error('Error in getAvailableClasses:', error);
    return { success: false, error: `Error inesperado: ${error.message}` };
  }
}

// Nueva función para crear una reserva
export async function createReservation(data: {
  user_id: string;
  class_id: string;
  bike_numbers: number[]; // Ahora recibe números físicos reales
  purchase_id?: string;
  credits_to_use?: number;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = createAdminClient();

  try {
    // Validaciones básicas
    if (!data.user_id || !data.class_id || !data.bike_numbers || data.bike_numbers.length === 0) {
      return { success: false, error: 'Faltan datos requeridos' };
    }

    // Primero convertir números físicos a static_bike_ids
    const { data: staticBikesData, error: staticBikesError } = await supabase
      .from('static_bikes')
      .select('id, number')
      .in('number', data.bike_numbers);

    if (staticBikesError) {
      console.error('Error fetching static bikes:', staticBikesError);
      return { success: false, error: 'Error al obtener información de bicicletas' };
    }

    if (!staticBikesData || staticBikesData.length !== data.bike_numbers.length) {
      const foundNumbers = staticBikesData?.map(sb => sb.number) || [];
      const missingNumbers = data.bike_numbers.filter(num => !foundNumbers.includes(num));
      return { success: false, error: `Los siguientes números de bicicleta no existen: ${missingNumbers.join(', ')}` };
    }

    // Obtener los static_bike_ids correspondientes
    const bikeStaticIds = staticBikesData.map(sb => sb.id);

    // Obtener los bike_ids correspondientes a los static_bike_ids para esta clase
    const { data: classBikes, error: bikesError } = await supabase
      .from('bikes')
      .select('id, static_bike_id')
      .eq('class_id', data.class_id)
      .in('static_bike_id', bikeStaticIds);

    if (bikesError) {
      console.error('Error fetching bikes for class:', bikesError);
      return { success: false, error: 'Error al obtener bicicletas de la clase' };
    }

    if (!classBikes || classBikes.length !== data.bike_numbers.length) {
      const foundIds = classBikes?.map(b => b.static_bike_id) || [];
      const missingStaticIds = bikeStaticIds.filter(id => !foundIds.includes(id));
      
      // Convertir los static_bike_ids faltantes a números para el mensaje de error
      const { data: missingStaticBikes } = await supabase
        .from('static_bikes')
        .select('number')
        .in('id', missingStaticIds);
      
      const missingNumbers = missingStaticBikes?.map(sb => sb.number) || missingStaticIds;
      return { success: false, error: `Bicicletas no encontradas en esta clase: ${missingNumbers.join(', ')}` };
    }

    // Mapear a bike_ids
    const bikeIds = classBikes.map(b => b.id);

    console.log('Creating reservation with data:', {
      user_id: data.user_id,
      class_id: data.class_id,
      bike_ids: bikeIds,
      purchase_id: data.purchase_id,
      credits_to_use: data.credits_to_use
    });

    // Usar la función make_reservation de Supabase
    let rpcParams;
    if (data.purchase_id && data.credits_to_use) {
      rpcParams = {
        p_user_id: data.user_id,
        p_class_id: data.class_id,
        p_bike_ids: bikeIds,
        p_purchase_id: data.purchase_id,
        p_credits_to_use: data.credits_to_use
      };
    } else {
      rpcParams = {
        p_user_id: data.user_id,
        p_class_id: data.class_id,
        p_bike_ids: bikeIds
      };
    }

    const { data: result, error: rpcError } = await supabase.rpc('make_reservation', rpcParams);

    if (rpcError) {
      console.error('Error calling make_reservation:', rpcError);
      
      // Proporcionar mensajes de error más específicos
      let userFriendlyMessage = 'Error al crear la reservación.';
      
      if (rpcError.message.includes('insufficient credits')) {
        userFriendlyMessage = 'El usuario no tiene suficientes créditos para esta reservación.';
      } else if (rpcError.message.includes('already reserved') || rpcError.message.includes('double booking')) {
        userFriendlyMessage = 'Una o más bicicletas ya están reservadas para esta clase.';
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