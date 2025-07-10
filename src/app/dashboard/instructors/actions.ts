'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // Usaremos Zod para validación

// Esquema de validación para un instructor (añadir/editar)
const InstructorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().nullable().optional(), // Bio puede ser null o string
  profile_picture_url: z.string().url('Must be a valid URL').optional().or(z.literal('')), // Opcional o vacío
});

// Acción para añadir un nuevo instructor
export async function addInstructor(formData: FormData) {
  const cookieStore = cookies();
  const supabase = await createClient();

  const validatedFields = InstructorSchema.safeParse({
    name: formData.get('name'),
    bio: formData.get('bio') || null,
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
        bio: formData.get('bio') || null,
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

  // Verificar si el instructor tiene relaciones (clases o schedules)
  const { data: classes } = await supabase
    .from('classes')
    .select('id')
    .eq('instructor_id', id)
    .limit(1);

  const { data: schedules } = await supabase
    .from('class_schedules')
    .select('id')
    .eq('instructor_id', id)
    .limit(1);

  const hasRelations = (classes && classes.length > 0) || (schedules && schedules.length > 0);

  if (hasRelations) {
    // Hacer soft delete: marcar como eliminado con timestamp actual
    const { error } = await supabase
      .from('instructors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null); // Solo eliminar si no está ya eliminado

    if (error) {
      console.error('Error soft deleting instructor:', error);
      return { error: `Error de base de datos: ${error.message}` };
    }

    revalidatePath('/dashboard/instructors');
    return { message: 'Instructor ocultado exitosamente (tiene clases o horarios asociados).' };
  } else {
    // No tiene relaciones: borrar físicamente
    const { error } = await supabase
      .from('instructors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting instructor:', error);
      return { error: `Error de base de datos: ${error.message}` };
    }

    revalidatePath('/dashboard/instructors');
    return { message: 'Instructor eliminado completamente.' };
  }
} 