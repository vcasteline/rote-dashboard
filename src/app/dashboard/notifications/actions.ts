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

    // Enviar a Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      throw new Error(`Expo API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Expo push result:', result);

    // Registrar las notificaciones enviadas en la base de datos
    const notifications = pushTokens.map(token => ({
      user_id: token.user_id,
      title,
      body,
      sent: true,
    }));

    const { error: dbError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (dbError) {
      console.error('Error saving notifications to DB:', dbError);
      // No retornamos error aquí porque la notificación ya se envió
    }

    revalidatePath('/dashboard/notifications');
    return { message: `Notificaciones enviadas inmediatamente a ${pushTokens.length} usuarios` };
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