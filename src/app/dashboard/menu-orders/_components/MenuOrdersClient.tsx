'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { updateOrderStatus, type MenuOrder } from '../actions';
import { Clock, CheckCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

const statusConfig = {
  pending: { 
    label: 'Pendiente', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    bgColor: 'bg-yellow-50'
  },
  ready: { 
    label: 'Listo', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    bgColor: 'bg-green-50'
  }
} as const;

type DeliveryStatus = keyof typeof statusConfig;

export default function MenuOrdersClient({ initialOrders }: { initialOrders: MenuOrder[] }) {
  const [orders, setOrders] = useState<MenuOrder[]>(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'delivered'>('active');
  
  const isUnknownUserName = (name?: string) => !name || name === 'Usuario desconocido';
  const userNameCacheRef = useRef<Map<string, string>>(new Map());

  const mapRowToMenuOrder = (row: any): MenuOrder => {
    return {
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name || 'Usuario desconocido',
      items: row.items || [],
      total_paid: row.total_paid,
      transaction_id: row.transaction_id,
      authorization_code: row.authorization_code,
      purchase_date: row.purchase_date,
      delivery_status: row.delivery_status,
      notes: row.notes,
      created_at: row.created_at,
    } as MenuOrder;
  };

  const sortOrdersByDateDesc = (list: MenuOrder[]): MenuOrder[] => {
    return [...list].sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    );
  };

  useEffect(() => {
    const supabase = createSupabaseClient();

    const fetchUserName = async (userId?: string): Promise<string | undefined> => {
      if (!userId) return undefined;
      const cache = userNameCacheRef.current;
      if (cache.has(userId)) return cache.get(userId);
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data?.name) {
        cache.set(userId, data.name);
        return data.name as string;
      }
      return undefined;
    };

    const channel = supabase
      .channel('realtime-menu-purchases')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'menu_purchases' },
        async (payload: any) => {
          const baseOrder = mapRowToMenuOrder(payload.new);
          const resolvedName = isUnknownUserName(baseOrder.user_name)
            ? await fetchUserName(baseOrder.user_id)
            : baseOrder.user_name;
          const newOrder: MenuOrder = { ...baseOrder, user_name: resolvedName || baseOrder.user_name };

          setOrders(prev => {
            const existing = prev.find(o => o.id === newOrder.id);
            if (!existing) {
              return sortOrdersByDateDesc([...prev, newOrder]);
            }
            const merged: MenuOrder = { ...existing, ...newOrder };
            if (!isUnknownUserName(existing.user_name) && isUnknownUserName(newOrder.user_name)) {
              merged.user_name = existing.user_name;
            }
            return sortOrdersByDateDesc(prev.map(o => (o.id === merged.id ? merged : o)));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_purchases' },
        async (payload: any) => {
          const baseUpdated = mapRowToMenuOrder(payload.new);
          const resolvedName = isUnknownUserName(baseUpdated.user_name)
            ? await fetchUserName(baseUpdated.user_id)
            : baseUpdated.user_name;
          const updated: MenuOrder = { ...baseUpdated, user_name: resolvedName || baseUpdated.user_name };

          setOrders(prev =>
            sortOrdersByDateDesc(
              prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o))
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'menu_purchases' },
        (payload: any) => {
          const deletedId = payload.old?.id as string | undefined;
          if (!deletedId) return;
          setOrders(prev => prev.filter(o => o.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Botón de mock removido

  const getExtraNames = (item: any): string[] => {
    const extras = item?.extras ?? item?.selected_extras;
    if (!extras) return [];

    if (Array.isArray(extras) && extras.every((e: any) => typeof e === 'string')) {
      return extras as string[];
    }

    if (Array.isArray(extras) && extras.length > 0) {
      return (extras as any[])
        .map((e) => e?.name || e?.label || e?.title)
        .filter((n): n is string => Boolean(n));
    }

    if (typeof extras === 'object') {
      if ((extras as any)?.name) return [(extras as any).name as string];
      return Object.entries(extras as Record<string, any>)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k);
    }

    return [];
  };

  const handleStatusUpdate = async (orderId: string, newStatus: DeliveryStatus) => {
    setUpdatingOrderId(orderId);
    startTransition(async () => {
      try {
        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success && result.order) {
          setOrders(prev => 
            prev.map(order => 
              order.id === orderId 
                ? { ...order, delivery_status: newStatus }
                : order
            )
          );
        } else {
          console.error('Error al actualizar el estado:', result.error);
          alert('Error al actualizar el estado de la orden');
        }
      } catch (error) {
        console.error('Error interno:', error);
        alert('Error interno del servidor');
      } finally {
        setUpdatingOrderId(null);
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(price));
  };

  const getStatusOptions = (currentStatus: DeliveryStatus): DeliveryStatus[] => {
    const statusFlow: DeliveryStatus[] = ['pending', 'ready'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return statusFlow.slice(currentIndex);
  };

  // Filtrar órdenes según el tab activo
  const activeOrders = orders.filter(order => order.delivery_status !== 'ready');
  const readyOrders = orders.filter(order => order.delivery_status === 'ready');
  const currentOrders = activeTab === 'active' ? activeOrders : readyOrders;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Órdenes del Menú</h1>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('active')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'active'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Órdenes Activas
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === 'active' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {activeOrders.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('delivered')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delivered'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Listas
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === 'delivered' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {readyOrders.length}
                </span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
            {activeTab === 'active' ? 'Órdenes Pendientes' : 'Órdenes Listas'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {activeTab === 'active' 
              ? 'Administra las órdenes pendientes y cambia su estado a listo'
              : 'Órdenes que están listas para entregar'
            }
          </p>
        </div>
        
        <div className="p-6">
          <div className="overflow-hidden rounded-lg border border-gray-200 min-h-[400px]">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ítems
                    </th>
                   
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentOrders.length > 0 ? (
                    currentOrders.map((order, index) => {
                      const statusInfo = statusConfig[order.delivery_status as DeliveryStatus];
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <tr 
                          key={order.id} 
                          className={`hover:bg-gray-50 transition-colors duration-150 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">
                              #{order.transaction_id || order.id.slice(-8)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.user_name || 'Usuario desconocido'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs">
                              {order.items && Array.isArray(order.items) ? (
                                <div className="space-y-1">
                                  {order.items.map((item: any, itemIndex: number) => {
                                    const extraNames = getExtraNames(item);
                                    return (
                                      <div key={itemIndex} className="flex justify-between">
                                        <div className="truncate mr-2">
                                          <span className="block truncate">{item.name}</span>
                                          {extraNames.length > 0 && (
                                            <span className="block text-xs text-gray-500 truncate" title={`Extras: ${extraNames.join(', ')}`}>
                                              Extras: {extraNames.join(', ')}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-gray-500">x{item.quantity}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Sin ítems</span>
                              )}
                            </div>
                          </td>
                         
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(order.purchase_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full border ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </span>
                          </td>
                         
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center">
                              {activeTab === 'active' ? (
                                <>
                                  <CustomSelect
                                    value={order.delivery_status}
                                    onChange={(value) => handleStatusUpdate(order.id, value as DeliveryStatus)}
                                    disabled={isPending && updatingOrderId === order.id}
                                    options={getStatusOptions(order.delivery_status as DeliveryStatus).map((status) => ({
                                      value: status,
                                      label: statusConfig[status].label
                                    }))}
                                    className="min-w-[140px] text-sm"
                                  />
                                  {isPending && updatingOrderId === order.id && (
                                    <div className="ml-2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                  )}
                                </>
                              ) : (
                                <span className="px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full border border-green-200">
                                  ✓ Lista
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6h8v-6M8 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-2" />
                          </svg>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {activeTab === 'active' ? 'No hay órdenes pendientes' : 'No hay órdenes listas'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {activeTab === 'active' 
                              ? 'Las nuevas órdenes del menú aparecerán aquí cuando los usuarios realicen compras.'
                              : 'Las órdenes aparecerán aquí una vez que sean marcadas como listas.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeTab === 'active' ? (
          // Estadísticas para órdenes activas (solo pendientes)
          Object.entries(statusConfig).map(([status, config]) => {
            const count = orders.filter(order => order.delivery_status === status).length;
            const StatusIcon = config.icon;
            
            return (
              <div key={status} className={`${config.bgColor} rounded-lg p-4 border border-gray-200`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${config.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 text-')}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">{config.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // Estadísticas para órdenes listas
          <div className="bg-green-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Listas</p>
                <p className="text-2xl font-bold text-gray-900">{readyOrders.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
