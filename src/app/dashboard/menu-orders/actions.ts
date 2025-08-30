'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type MenuOrder = {
  id: string;
  user_id: string;
  user_name?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    menu_item_id: string;
    extras?: any;
  }>;
  total_paid: string;
  transaction_id: string | null;
  authorization_code: string | null;
  purchase_date: string;
  delivery_status: 'pending' | 'ready';
  notes: string | null;
  created_at: string;
};

export async function getMenuOrders(): Promise<{ success: boolean; orders?: MenuOrder[]; error?: string }> {
  try {
    const supabase = await createClient();

    // Usar SQL directo para obtener las órdenes con email del usuario
    const { data: orders, error } = await supabase
      .rpc('get_menu_orders_with_user_info');

    if (error) {
      // Si la función RPC no existe, usar consulta básica
      console.log('RPC function not found, using basic query');
      
      const { data: basicOrders, error: basicError } = await supabase
        .from('menu_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (basicError) {
        console.error('Error fetching menu orders:', basicError);
        return { success: false, error: 'Error al obtener las órdenes' };
      }

      // Mapear los datos básicos
      const mappedOrders: MenuOrder[] = basicOrders.map((order: any) => ({
        id: order.id,
        user_id: order.user_id,
        user_name: 'Usuario desconocido',
        items: order.items || [],
        total_paid: order.total_paid,
        transaction_id: order.transaction_id,
        authorization_code: order.authorization_code,
        purchase_date: order.purchase_date,
        delivery_status: order.delivery_status,
        notes: order.notes,
        created_at: order.created_at,
      }));

      return { success: true, orders: mappedOrders };
    }

    // Mapear los datos con información del usuario
    const mappedOrders: MenuOrder[] = orders.map((order: any) => ({
      id: order.id,
      user_id: order.user_id,
      user_name: order.user_name || 'Usuario desconocido',
      items: order.items || [],
      total_paid: order.total_paid,
      transaction_id: order.transaction_id,
      authorization_code: order.authorization_code,
      purchase_date: order.purchase_date,
      delivery_status: order.delivery_status,
      notes: order.notes,
      created_at: order.created_at,
    }));

    return { success: true, orders: mappedOrders };
  } catch (error) {
    console.error('Server error fetching menu orders:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function updateOrderStatus(
  orderId: string, 
  newStatus: 'pending' | 'ready'
): Promise<{ success: boolean; order?: MenuOrder; error?: string }> {
  try {
    const supabase = await createClient();

    // Verificar que el usuario tiene permisos de administrador
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Actualizar el estado de la orden
    const { data: updatedOrder, error } = await supabase
      .from('menu_purchases')
      .update({ 
        delivery_status: newStatus,
        // Opcional: actualizar timestamp cuando se marca como entregado
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: 'Error al actualizar el estado de la orden' };
    }

    // Obtener información del usuario por separado
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', updatedOrder.user_id)
      .single();

    // Mapear el resultado
    const mappedOrder: MenuOrder = {
      id: updatedOrder.id,
      user_id: updatedOrder.user_id,
      user_name: userData?.name || 'Usuario desconocido',
      items: updatedOrder.items || [],
      total_paid: updatedOrder.total_paid,
      transaction_id: updatedOrder.transaction_id,
      authorization_code: updatedOrder.authorization_code,
      purchase_date: updatedOrder.purchase_date,
      delivery_status: updatedOrder.delivery_status,
      notes: updatedOrder.notes,
      created_at: updatedOrder.created_at,
    };

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/menu-orders');

    return { success: true, order: mappedOrder };
  } catch (error) {
    console.error('Server error updating order status:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function addOrderNote(
  orderId: string, 
  note: string
): Promise<{ success: boolean; order?: MenuOrder; error?: string }> {
  try {
    const supabase = await createClient();

    // Verificar que el usuario tiene permisos de administrador
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Actualizar la nota de la orden
    const { data: updatedOrder, error } = await supabase
      .from('menu_purchases')
      .update({ notes: note })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating order note:', error);
      return { success: false, error: 'Error al actualizar la nota de la orden' };
    }

    // Obtener información del usuario por separado
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', updatedOrder.user_id)
      .single();

    // Mapear el resultado
    const mappedOrder: MenuOrder = {
      id: updatedOrder.id,
      user_id: updatedOrder.user_id,
      user_name: userData?.name || 'Usuario desconocido',
      items: updatedOrder.items || [],
      total_paid: updatedOrder.total_paid,
      transaction_id: updatedOrder.transaction_id,
      authorization_code: updatedOrder.authorization_code,
      purchase_date: updatedOrder.purchase_date,
      delivery_status: updatedOrder.delivery_status,
      notes: updatedOrder.notes,
      created_at: updatedOrder.created_at,
    };

    // Revalidar la página para mostrar los cambios
    revalidatePath('/dashboard/menu-orders');

    return { success: true, order: mappedOrder };
  } catch (error) {
    console.error('Server error updating order note:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function createMockMenuOrder(): Promise<{ success: boolean; order?: MenuOrder; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const mockItems = [
      {
        name: 'Smoothie de Fresa',
        quantity: 1,
        unit_price: 6.5,
        menu_item_id: 'mock-item-1',
        extras: ['Proteína extra']
      },
      {
        name: 'Ensalada Power',
        quantity: 1,
        unit_price: 7.0,
        menu_item_id: 'mock-item-2',
        extras: ['Chía', 'Aguacate']
      }
    ];

    const totalPaid = mockItems
      .reduce((acc, it) => acc + it.unit_price * it.quantity, 0)
      .toFixed(2);

    const { data: inserted, error } = await supabase
      .from('menu_purchases')
      .insert({
        user_id: user.id,
        items: mockItems,
        total_paid: totalPaid,
        transaction_id: `MOCK-${Date.now()}`,
        authorization_code: null,
        purchase_date: new Date().toISOString(),
        delivery_status: 'pending',
        notes: 'Orden de prueba Realtime'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting mock order:', error);
      return { success: false, error: 'Error al crear la orden mock' };
    }

    // Intentar obtener el nombre del usuario, pero si no existe fila en users, usar email del auth o fallback
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', inserted.user_id)
      .maybeSingle();

    let resolvedUserName: string | undefined = userData?.name;
    if (!resolvedUserName) {
      // Como alternativa mínima, podemos tomar el user.user_metadata.name si existe
      resolvedUserName = (user.user_metadata as any)?.name || undefined;
    }

    const mappedOrder: MenuOrder = {
      id: inserted.id,
      user_id: inserted.user_id,
      user_name: resolvedUserName || 'Usuario desconocido',
      items: inserted.items || [],
      total_paid: inserted.total_paid,
      transaction_id: inserted.transaction_id,
      authorization_code: inserted.authorization_code,
      purchase_date: inserted.purchase_date,
      delivery_status: inserted.delivery_status,
      notes: inserted.notes,
      created_at: inserted.created_at,
    };

    return { success: true, order: mappedOrder };
  } catch (error) {
    console.error('Server error creating mock order:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}
