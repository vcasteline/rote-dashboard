'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Esquema para validación de paquetes
const packageSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  price: z.number().min(0, 'Precio debe ser mayor a 0'),
  class_credits: z.number().int().min(1, 'Créditos debe ser mayor a 0'),
  expiration_days: z.number().int().min(1, 'Días de expiración debe ser mayor a 0').optional(),
});

export async function addPackage(formData: FormData) {
  const cookieStore = cookies();
  const supabase = await createClient();

  const rawData = {
    name: formData.get('name'),
    price: parseFloat(formData.get('price') as string || '0'),
    class_credits: parseInt(formData.get('class_credits') as string || '0'),
    expiration_days: formData.get('expiration_days') ? parseInt(formData.get('expiration_days') as string) : null,
  };

  const validatedFields = packageSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      error: 'Error de validación - revisa los campos requeridos',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.from('packages').insert(validatedFields.data);

  if (error) {
    console.error('Error adding package:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/packages-management');
  return { message: 'Paquete creado exitosamente.' };
}

export async function updatePackage(id: string, formData: FormData) {
  const cookieStore = cookies();
  const supabase = await createClient();

  const rawData = {
    name: formData.get('name'),
    price: parseFloat(formData.get('price') as string || '0'),
    class_credits: parseInt(formData.get('class_credits') as string || '0'),
    expiration_days: formData.get('expiration_days') ? parseInt(formData.get('expiration_days') as string) : null,
  };

  const validatedFields = packageSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      error: 'Error de validación - revisa los campos requeridos',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from('packages')
    .update(validatedFields.data)
    .eq('id', id);

  if (error) {
    console.error('Error updating package:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/packages-management');
  return { message: 'Paquete actualizado exitosamente.' };
}

export async function deletePackage(id: string) {
  const cookieStore = cookies();
  const supabase = await createClient();

  // Ya no necesitamos verificar compras porque usamos soft delete
  // Los paquetes eliminados seguirán existiendo en la BD para mantener integridad referencial
  
  // Hacer soft delete: marcar como eliminado con timestamp actual
  const { error } = await supabase
    .from('packages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null); // Solo eliminar si no está ya eliminado

  if (error) {
    console.error('Error soft deleting package:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/packages-management');
  return { message: 'Paquete eliminado exitosamente.' };
} 