import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import NotificationsClient from './_components/NotificationsClient';
import { getNotificationStats } from './actions';

// Tipos para las notificaciones
export type NotificationData = {
  id: string;
  title: string;
  body: string;
  sent: boolean;
  created_at: string;
  user_id: string | null;
  users?: {
    name: string | null;
    email: string;
  } | null;
};

// Tipos para los usuarios con tokens push
export type UserWithToken = {
  user_id: string;
  expo_push_token: string;
  platform: string | null;
  device_name: string | null;
  last_used_at: string | null;
  is_active: boolean;
  users: {
    name: string | null;
    email: string;
  } | null;
};

// Tipos para estadísticas
export type NotificationStats = {
  activeUsers: number;
  sentToday: number;
  pending: number;
};

export default async function NotificationsPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  // Obtener notificaciones recientes (últimas 50) sin JOIN
  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('id, title, body, sent, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(50);

  // Obtener usuarios con tokens push activos sin JOIN
  const { data: usersWithTokens, error: usersError } = await supabase
    .from('user_push_tokens')
    .select('user_id, expo_push_token, platform, device_name, last_used_at, is_active')
    .eq('is_active', true)
    .order('last_used_at', { ascending: false });

  // Obtener estadísticas
  const stats = await getNotificationStats();

  if (notificationsError) {
    console.error('Error fetching notifications:', notificationsError);
  }

  if (usersError) {
    console.error('Error fetching users with tokens:', usersError);
  }

  // Obtener información de usuarios desde public.users
  let enrichedNotifications: NotificationData[] = [];
  let enrichedUsersWithTokens: UserWithToken[] = [];

  if (notifications && notifications.length > 0) {
    // Obtener user_ids únicos de las notificaciones
    const notificationUserIds = notifications
      .map(n => n.user_id)
      .filter((id): id is string => id !== null)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    if (notificationUserIds.length > 0) {
      const { data: notificationUsers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', notificationUserIds);

      // Crear mapa de usuarios para búsqueda rápida
      const userMap = new Map(notificationUsers?.map(u => [u.id, u]) || []);

      enrichedNotifications = notifications.map(notification => ({
        ...notification,
        users: notification.user_id ? userMap.get(notification.user_id) || null : null,
      }));
    } else {
      enrichedNotifications = notifications.map(notification => ({
        ...notification,
        users: null,
      }));
    }
  }

  if (usersWithTokens && usersWithTokens.length > 0) {
    // Obtener user_ids únicos de los tokens
    const tokenUserIds = usersWithTokens
      .map(t => t.user_id)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    const { data: tokenUsers } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', tokenUserIds);

    // Crear mapa de usuarios para búsqueda rápida
    const userMap = new Map(tokenUsers?.map(u => [u.id, u]) || []);

    enrichedUsersWithTokens = usersWithTokens.map(token => ({
      ...token,
      users: userMap.get(token.user_id) || null,
    }));
  }

  const notificationStats: NotificationStats = 'error' in stats ? 
    { activeUsers: 0, sentToday: 0, pending: 0 } : stats;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Notificaciones Push</h1>
      <NotificationsClient 
        initialNotifications={enrichedNotifications}
        usersWithTokens={enrichedUsersWithTokens}
        stats={notificationStats}
      />
    </div>
  );
} 