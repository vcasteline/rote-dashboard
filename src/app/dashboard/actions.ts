'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Acción para actualizar el nombre de una clase
export async function updateClassName(id: string, newName: string | null) {
  const cookieStore = cookies();
  const supabase = await createClient();

  if (!id) {
    return { error: 'Invalid Class ID.' };
  }

  // Permitir null o string no vacío para el nombre
  const nameToUpdate = newName?.trim() === '' ? null : newName;

  const { error } = await supabase
    .from('classes')
    .update({ name: nameToUpdate })
    .match({ id });

  if (error) {
    console.error('Error updating class name:', error);
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard');
  return { message: 'Class name updated.' };
} 