'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const BannerSchema = z.object({
  title: z.string().min(1, 'Título es requerido'),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
});

export async function addBanner(formData: FormData) {
  const supabase = createAdminClient();

  // Debug logging
  console.log('Raw form data:');
  for (const [key, value] of formData.entries()) {
    console.log(key, ':', value, typeof value);
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || null,
    is_active: formData.get('is_active') === 'true' || formData.has('is_active'),
    start_date: formData.get('start_date') || null,
    end_date: formData.get('end_date') || null,
    background_color: formData.get('background_color') || '#6366f1',
    text_color: formData.get('text_color') || '#ffffff',
  };

  console.log('Processed data before validation:', rawData);

  const validatedFields = BannerSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.log('Validation errors:', validatedFields.error.flatten());
    return {
      error: 'Error de validación - revisa los campos requeridos',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.from('banners').insert(validatedFields.data);

  if (error) {
    console.error('Error adding banner:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/banners');
  return { message: 'Banner creado exitosamente.' };
}

export async function updateBanner(id: string, formData: FormData) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'ID de banner inválido.' };
  }

  // Debug logging
  console.log('Raw form data for update:');
  for (const [key, value] of formData.entries()) {
    console.log(key, ':', value, typeof value);
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || null,
    is_active: formData.get('is_active') === 'true' || formData.has('is_active'),
    start_date: formData.get('start_date') || null,
    end_date: formData.get('end_date') || null,
    background_color: formData.get('background_color') || '#6366f1',
    text_color: formData.get('text_color') || '#ffffff',
  };

  console.log('Processed data before validation:', rawData);

  const validatedFields = BannerSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.log('Validation errors:', validatedFields.error.flatten());
    return {
      error: 'Error de validación - revisa los campos requeridos',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from('banners')
    .update(validatedFields.data)
    .match({ id });

  if (error) {
    console.error('Error updating banner:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/banners');
  return { message: 'Banner actualizado exitosamente.' };
}

export async function deleteBanner(id: string) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'ID inválido.' };
  }

  const { error } = await supabase.from('banners').delete().match({ id });

  if (error) {
    console.error('Error deleting banner:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/banners');
  return { message: 'Banner eliminado exitosamente.' };
}

export async function toggleBannerStatus(id: string, isActive: boolean) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'ID inválido.' };
  }

  const { error } = await supabase
    .from('banners')
    .update({ is_active: isActive })
    .match({ id });

  if (error) {
    console.error('Error toggling banner status:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/banners');
  return { message: `Banner ${isActive ? 'activado' : 'desactivado'} exitosamente.` };
} 