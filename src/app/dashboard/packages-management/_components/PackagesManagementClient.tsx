'use client';

import { useState, useTransition } from 'react';
import { type Package } from '../page';
import { addPackage, updatePackage, deletePackage } from '../actions';
import { EyeOff, Edit } from 'lucide-react';

// Helper para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Componente para el formulario de paquetes
function PackageForm({
  package: pkg,
  onSubmit,
  isSubmitting,
  submitButtonText,
  fieldErrors,
  formError,
  onCancel,
}: {
  package?: Package | null;
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
      autoComplete="off"
      className="p-6 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-white shadow-sm mb-6"
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        <div className="w-2 h-2 bg-[#D7BAF6] rounded-full mr-3"></div>
        {pkg ? 'Editar Paquete' : 'Crear Nuevo Paquete'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Paquete*
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={pkg?.name ?? ''}
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] focus:border-[#D7BAF6] text-gray-900"
            placeholder="ej: Paquete 10 clases"
          />
          {fieldErrors?.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name.join(', ')}</p>}
        </div>

        {/* Precio */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Precio (USD)*
          </label>
          <input
            type="number"
            id="price"
            name="price"
            required
            min="0"
            step="0.01"
            defaultValue={pkg?.price ?? ''}
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] focus:border-[#D7BAF6] text-gray-900"
            placeholder="ej: 50.00"
          />
          {fieldErrors?.price && <p className="mt-1 text-xs text-red-500">{fieldErrors.price.join(', ')}</p>}
        </div>

        {/* Créditos */}
        <div>
          <label htmlFor="class_credits" className="block text-sm font-medium text-gray-700 mb-1">
            Número de Clases*
          </label>
          <input
            type="number"
            id="class_credits"
            name="class_credits"
            required
            min="1"
            defaultValue={pkg?.class_credits ?? ''}
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] focus:border-[#D7BAF6] text-gray-900"
            placeholder="ej: 10"
          />
          {fieldErrors?.class_credits && <p className="mt-1 text-xs text-red-500">{fieldErrors.class_credits.join(', ')}</p>}
        </div>

        {/* Días de expiración */}
        <div>
          <label htmlFor="expiration_days" className="block text-sm font-medium text-gray-700 mb-1">
            Días de Expiración
          </label>
          <input
            type="number"
            id="expiration_days"
            name="expiration_days"
            min="1"
            defaultValue={pkg?.expiration_days ?? ''}
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D7BAF6] focus:border-[#D7BAF6] text-gray-900"
            placeholder="ej: 90 (opcional)"
          />
          {fieldErrors?.expiration_days && <p className="mt-1 text-xs text-red-500">{fieldErrors.expiration_days.join(', ')}</p>}
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
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {pkg && onCancel && (
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
            className="px-6 py-2 bg-[#D7BAF6] text-black font-medium rounded-lg hover:bg-[#8B7EE6] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                Guardando...
              </div>
            ) : submitButtonText}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function PackagesManagementClient({ packages }: { packages: Package[] }) {
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isPendingAdd, startTransitionAdd] = useTransition();
  const [isPendingUpdate, startTransitionUpdate] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddSubmit = async (formData: FormData) => {
    startTransitionAdd(async () => {
      setFormError(null);
      setFieldErrors(null);
      const result = await addPackage(formData);
      if (result?.error) {
        setFormError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        setFormError(null);
        setFieldErrors(null);
      }
    });
  };

  const handleUpdateSubmit = async (formData: FormData) => {
    if (!editingPackage) return;
    startTransitionUpdate(async () => {
      setFormError(null);
      setFieldErrors(null);
      const result = await updatePackage(editingPackage.id, formData);
      if (result?.error) {
        setFormError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        setEditingPackage(null);
        setFormError(null);
        setFieldErrors(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de ocultar este paquete? Los clientes no podrán comprarlo, pero las compras existentes se mantendrán.')) {
      startTransitionDelete(async () => {
        setDeleteError(null);
        const result = await deletePackage(id);
        if (result?.error) {
          setDeleteError(result.error);
        }
      });
    }
  };

  const handleEditClick = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormError(null);
    setFieldErrors(null);
  };

  const handleCancelEdit = () => {
    setEditingPackage(null);
    setFormError(null);
    setFieldErrors(null);
  };

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <PackageForm
        package={editingPackage}
        onSubmit={editingPackage ? handleUpdateSubmit : handleAddSubmit}
        isSubmitting={editingPackage ? isPendingUpdate : isPendingAdd}
        submitButtonText={editingPackage ? 'Actualizar Paquete' : 'Crear Paquete'}
        fieldErrors={fieldErrors}
        formError={formError}
        onCancel={editingPackage ? handleCancelEdit : undefined}
      />

      {/* Errores de eliminación */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center text-sm text-red-600">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            <span className="font-medium">{deleteError}</span>
          </div>
        </div>
      )}

      {/* Lista de paquetes */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Paquetes Disponibles</h3>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los paquetes de clases que ofreces
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-5 text-left">Nombre</th>
                <th className="py-3 px-5 text-center">Precio</th>
                <th className="py-3 px-5 text-center">Clases</th>
                <th className="py-3 px-5 text-center">Expiración</th>
                <th className="py-3 px-5 text-center">Precio por Clase</th>
                <th className="py-3 px-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {packages.length > 0 ? (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-5 text-left">
                      <div className="font-medium">{pkg.name}</div>
                    </td>
                    <td className="py-3 px-5 text-center font-medium">
                      {formatCurrency(pkg.price)}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {pkg.class_credits} clases
                    </td>
                    <td className="py-3 px-5 text-center">
                      {pkg.expiration_days ? `${pkg.expiration_days} días` : 'Sin expiración'}
                    </td>
                    <td className="py-3 px-5 text-center font-medium">
                      {formatCurrency(pkg.price / pkg.class_credits)}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditClick(pkg)}
                          disabled={isPendingUpdate || isPendingDelete}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D7BAF6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          disabled={isPendingUpdate || isPendingDelete}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          <EyeOff className="w-4 h-4 mr-1" />
                          {isPendingDelete ? 'Ocultando...' : 'Ocultar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 px-5 text-center text-gray-500">
                    No hay paquetes disponibles. Crea el primer paquete.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 