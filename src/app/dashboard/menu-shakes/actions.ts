'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  in_stock: boolean;
  price: number;
  image: string | null;
};

export async function getMenuItems(): Promise<MenuItem[]> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase
      .from('menu')
      .select('id, name, description, in_stock, price, image')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }

    // price puede venir como string si es numeric en PG; convertimos a number de forma segura
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      in_stock: Boolean(row.in_stock),
      price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
      image: row.image ?? null,
    }));
  } catch (error) {
    console.error('Error in getMenuItems:', error);
    return [];
  }
}

export async function createMenuItem(input: {
  name: string;
  description?: string;
  in_stock: boolean;
  price: number;
}): Promise<{ success: boolean; item?: MenuItem; error?: string }> {
  const supabase = createAdminClient();

  if (!input.name || input.price === undefined || input.price === null || Number.isNaN(Number(input.price))) {
    return { success: false, error: 'Nombre y precio son obligatorios.' };
  }

  try {
    const payload = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      in_stock: Boolean(input.in_stock),
      price: Number(input.price),
    };

    const { data, error } = await supabase
      .from('menu')
      .insert(payload)
      .select('id, name, description, in_stock, price, image')
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      return { success: false, error: 'Error al crear el ítem del menú.' };
    }

    revalidatePath('/dashboard/menu-shakes');

    const item: MenuItem = {
      id: data.id,
      name: data.name,
      description: data.description ?? null,
      in_stock: Boolean(data.in_stock),
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
      image: data.image ?? null,
    };

    return { success: true, item };
  } catch (error) {
    console.error('Error in createMenuItem:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}

export async function updateMenuItem(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    in_stock?: boolean;
    price?: number;
  }
): Promise<{ success: boolean; item?: MenuItem; error?: string }> {
  const supabase = createAdminClient();
  if (!id) return { success: false, error: 'ID inválido.' };

  try {
    const payload: Record<string, any> = {};
    if (typeof input.name !== 'undefined') payload.name = input.name.trim();
    if (typeof input.description !== 'undefined') payload.description = (input.description || '').trim() || null;
    if (typeof input.in_stock !== 'undefined') payload.in_stock = Boolean(input.in_stock);
    if (typeof input.price !== 'undefined') payload.price = Number(input.price);

    const { data, error } = await supabase
      .from('menu')
      .update(payload)
      .eq('id', id)
      .select('id, name, description, in_stock, price, image')
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return { success: false, error: 'Error al actualizar el ítem.' };
    }

    revalidatePath('/dashboard/menu-shakes');

    const item: MenuItem = {
      id: data.id,
      name: data.name,
      description: data.description ?? null,
      in_stock: Boolean(data.in_stock),
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
      image: data.image ?? null,
    };

    return { success: true, item };
  } catch (error) {
    console.error('Error in updateMenuItem:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}

export async function deleteMenuItem(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!id) return { success: false, error: 'ID inválido.' };

  try {
    const { error } = await supabase
      .from('menu')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      return { success: false, error: 'Error al eliminar el ítem.' };
    }

    revalidatePath('/dashboard/menu-shakes');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteMenuItem:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}


