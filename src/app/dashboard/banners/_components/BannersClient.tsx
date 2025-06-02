'use client';

import { useState, useTransition } from 'react';
import { addBanner, updateBanner, deleteBanner, toggleBannerStatus } from '../actions';
import { type Banner } from '../page';

// Componente para el formulario de banners
function BannerForm({
  banner,
  onSubmit,
  isSubmitting,
  submitButtonText,
  fieldErrors,
  formError,
  onCancel,
}: {
  banner?: Banner | null;
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText: string;
  fieldErrors?: any;
  formError?: string | null;
  onCancel?: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="p-6 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-white shadow-sm mb-6"
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
        {banner ? 'Editar Banner' : 'Crear Nuevo Banner'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Título */}
        <div className="md:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título del Banner*
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            defaultValue={banner?.title ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="ej: ¡20% OFF en paquetes de 10 clases!"
          />
          {fieldErrors?.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title.join(', ')}</p>}
        </div>

        {/* Descripción */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={banner?.description ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="Válido hasta fin de mes. No acumulable con otras promociones."
          />
        </div>

        {/* Fechas */}
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            defaultValue={banner?.start_date ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            defaultValue={banner?.end_date ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
        </div>

        {/* Colores */}
        <div>
          <label htmlFor="background_color" className="block text-sm font-medium text-gray-700 mb-1">
            Color de Fondo
          </label>
          <input
            type="color"
            id="background_color"
            name="background_color"
            defaultValue={banner?.background_color ?? '#6366f1'}
            className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="text_color" className="block text-sm font-medium text-gray-700 mb-1">
            Color del Texto
          </label>
          <input
            type="color"
            id="text_color"
            name="text_color"
            defaultValue={banner?.text_color ?? '#ffffff'}
            className="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Estado activo */}
        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={banner?.is_active ?? true}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Banner activo</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <div className="flex-1">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex items-center text-sm text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="font-medium">{formError}</span>
              </div>
              {fieldErrors && Object.keys(fieldErrors).length > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  <div className="font-medium mb-1">Errores específicos:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {Object.entries(fieldErrors).map(([field, errors]) => (
                      <li key={field}>
                        <span className="font-medium">{field}:</span> {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {banner && onCancel && (
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

export default function BannersClient({ initialBanners }: { initialBanners: Banner[] }) {
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isPendingAdd, startTransitionAdd] = useTransition();
  const [isPendingUpdate, startTransitionUpdate] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();
  const [isPendingToggle, startTransitionToggle] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>(null);

  const handleAddSubmit = async (formData: FormData) => {
    startTransitionAdd(async () => {
      setFormError(null);
      setFieldErrors(null);
      
      // Debug: Log form data
      console.log('Form data entries:');
      for (const [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }
      
      const result = await addBanner(formData);
      console.log('Add banner result:', result);
      
      if (result?.error) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors);
        console.log('Field errors:', result.fieldErrors);
      }
    });
  };

  const handleUpdateSubmit = async (formData: FormData) => {
    if (!editingBanner) return;
    startTransitionUpdate(async () => {
      setFormError(null);
      setFieldErrors(null);
      
      // Debug: Log form data
      console.log('Form data entries:');
      for (const [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }
      
      const result = await updateBanner(editingBanner.id, formData);
      console.log('Update banner result:', result);
      
      if (result?.error) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors);
        console.log('Field errors:', result.fieldErrors);
      } else {
        setEditingBanner(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este banner?')) {
      startTransitionDelete(async () => {
        await deleteBanner(id);
      });
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransitionToggle(async () => {
      await toggleBannerStatus(id, !currentStatus);
    });
  };

  const handleEditClick = (banner: Banner) => {
    setEditingBanner(banner);
    setFormError(null);
    setFieldErrors(null);
  };

  const handleCancelEdit = () => {
    setEditingBanner(null);
    setFormError(null);
    setFieldErrors(null);
  };

  const isEditing = editingBanner !== null;
  const currentFormSubmitHandler = isEditing ? handleUpdateSubmit : handleAddSubmit;
  const isCurrentFormSubmitting = isEditing ? isPendingUpdate : isPendingAdd;
  const currentSubmitButtonText = isEditing ? 'Actualizar Banner' : 'Crear Banner';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Banners</h1>
          <p className="text-gray-600 mt-1">Crea y edita banners promocionales para tu app</p>
        </div>
      </div>

      {/* Formulario */}
      <BannerForm
        banner={editingBanner}
        onSubmit={currentFormSubmitHandler}
        isSubmitting={isCurrentFormSubmitting}
        submitButtonText={currentSubmitButtonText}
        fieldErrors={fieldErrors}
        formError={formError}
        onCancel={isEditing ? handleCancelEdit : undefined}
      />

      {/* Lista de Banners */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Banners Existentes</h2>
        </div>
        
        <div className="p-6">
          {initialBanners.length > 0 ? (
            <div className="space-y-4">
              {initialBanners.map((banner) => (
                <div key={banner.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Preview del banner */}
                  <div 
                    className="rounded-lg p-4 mb-4"
                    style={{ 
                      backgroundColor: banner.background_color || '#6366f1',
                      color: banner.text_color || '#ffffff'
                    }}
                  >
                    <h3 className="font-bold text-lg">{banner.title}</h3>
                    {banner.description && (
                      <p className="text-sm opacity-90 mt-1">{banner.description}</p>
                    )}
                  </div>

                  {/* Información y controles */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          banner.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {banner.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        
                        {banner.start_date && (
                          <span>Desde: {new Date(banner.start_date).toLocaleDateString()}</span>
                        )}
                        
                        {banner.end_date && (
                          <span>Hasta: {new Date(banner.end_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(banner.id, banner.is_active || false)}
                        disabled={isPendingToggle}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          banner.is_active
                            ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {banner.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      
                      <button
                        onClick={() => handleEditClick(banner)}
                        disabled={isPendingUpdate || isPendingAdd}
                        className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors"
                      >
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleDelete(banner.id)}
                        disabled={isPendingDelete}
                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No hay banners</h3>
                <p className="text-sm text-gray-500">Crea tu primer banner promocional usando el formulario de arriba.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 