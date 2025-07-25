'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Esquema de validación para envío inmediato
const sendImmediateNotificationSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  body: z.string().min(1, 'El mensaje es requerido'),
  user_ids: z.array(z.string()).min(1, 'Selecciona al menos un usuario'),
});

// Acción para enviar notificación inmediata usando la API de Expo
export async function sendImmediateNotification(formData: FormData) {
  try {
    const supabase = createAdminClient();

    const sendTo = formData.get('send_to') as string;
    const userIdsString = formData.get('user_ids') as string;
    let userIds = userIdsString ? userIdsString.split(',').filter(id => id.trim()) : [];

    // Si se envía a todos, obtener todos los user_ids activos
    if (sendTo === 'all') {
      const { data: activeTokens, error: tokensError } = await supabase
        .from('user_push_tokens')
        .select('user_id')
        .eq('is_active', true);

      if (tokensError) {
        console.error('Error fetching active tokens:', tokensError);
        return { error: 'Error al obtener usuarios con tokens activos' };
      }

      if (!activeTokens || activeTokens.length === 0) {
        return { error: 'No hay usuarios con tokens push activos' };
      }

      userIds = activeTokens.map(token => token.user_id);
    }

    // Ahora validar con los user_ids correctos
    const validatedFields = sendImmediateNotificationSchema.safeParse({
      title: formData.get('title'),
      body: formData.get('body'),
      user_ids: userIds,
    });

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      return { 
        error: `Errores de validación: ${Object.values(errors).flat().join(', ')}`,
        fieldErrors: errors
      };
    }

    const { title, body, user_ids } = validatedFields.data;

    // Obtener tokens push de los usuarios seleccionados
    const { data: pushTokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token, user_id')
      .in('user_id', user_ids)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return { error: 'Error al obtener tokens push' };
    }

    if (!pushTokens || pushTokens.length === 0) {
      return { error: 'No se encontraron tokens push activos para los usuarios seleccionados' };
    }

    // Preparar mensajes para Expo
    const messages = pushTokens.map(token => ({
      to: token.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { timestamp: new Date().toISOString() },
    }));

    console.log(`Total messages to send: ${messages.length}`);

    // Dividir en lotes de máximo 100 (límite de Expo)
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE));
    }

    console.log(`Divided into ${batches.length} batches`);

    // Enviar cada lote por separado
    let totalSuccessCount = 0;
    let totalErrorCount = 0;
    const allErrors: string[] = [];
    const allResults: any[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Sending batch ${batchIndex + 1}/${batches.length} with ${batch.length} messages`);

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        const batchResult = await response.json();
        console.log(`Batch ${batchIndex + 1} result:`, batchResult);

        // Procesar resultados del lote
        if (batchResult.data && Array.isArray(batchResult.data)) {
          batchResult.data.forEach((item: any, itemIndex: number) => {
            const globalIndex = batchIndex * BATCH_SIZE + itemIndex;
            if (item.status === 'ok') {
              totalSuccessCount++;
            } else if (item.status === 'error') {
              totalErrorCount++;
              allErrors.push(`Token ${globalIndex + 1}: ${item.message || 'Error desconocido'}`);
            }
          });
          // Guardar resultados para procesar después
          allResults.push(...batchResult.data);
        } else if (batchResult.errors && Array.isArray(batchResult.errors)) {
          // Si el lote completo falló
          console.error(`Batch ${batchIndex + 1} failed completely:`, batchResult.errors);
          totalErrorCount += batch.length;
          batchResult.errors.forEach((error: any) => {
            allErrors.push(`Batch ${batchIndex + 1}: ${error.message || 'Error desconocido'}`);
          });
        }

        // Pequeña pausa entre lotes para no sobrecargar la API
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError: any) {
        console.error(`Error sending batch ${batchIndex + 1}:`, batchError);
        totalErrorCount += batch.length;
        allErrors.push(`Batch ${batchIndex + 1}: ${batchError.message}`);
      }
    }

    console.log(`Final results: ${totalSuccessCount} successful, ${totalErrorCount} failed, total ${messages.length}`);

    // Si no hay resultados exitosos y hay errores, lanzar excepción
    if (totalSuccessCount === 0 && totalErrorCount > 0) {
      const errorMessage = allErrors.length > 0 
        ? `Todas las notificaciones fallaron: ${allErrors.slice(0, 5).join(', ')}${allErrors.length > 5 ? '...' : ''}`
        : 'Error al enviar todas las notificaciones';
      throw new Error(errorMessage);
    }

    // Usar las variables globales en lugar de las locales
    const successCount = totalSuccessCount;
    const errorCount = totalErrorCount;
    const errors = allErrors;

    // Solo registrar en BD si es envío específico (no broadcast masivo)
    if (sendTo === 'specific') {
      const successfulNotifications: any[] = [];
      
      if (allResults && Array.isArray(allResults)) {
        allResults.forEach((item: any, index: number) => {
          if (item.status === 'ok' && pushTokens[index]) {
            successfulNotifications.push({
              user_id: pushTokens[index].user_id,
              title,
              body,
              sent: true,
            });
          }
        });
      }

      if (successfulNotifications.length > 0) {
        const { error: dbError } = await supabase
          .from('notifications')
          .insert(successfulNotifications);

        if (dbError) {
          console.error('Error saving notifications to DB:', dbError);
          // No retornamos error aquí porque la notificación ya se envió
        }
      }
    } else {
      // Para broadcasts masivos, solo loggear (no guardar en BD)
      console.log(`Broadcast notification sent - Title: "${title}", Recipients: ${successCount} successful, ${errorCount} failed`);
    }

    revalidatePath('/dashboard/notifications');
    
    // Mensaje informativo basado en los resultados
    let message = '';
    const broadcastNote = sendTo === 'all' ? ' (broadcast masivo - no guardado en historial)' : '';
    
    if (successCount === pushTokens.length) {
      message = `Notificaciones enviadas exitosamente a ${successCount} usuarios${broadcastNote}`;
    } else if (successCount > 0) {
      message = `Notificaciones enviadas parcialmente: ${successCount} exitosas, ${errorCount} fallidas de ${pushTokens.length} total${broadcastNote}`;
      if (errors.length > 0) {
        message += `. Errores: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`;
      }
    }
    
    console.log(`Notification summary: ${successCount} successful, ${errorCount} failed, total ${pushTokens.length}`);
    
    return { message };
  } catch (error: any) {
    console.error('Error sending immediate notification:', error);
    return { error: `Error al enviar notificación: ${error.message}` };
  }
}

// Acción para obtener estadísticas de notificaciones
export async function getNotificationStats() {
  // Usamos el cliente de administrador para evitar restricciones de RLS y obtener todos los registros
  const supabase = createAdminClient();

  try {
    // Obtener usuarios con tokens push activos
    const { data: activeTokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('user_id')
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching active tokens:', tokensError);
      return { error: 'Error al obtener estadísticas' };
    }

    // Obtener total de notificaciones enviadas hoy
    const today = new Date().toISOString().split('T')[0];
    const { data: todayNotifications, error: todayError } = await supabase
      .from('notifications')
      .select('id')
      .eq('sent', true)
      .gte('created_at', today);

    if (todayError) {
      console.error('Error fetching today notifications:', todayError);
      return { error: 'Error al obtener notificaciones de hoy' };
    }

    // Obtener notificaciones pendientes
    const { data: pendingNotifications, error: pendingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('sent', false);

    if (pendingError) {
      console.error('Error fetching pending notifications:', pendingError);
      return { error: 'Error al obtener notificaciones pendientes' };
    }

    // Contamos usuarios únicos, ya que un mismo usuario puede tener varios tokens
    const uniqueActiveUserIds = new Set((activeTokens || []).map(t => t.user_id));

    return {
      activeUsers: uniqueActiveUserIds.size,
      sentToday: todayNotifications?.length || 0,
      pending: pendingNotifications?.length || 0,
    };
  } catch (error: any) {
    console.error('Unexpected error getting stats:', error);
    return { error: `Error inesperado: ${error.message}` };
  }
} 