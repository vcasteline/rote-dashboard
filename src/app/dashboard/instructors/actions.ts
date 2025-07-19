'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Esquema de validación para instructor
const instructorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional(),
  bio: z.string().optional(),
});

export async function addInstructor(formData: FormData) {
  const supabase = createAdminClient();

  // Validar datos de entrada
  const validatedFields = instructorSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    bio: formData.get('bio') || undefined,
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid fields: ' + Object.keys(validatedFields.error.flatten().fieldErrors).join(', ')
    };
  }

  try {
    const { error } = await supabase.from('instructors').insert([
      {
        name: validatedFields.data.name,
        email: validatedFields.data.email,
        bio: validatedFields.data.bio,
      }
    ]);

    if (error) {
      console.error('Error inserting instructor:', error);
      return { error: `Database Error: ${error.message}` };
    }
  } catch (error) {
    console.error('Error adding instructor:', error);
    return { error: 'Failed to add instructor.' };
  }

  revalidatePath('/dashboard/instructors');
  return { message: 'Instructor created successfully' };
}

export async function updateInstructor(id: string, formData: FormData) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'Invalid ID.' };
  }

  // Validar datos de entrada
  const validatedFields = instructorSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    bio: formData.get('bio') || undefined,
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid fields: ' + Object.keys(validatedFields.error.flatten().fieldErrors).join(', ')
    };
  }

  try {
    const { error } = await supabase.from('instructors').update(
      {
        name: validatedFields.data.name,
        email: validatedFields.data.email,
        bio: validatedFields.data.bio,
      }
    ).match({ id });

    if (error) {
      console.error('Error updating instructor:', error);
      return { error: `Database Error: ${error.message}` };
    }
  } catch (error) {
    console.error('Error updating instructor:', error);
    return { error: 'Failed to update instructor.' };
  }

  revalidatePath('/dashboard/instructors');
  return { message: 'Instructor updated successfully' };
}

export async function deleteInstructor(id: string) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'Invalid ID.' };
  }

  try {
    // Soft delete marcando deleted_at
    const { error } = await supabase
      .from('instructors')
      .update({ deleted_at: new Date().toISOString() })
      .match({ id });

    if (error) {
      console.error('Error deleting instructor:', error);
      return { error: `Database Error: ${error.message}` };
    }
  } catch (error) {
    console.error('Error deleting instructor:', error);
    return { error: 'Failed to delete instructor.' };
  }

  revalidatePath('/dashboard/instructors');
  return { message: 'Instructor deleted successfully.' };
} 