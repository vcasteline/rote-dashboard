'use client';

import { useState, useTransition, useMemo } from 'react';
import { type NotificationData, type UserWithToken, type NotificationStats } from '../page';
import { sendImmediateNotification } from '../actions';
import { formatDate, toEcuadorDateTime } from '@/lib/utils/dateUtils';
import { Users, Clock, Bell } from 'lucide-react';

interface NotificationsClientProps {
  initialNotifications: NotificationData[];
  usersWithTokens: UserWithToken[];
  stats: NotificationStats;
}

// Componente para las estadísticas
function StatsCards({ stats }: { stats: NotificationStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-full">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-full">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Enviadas Hoy</p>
            <p className="text-2xl font-bold text-gray-900">{stats.sentToday}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 rounded-full">
            <Bell className="w-6 h-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para crear nuevas notificaciones
function CreateNotificationForm({ 
  usersWithTokens,
  onSuccess,
}: { 
  usersWithTokens: UserWithToken[];
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sendTo, setSendTo] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchUser, setSearchUser] = useState('');

  // Eliminar usuarios duplicados (mismo user_id) para evitar claves repetidas
  const uniqueUsersWithTokens = useMemo(() => {
    const map = new Map<string, UserWithToken>();
    usersWithTokens.forEach(u => {
      if (!map.has(u.user_id)) {
        map.set(u.user_id, u);
      }
    });
    return Array.from(map.values());
  }, [usersWithTokens]);

  // Filtrar usuarios basado en la búsqueda sobre la lista sin duplicados
  const filteredUsers = uniqueUsersWithTokens.filter(user => {
    if (!searchUser) return true;
    
    const userName = user.users?.name?.toLowerCase() || '';
    const userEmail = user.users?.email?.toLowerCase() || '';
    const searchTerm = searchUser.toLowerCase();
    
    return userName.includes(searchTerm) || userEmail.includes(searchTerm);
  });

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setMessage('');
    setError('');

    // Agregar usuarios seleccionados al formData
    if (sendTo === 'specific') {
      formData.set('user_ids', selectedUsers.join(','));
    }
    formData.set('send_to', sendTo);

    try {
      const result = await sendImmediateNotification(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || 'Notificación enviada exitosamente');
        onSuccess();
        setTimeout(() => {
          setMessage('');
        }, 3000);
      }
    } catch (err: any) {
      setError(`Error inesperado: ${err.message}`);
    }

    setIsSubmitting(false);
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Enviar Notificación Push</h2>
      
      <form action={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] text-gray-900 bg-white"
            placeholder="Ej: Nueva clase disponible"
          />
        </div>

        {/* Mensaje */}
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje
          </label>
          <textarea
            id="body"
            name="body"
            required
            maxLength={300}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] text-gray-900 bg-white"
            placeholder="Ej: Se ha abierto una nueva clase para mañana a las 7:00 PM"
          />
        </div>

        {/* Destinatarios */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Enviar a:</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={sendTo === 'all'}
                onChange={(e) => setSendTo(e.target.value as 'all')}
                className="mr-2"
              />
              <span className="text-sm text-gray-900">Todos los usuarios activos ({uniqueUsersWithTokens.length})</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="specific"
                checked={sendTo === 'specific'}
                onChange={(e) => setSendTo(e.target.value as 'specific')}
                className="mr-2"
              />
              <span className="text-sm text-gray-900">Usuarios específicos</span>
            </label>
          </div>
          
          {/* Nota informativa */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs text-blue-700">
                  <strong>Nota:</strong> Los envíos masivos (todos los usuarios) no se guardan en el historial para mantener la base de datos optimizada. Solo las notificaciones específicas aparecen en el historial.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de usuarios específicos */}
        {sendTo === 'specific' && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                Selecciona usuarios ({selectedUsers.length} seleccionados)
              </p>
              {filteredUsers.length !== uniqueUsersWithTokens.length && (
                <span className="text-xs text-gray-500">
                  {filteredUsers.length} de {uniqueUsersWithTokens.length} usuarios
                </span>
              )}
            </div>
            
            {/* Search bar */}
            <div className="mb-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] text-gray-900 bg-white"
                />
                {searchUser && (
                  <button
                    type="button"
                    onClick={() => setSearchUser('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Lista de usuarios con scroll */}
            <div className="bg-white border border-gray-200 rounded-md max-h-80 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <label key={user.user_id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.user_id)}
                        onChange={(e) => handleUserSelection(user.user_id, e.target.checked)}
                        className="mr-3 h-4 w-4 text-[#D7BAF6] focus:ring-[#D7BAF6] border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.users?.name || user.users?.email || 'Usuario sin nombre'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.users?.email}
                            </p>
                          </div>
                          {/* <div className="ml-2 flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {user.platform || 'Unknown'}
                            </span>
                          </div> */}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchUser ? 'Intenta con otro término de búsqueda' : 'No hay usuarios disponibles'}
                  </p>
                </div>
              )}
            </div>

            {/* Botones de selección rápida */}
            {filteredUsers.length > 0 && (
              <div className="mt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const allFilteredIds = filteredUsers.map(u => u.user_id);
                    setSelectedUsers(prev => {
                      const newSelection = [...prev];
                      allFilteredIds.forEach(id => {
                        if (!newSelection.includes(id)) {
                          newSelection.push(id);
                        }
                      });
                      return newSelection;
                    });
                  }}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  Seleccionar visibles
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allFilteredIds = filteredUsers.map(u => u.user_id);
                    setSelectedUsers(prev => prev.filter(id => !allFilteredIds.includes(id)));
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Deseleccionar visibles
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || (sendTo === 'specific' && selectedUsers.length === 0)}
            className="px-6 py-2 bg-[#D7BAF6] text-black rounded-md hover:bg-[#8B7EE6] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </>
            ) : (
              'Enviar Notificación'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componente para el historial de notificaciones
function NotificationHistory({ notifications }: { notifications: NotificationData[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Historial de Notificaciones</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mensaje
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {notification.body}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {notification.users?.name || notification.users?.email || 'Usuario eliminado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      notification.sent 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {notification.sent ? 'Enviada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(toEcuadorDateTime(notification.created_at))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V7h5v10z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No hay notificaciones</h3>
                    <p className="text-sm text-gray-500">Crea tu primera notificación usando el formulario de arriba.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente principal
export default function NotificationsClient({
  initialNotifications,
  usersWithTokens,
  stats,
}: NotificationsClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleSuccess = () => {
    startTransition(() => {
      // La página se revalidará automáticamente
      window.location.reload();
    });
  };

  return (
    <div>
      <StatsCards stats={stats} />
      
      <CreateNotificationForm 
        usersWithTokens={usersWithTokens}
        onSuccess={handleSuccess}
      />
      
      <NotificationHistory notifications={initialNotifications} />
    </div>
  );
} 