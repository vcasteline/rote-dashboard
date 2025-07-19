'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  class_credits: z.number().min(1, 'Class credits must be at least 1'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  expiration_days: z.number().nullable().optional(),
});

export async function addPackage(formData: FormData) {
  const supabase = createAdminClient();

  // Validar datos de entrada
  const validatedFields = packageSchema.safeParse({
    name: formData.get('name'),
    class_credits: parseInt(formData.get('class_credits') as string, 10),
    price: parseFloat(formData.get('price') as string),
    expiration_days: formData.get('expiration_days') ? parseInt(formData.get('expiration_days') as string, 10) : null,
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid fields: ' + Object.keys(validatedFields.error.flatten().fieldErrors).join(', ')
    };
  }

  try {
    const { error } = await supabase.from('packages').insert([validatedFields.data]);

    if (error) {
      console.error('Error inserting package:', error);
      return { error: `Database Error: ${error.message}` };
    }
  } catch (error) {
    console.error('Error adding package:', error);
    return { error: 'Failed to add package.' };
  }

  revalidatePath('/dashboard/packages-management');
  return { message: 'Package created successfully' };
}

export async function updatePackage(id: string, formData: FormData) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'Invalid ID.' };
  }

  // Validar datos de entrada
  const validatedFields = packageSchema.safeParse({
    name: formData.get('name'),
    class_credits: parseInt(formData.get('class_credits') as string, 10),
    price: parseFloat(formData.get('price') as string),
    expiration_days: formData.get('expiration_days') ? parseInt(formData.get('expiration_days') as string, 10) : null,
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid fields: ' + Object.keys(validatedFields.error.flatten().fieldErrors).join(', ')
    };
  }

  try {
    const { error } = await supabase.from('packages').update(validatedFields.data).match({ id });

    if (error) {
      console.error('Error updating package:', error);
      return { error: `Database Error: ${error.message}` };
    }
  } catch (error) {
    console.error('Error updating package:', error);
    return { error: 'Failed to update package.' };
  }

  revalidatePath('/dashboard/packages-management');
  return { message: 'Package updated successfully' };
}

export async function deletePackage(id: string) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'Invalid ID.' };
  }

  try {
    // Soft delete marcando deleted_at
    const { error } = await supabase
      .from('packages')
      .update({ deleted_at: new Date().toISOString() })
      .match({ id });

    if (error) {
      console.error('Error deleting package:', error);
      return { error: `Database Error: ${error.message}` };
    }
  } catch (error) {
    console.error('Error deleting package:', error);
    return { error: 'Failed to delete package.' };
  }

  revalidatePath('/dashboard/packages-management');
  return { message: 'Package deleted successfully.' };
} 