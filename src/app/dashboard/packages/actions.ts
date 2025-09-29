'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePurchaseCredits(
  purchaseId: string, 
  newCredits: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  try {
    // Validar que los créditos sean un número válido y no negativo
    if (isNaN(newCredits) || newCredits < 0) {
      return { success: false, error: 'Los créditos deben ser un número válido mayor o igual a 0' };
    }

    // Obtener la compra actual para validar que existe
    const { data: currentPurchase, error: fetchError } = await supabase
      .from('purchases')
      .select('id, credits_remaining, packages(name, class_credits), users(name, email)')
      .eq('id', purchaseId)
      .single();
    
    if (fetchError || !currentPurchase) {
      return { success: false, error: 'Compra no encontrada' };
    }

    // Actualizar los créditos restantes
    const { data: updatedPurchase, error: updateError } = await supabase
      .from('purchases')
      .update({ credits_remaining: newCredits })
      .eq('id', purchaseId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating purchase credits:', updateError);
      return { success: false, error: 'Error al actualizar los créditos' };
    }
    
    // Revalidate related pages
    revalidatePath('/dashboard/packages');
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard/reservations');
    
    return { success: true };
  } catch (error) {
    console.error('Error in updatePurchaseCredits:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}
