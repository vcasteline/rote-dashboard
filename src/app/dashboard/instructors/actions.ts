'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // Usaremos Zod para validación

// Esquema de validación para un instructor (añadir/editar)
const InstructorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  profile_picture_url: z.string().url('Must be a valid URL').optional().or(z.literal('')), // Opcional o vacío
});

// Acción para añadir un nuevo instructor
export async function addInstructor(formData: FormData) {
  const cookieStore = cookies();
  const supabase = await createClient();

  const validatedFields = InstructorSchema.safeParse({
    name: formData.get('name'),
    profile_picture_url: formData.get('profile_picture_url'),
  });

  // Si la validación falla, retornar errores
  if (!validatedFields.success) {
    return {
      error: 'Validation Error',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Asegurar que profile_picture_url sea null si está vacío
  const dataToInsert = {
    ...validatedFields.data,
    profile_picture_url: validatedFields.data.profile_picture_url || null,
  };

  const { error } = await supabase.from('instructors').insert(dataToInsert);

  if (error) {
    console.error('Error adding instructor:', error);
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard/instructors');
  return { message: 'Instructor added successfully.' };
}

// Acción para actualizar un instructor existente
export async function updateInstructor(id: string, formData: FormData) {
    const cookieStore = cookies();
    const supabase = await createClient();

    if (!id) {
        return { error: 'Invalid Instructor ID.' };
    }

    const validatedFields = InstructorSchema.safeParse({
        name: formData.get('name'),
        profile_picture_url: formData.get('profile_picture_url'),
    });

    if (!validatedFields.success) {
        return {
            error: 'Validation Error',
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const dataToUpdate = {
        ...validatedFields.data,
        profile_picture_url: validatedFields.data.profile_picture_url || null,
    };

    const { error } = await supabase.from('instructors').update(dataToUpdate).match({ id });

    if (error) {
        console.error('Error updating instructor:', error);
        return { error: `Database Error: ${error.message}` };
    }

    revalidatePath('/dashboard/instructors');
    return { message: 'Instructor updated successfully.' };
}


// Acción para eliminar un instructor
export async function deleteInstructor(id: string) {
  const cookieStore = cookies();
  const supabase = await createClient();

  if (!id) {
    return { error: 'Invalid ID.' };
  }

  // Advertencia: Esto podría fallar si el instructor está referenciado en otras tablas
  // y hay restricciones de clave foránea. Considerar manejo de errores o soft delete.
  const { error } = await supabase.from('instructors').delete().match({ id });

  if (error) {
    console.error('Error deleting instructor:', error);
    // Devolver un error específico si es por restricción de FK
    if (error.code === '23503') { // Código estándar para violación de FK
         return { error: 'Cannot delete instructor: They are assigned to existing schedules or classes.' };
    }
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard/instructors');
  return { message: 'Instructor deleted successfully.' };
} 