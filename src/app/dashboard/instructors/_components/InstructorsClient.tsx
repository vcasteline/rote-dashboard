'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { addInstructor, updateInstructor, deleteInstructor } from '../actions';
import { type Instructor } from '../page'; // Importar tipo desde la página
import ImageUploader from './ImageUploader';
import { EyeOff, Edit } from 'lucide-react';

// Componente reutilizable para el formulario
function InstructorForm({
  instructor,
  onSubmit,
  isSubmitting,
  submitButtonText,
  fieldErrors,
  formError,
  onCancel,
}: {
  instructor?: Instructor | null; // Null para añadir, objeto para editar
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  fieldErrors?: { name?: string[]; bio?: string[]; profile_picture_url?: string[] };
  formError?: string | null;
  onCancel?: () => void; // Para el modo edición
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(instructor?.profile_picture_url || null);
  const [instructorName, setInstructorName] = useState(instructor?.name || '');

  // Efecto para resetear el form cuando cambia el instructor (ej: de add a edit, o edit a add)
  useEffect(() => {
    if (formRef.current) {
        if (instructor) {
            // Llenar el form para editar
            (formRef.current.elements.namedItem('name') as HTMLInputElement).value = instructor.name;
            (formRef.current.elements.namedItem('bio') as HTMLTextAreaElement).value = instructor.bio || '';
            setImageUrl(instructor.profile_picture_url);
            setInstructorName(instructor.name);
        } else {
            // Limpiar el form para añadir
            formRef.current.reset();
            setImageUrl(null);
            setInstructorName('');
        }
    }
  }, [instructor]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstructorName(e.target.value);
  };

  return (
    <form
      ref={formRef}
      action={onSubmit} // Usamos action directamente con la Server Action
      className="p-6 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-white shadow-sm mb-6"
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
        {instructor ? 'Editar Instructor' : 'Añadir Nuevo Instructor'}
      </h3>
      <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Instructor</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={instructor?.name ?? ''}
            onChange={handleNameChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 ${fieldErrors?.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Nombre completo del instructor"
          />
           {fieldErrors?.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name.join(', ')}</p>}
        </div>
        
        <div className="space-y-1">
          <ImageUploader
            currentImageUrl={imageUrl}
            onImageUploaded={setImageUrl}
            disabled={isSubmitting}
            instructorName={instructorName || 'instructor'}
          />
          {fieldErrors?.profile_picture_url && <p className="mt-1 text-xs text-red-500">{fieldErrors.profile_picture_url.join(', ')}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Biografía (opcional)</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={instructor?.bio ?? ''}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 ${fieldErrors?.bio ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Describe la experiencia y especialidades del instructor..."
          />
          {fieldErrors?.bio && <p className="mt-1 text-xs text-red-500">{fieldErrors.bio.join(', ')}</p>}
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
          {instructor && onCancel && (
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
export default function InstructorsClient({ initialInstructors }: { initialInstructors: Instructor[] }) {
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [isPendingAdd, startTransitionAdd] = useTransition();
  const [isPendingUpdate, startTransitionUpdate] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>(null); // Para errores de Zod
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddSubmit = async (formData: FormData) => {
    startTransitionAdd(async () => {
        setFormError(null);
        setFieldErrors(null);
        const result = await addInstructor(formData);
        if (result?.error) {
            setFormError(result.error);
            if (result.fieldErrors) {
                 setFieldErrors(result.fieldErrors);
            }
        } else {
            // Éxito - el form se puede resetear si es necesario o por el useEffect
            setFormError(null); // Limpiar errores previos
            setFieldErrors(null);
            // Opcional: Mostrar mensaje de éxito temporal
        }
    });
  };

  const handleUpdateSubmit = async (formData: FormData) => {
    if (!editingInstructor) return;
    startTransitionUpdate(async () => {
        setFormError(null);
        setFieldErrors(null);
        const result = await updateInstructor(editingInstructor.id, formData);
         if (result?.error) {
            setFormError(result.error);
             if (result.fieldErrors) {
                 setFieldErrors(result.fieldErrors);
            }
        } else {
            setEditingInstructor(null); // Salir del modo edición tras éxito
            setFormError(null);
            setFieldErrors(null);
        }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de ocultar/eliminar este instructor? Si tiene clases o horarios asociados, se ocultará. Si no tiene relaciones, se eliminará completamente.')) {
         startTransitionDelete(async () => {
            setDeleteError(null);
            const result = await deleteInstructor(id);
             if (result?.error) {
                setDeleteError(result.error);
            }
        });
    }
  };

  const handleEditClick = (instructor: Instructor) => {
      setEditingInstructor(instructor);
      setFormError(null); // Limpiar errores al cambiar a editar
      setFieldErrors(null);
  };

   const handleCancelEdit = () => {
      setEditingInstructor(null);
      setFormError(null);
      setFieldErrors(null);
  };

  // Determinar qué formulario mostrar
  const isEditing = editingInstructor !== null;
  const currentFormSubmitHandler = isEditing ? handleUpdateSubmit : handleAddSubmit;
  const isCurrentFormSubmitting = isEditing ? isPendingUpdate : isPendingAdd;
  const currentSubmitButtonText = isEditing ? 'Actualizar Instructor' : 'Añadir Instructor';

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Gestionar Instructores</h1>

      <InstructorForm
        key={editingInstructor?.id ?? 'add'} // Key para forzar re-render/reset del form al cambiar modo
        instructor={editingInstructor}
        onSubmit={currentFormSubmitHandler}
        isSubmitting={isCurrentFormSubmitting}
        submitButtonText={currentSubmitButtonText}
        fieldErrors={fieldErrors}
        formError={formError}
        onCancel={isEditing ? handleCancelEdit : undefined}
      />

      {/* Tabla de Instructores */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
            Instructores Registrados
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biografía</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foto de Perfil</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initialInstructors.length > 0 ? (
                    initialInstructors.map((instructor, index) => (
                      <tr key={instructor.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{instructor.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {instructor.bio ? (
                              <p className="truncate" title={instructor.bio}>
                                {instructor.bio}
                              </p>
                            ) : (
                              <span className="text-gray-400 italic">Sin biografía</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {instructor.profile_picture_url ? (
                            <div className="flex items-center">
                              <img
                                className="h-10 w-10 rounded-full object-cover border border-gray-300"
                                src={instructor.profile_picture_url}
                                alt={`${instructor.name} profile`}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden h-10 w-10 rounded-full bg-gray-200 items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditClick(instructor)}
                              disabled={isPendingUpdate || isPendingDelete || isPendingAdd}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(instructor.id)}
                              disabled={isPendingDelete || isPendingUpdate || isPendingAdd}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            >
                              <EyeOff className="w-4 h-4 mr-1" />
                              {isPendingDelete ? 'Procesando...' : 'Ocultar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No hay instructores registrados</h3>
                          <p className="text-sm text-gray-500">Comienza añadiendo un nuevo instructor usando el formulario de arriba.</p>
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