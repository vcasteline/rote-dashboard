'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createMenuItem, deleteMenuItem, updateMenuItem, type MenuItem } from '../actions';
import Image from 'next/image';
import { Edit, EyeOff } from 'lucide-react';
import ImageUploader from './ImageUploader';

// Componente reutilizable para el formulario
function MenuItemForm({
  menuItem,
  onSubmit,
  isSubmitting,
  submitButtonText,
  formError,
  onCancel,
  resetForm,
}: {
  menuItem?: MenuItem | null; // Null para añadir, objeto para editar
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  formError?: string | null;
  onCancel?: () => void; // Para el modo edición
  resetForm?: boolean; // Para resetear el formulario después de éxito
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [itemName, setItemName] = useState(menuItem?.name || '');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    menuItem?.image ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu/${menuItem.image}` : null
  );

  // Efecto para resetear el form cuando cambia el menuItem (ej: de add a edit, o edit a add)
  useEffect(() => {
    if (formRef.current) {
      if (menuItem) {
        // Llenar el form para editar
        (formRef.current.elements.namedItem('name') as HTMLInputElement).value = menuItem.name;
        (formRef.current.elements.namedItem('description') as HTMLTextAreaElement).value = menuItem.description || '';
        (formRef.current.elements.namedItem('price') as HTMLInputElement).value = menuItem.price.toString();
        (formRef.current.elements.namedItem('in_stock') as HTMLInputElement).checked = Boolean(menuItem.in_stock);
        setItemName(menuItem.name);
        setImageFile(null);
        setCurrentImageUrl(menuItem.image ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu/${menuItem.image}` : null);
      } else {
        // Limpiar el form para añadir
        formRef.current.reset();
        setItemName('');
        setImageFile(null);
        setCurrentImageUrl(null);
      }
    }
  }, [menuItem]);

  // Efecto para resetear el formulario cuando se indica desde el componente padre
  useEffect(() => {
    if (resetForm && formRef.current) {
      formRef.current.reset();
      setItemName('');
      setImageFile(null);
      setCurrentImageUrl(null);
    }
  }, [resetForm]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItemName(e.target.value);
  };

  const handleSubmit = async (formData: FormData) => {
    // Añadir el archivo de imagen al FormData si existe
    if (imageFile) {
      formData.append('imageFile', imageFile);
    }
    
    await onSubmit(formData);
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="p-6 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-white shadow-sm mb-6"
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
        {menuItem ? 'Editar Ítem del Menú' : 'Añadir Nuevo Ítem'}
      </h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Ítem *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={menuItem?.name ?? ''}
              onChange={handleNameChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              placeholder="Nombre del producto"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio *</label>
            <input
              type="number"
              id="price"
              name="price"
              required
              min="0"
              step="0.01"
              defaultValue={menuItem?.price ?? ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={menuItem?.description ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="Describe el producto..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="in_stock"
                name="in_stock"
                defaultChecked={menuItem?.in_stock ?? true}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="in_stock" className="ml-2 block text-sm text-gray-700">En stock</label>
            </div>
          </div>

          <div className="space-y-1">
            <ImageUploader
              currentImageUrl={currentImageUrl}
              onImageSelected={setImageFile}
              disabled={isSubmitting}
              itemName={itemName || 'item'}
              resetUploader={resetForm}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <div className="flex-1">
          {formError && (
            <div className="flex items-center text-sm text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              {formError}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {menuItem && onCancel && (
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
             type="submit"
             disabled={isSubmitting}
             className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
           >
             {isSubmitting ? (
               <div className="flex items-center">
                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                 Guardando...
               </div>
             ) : submitButtonText}
           </button>
        </div>
      </div>
    </form>
  );
}

// Componente principal del cliente
export default function MenuClient({ initialItems }: { initialItems: MenuItem[] }) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isPendingAdd, startTransitionAdd] = useTransition();
  const [isPendingUpdate, startTransitionUpdate] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [shouldResetForm, setShouldResetForm] = useState(false);

  const handleAddSubmit = async (formData: FormData) => {
    startTransitionAdd(async () => {
      setFormError(null);
      try {
        const result = await createMenuItem({
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          in_stock: Boolean(formData.get('in_stock')),
          price: Number(formData.get('price')),
        });
        
        if (result.success && result.item) {
          let newItem = result.item;
          
          // Manejar subida de imagen si hay archivo
          const imageFile = formData.get('imageFile') as File;
          if (imageFile && imageFile.size > 0) {
            const fd = new FormData();
            fd.append('id', newItem.id);
            fd.append('file', imageFile);
            
            try {
              const res = await fetch('/api/menu/upload', { method: 'POST', body: fd });
              const json = await res.json();
              if (json.success && json.item) {
                newItem = json.item as MenuItem;
              }
            } catch (error) {
              console.error('Error al subir imagen:', error);
            }
          }
          
          setItems(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
          setFormError(null);
          
          // Activar el reseteo del formulario
          setShouldResetForm(true);
          // Resetear la bandera después de un breve delay
          setTimeout(() => setShouldResetForm(false), 100);
        } else {
          setFormError(result.error || 'Error al crear el ítem');
        }
      } catch (error) {
        setFormError('Error interno del servidor');
      }
    });
  };

  const handleUpdateSubmit = async (formData: FormData) => {
    if (!editingItem) return;
    startTransitionUpdate(async () => {
      setFormError(null);
      try {
        const result = await updateMenuItem(editingItem.id, {
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          in_stock: Boolean(formData.get('in_stock')),
          price: Number(formData.get('price')),
        });
        
        if (result.success && result.item) {
          let updatedItem = result.item;
          
          // Manejar subida de imagen si hay archivo
          const imageFile = formData.get('imageFile') as File;
          console.log('=== DEBUG CLIENT UPLOAD ===');
          console.log('Image file:', imageFile?.name, imageFile?.size);
          if (imageFile && imageFile.size > 0) {
            const fd = new FormData();
            fd.append('id', updatedItem.id);
            fd.append('file', imageFile);
            
            console.log('Sending upload request for item:', updatedItem.id);
            try {
              const res = await fetch('/api/menu/upload', { method: 'POST', body: fd });
              const json = await res.json();
              console.log('Upload response:', json);
              if (json.success && json.item) {
                updatedItem = json.item as MenuItem;
              } else {
                console.error('Upload failed:', json.error);
                setFormError(json.error || 'Error al subir imagen');
                return;
              }
            } catch (error) {
              console.error('Error al subir imagen:', error);
              setFormError('Error de conexión al subir imagen');
              return;
            }
          }
          
          setItems(prev => prev.map(i => (i.id === updatedItem.id ? updatedItem : i)).sort((a, b) => a.name.localeCompare(b.name)));
          setEditingItem(null);
          setFormError(null);
        } else {
          setFormError(result.error || 'Error al actualizar el ítem');
        }
      } catch (error) {
        setFormError('Error interno del servidor');
      }
    });
  };

  const handleDelete = async (item: MenuItem) => {
    if (confirm(`¿Eliminar "${item.name}" del menú?`)) {
      startTransitionDelete(async () => {
        setDeleteError(null);
        const result = await deleteMenuItem(item.id);
        if (result.success) {
          setItems(prev => prev.filter(i => i.id !== item.id));
        } else {
          setDeleteError(result.error || 'Error al eliminar el ítem');
        }
      });
    }
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormError(null);
  };

  // Determinar qué formulario mostrar
  const isEditing = editingItem !== null;
  const currentFormSubmitHandler = isEditing ? handleUpdateSubmit : handleAddSubmit;
  const isCurrentFormSubmitting = isEditing ? isPendingUpdate : isPendingAdd;
  const currentSubmitButtonText = isEditing ? 'Actualizar Ítem' : 'Añadir Ítem';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Gestionar Menu</h1>

      <MenuItemForm
        key={editingItem?.id ?? 'add'} // Key para forzar re-render/reset del form al cambiar modo
        menuItem={editingItem}
        onSubmit={currentFormSubmitHandler}
        isSubmitting={isCurrentFormSubmitting}
        submitButtonText={currentSubmitButtonText}
        formError={formError}
        onCancel={isEditing ? handleCancelEdit : undefined}
        resetForm={shouldResetForm}
      />

      {/* Tabla de Ítems del Menú */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
            Ítems del Menú
          </h2>
        </div>
        
        <div className="p-6">
          {deleteError && (
            <div className="mb-4 flex items-center text-sm text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Error al eliminar: {deleteError}
            </div>
          )}
          
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {item.description ? (
                              <p className="truncate" title={item.description}>
                                {item.description}
                              </p>
                            ) : (
                              <span className="text-gray-400 italic">Sin descripción</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${item.price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.in_stock ? 'En stock' : 'Agotado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.image ? (
                            <div className="flex items-center">
                              <Image
                                className="h-10 w-10 rounded-full object-cover border border-gray-300"
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu/${item.image}`}
                                alt={`${item.name} image`}
                                width={40}
                                height={40}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden h-10 w-10 rounded-full bg-gray-200 items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditClick(item)}
                              disabled={isPendingUpdate || isPendingDelete || isPendingAdd}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={isPendingDelete || isPendingUpdate || isPendingAdd}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            >
                              <EyeOff className="w-4 h-4 mr-1" />
                              {isPendingDelete ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No hay ítems en el menú</h3>
                          <p className="text-sm text-gray-500">Comienza añadiendo un nuevo ítem usando el formulario de arriba.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}