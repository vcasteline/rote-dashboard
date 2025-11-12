'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Esquema de validación para instructor
const instructorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  profile_picture_url: z.string().url().optional().or(z.literal('')),
  specialties: z.array(z.enum(['pilates', 'cycle', 'resilience'])).optional().nullable(),
});

export async function addInstructor(formData: FormData) {
  const supabase = createAdminClient();

  // Obtener specialties del FormData (puede venir como array)
  const specialtiesArray: string[] = [];
  let index = 0;
  while (formData.get(`specialties[${index}]`)) {
    const specialty = formData.get(`specialties[${index}]`) as string;
    if (specialty && ['pilates', 'cycle', 'resilience'].includes(specialty)) {
      specialtiesArray.push(specialty);
    }
    index++;
  }

  // Validar datos de entrada
  const validatedFields = instructorSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio') || undefined,
    profile_picture_url: formData.get('profile_picture_url') || undefined,
    specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid fields: ' + Object.keys(validatedFields.error.flatten().fieldErrors).join(', '),
      fieldErrors: validatedFields.error.flatten().fieldErrors
    };
  }

  try {
    const { error } = await supabase.from('instructors').insert([
      {
        name: validatedFields.data.name,
        bio: validatedFields.data.bio,
        profile_picture_url: validatedFields.data.profile_picture_url || null,
        specialties: validatedFields.data.specialties || null,
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

  // Obtener specialties del FormData (puede venir como array)
  const specialtiesArray: string[] = [];
  let index = 0;
  while (formData.get(`specialties[${index}]`)) {
    const specialty = formData.get(`specialties[${index}]`) as string;
    if (specialty && ['pilates', 'cycle', 'resilience'].includes(specialty)) {
      specialtiesArray.push(specialty);
    }
    index++;
  }

  // Validar datos de entrada
  const validatedFields = instructorSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio') || undefined,
    profile_picture_url: formData.get('profile_picture_url') || undefined,
    specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      error: 'Invalid fields: ' + Object.keys(validatedFields.error.flatten().fieldErrors).join(', '),
      fieldErrors: validatedFields.error.flatten().fieldErrors
    };
  }

  try {
    const { error } = await supabase.from('instructors').update(
      {
        name: validatedFields.data.name,
        bio: validatedFields.data.bio,
        profile_picture_url: validatedFields.data.profile_picture_url || null,
        specialties: validatedFields.data.specialties || null,
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