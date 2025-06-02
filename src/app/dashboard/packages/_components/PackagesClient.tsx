'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { type PurchaseData } from '../page';

// Helper para formatear fechas
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'dd/MM/yyyy');
};

// Helper para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper para determinar el estado del paquete
const getPackageStatus = (purchase: PurchaseData) => {
  if (purchase.credits_remaining <= 0) {
    return { status: 'agotado', color: 'bg-red-100 text-red-800', text: 'Agotado' };
  }
  
  if (purchase.expiration_date) {
    const now = new Date();
    const expiration = new Date(purchase.expiration_date);
    if (expiration < now) {
      return { status: 'vencido', color: 'bg-red-100 text-red-800', text: 'Vencido' };
    }
    
    // Si vence en menos de 7 días
    const daysToExpire = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToExpire <= 7) {
      return { status: 'por-vencer', color: 'bg-yellow-100 text-yellow-800', text: `Vence en ${daysToExpire} días` };
    }
  }
  
  return { status: 'activo', color: 'bg-green-100 text-green-800', text: 'Activo' };
};

// Función para exportar a Excel (CSV)
const exportToExcel = (purchases: PurchaseData[]) => {
  // Crear headers
  const headers = [
    'Fecha Compra',
    'Cliente',
    'Email',
    'Teléfono',
    'Cédula',
    'Dirección',
    'Paquete',
    'Precio',
    'Créditos Totales',
    'Créditos Restantes',
    'Fecha Vencimiento',
    'Estado',
    'Código Autorización',
    'ID Transacción'
  ];

  // Crear filas de datos
  const rows = purchases.map(purchase => [
    formatDate(purchase.purchase_date),
    purchase.users?.name || 'N/A',
    purchase.users?.email || 'N/A',
    purchase.users?.phone || 'N/A',
    purchase.users?.cedula || 'N/A',
    purchase.users?.address || 'N/A',
    purchase.packages?.name || 'N/A',
    purchase.packages?.price || 0,
    purchase.packages?.class_credits || 0,
    purchase.credits_remaining,
    formatDate(purchase.expiration_date),
    getPackageStatus(purchase).text,
    purchase.authorization_code || 'N/A',
    purchase.transaction_id || 'N/A'
  ]);

  // Combinar headers y rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Crear y descargar archivo
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `paquetes_comprados_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Componente selector custom
function CustomSelect({ 
  value, 
  onChange, 
  options 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);
  const selectRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 flex items-center justify-between"
      >
        <span>{selectedOption?.label || 'Seleccionar...'}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                  value === option.value ? 'bg-indigo-50 text-indigo-600' : 'text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PackagesClient({ initialPurchases }: { initialPurchases: PurchaseData[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Filtrar paquetes
  const filteredPurchases = initialPurchases.filter(purchase => {
    const matchesSearch = 
      purchase.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.packages?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const packageStatus = getPackageStatus(purchase).status;
    const matchesStatus = statusFilter === 'todos' || packageStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Búsqueda */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Buscar por cliente, email o paquete..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>

            {/* Filtro por estado */}
            <div className="min-w-48">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'todos', label: 'Todos los estados' },
                  { value: 'activo', label: 'Activos' },
                  { value: 'por-vencer', label: 'Por vencer' },
                  { value: 'vencido', label: 'Vencidos' },
                  { value: 'agotado', label: 'Agotados' }
                ]}
              />
            </div>
          </div>

          {/* Botón de exportar */}
          <button
            onClick={() => exportToExcel(filteredPurchases)}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar Excel</span>
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{filteredPurchases.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredPurchases.filter(p => getPackageStatus(p).status === 'activo').length}
            </div>
            <div className="text-sm text-gray-600">Activos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredPurchases.filter(p => getPackageStatus(p).status === 'por-vencer').length}
            </div>
            <div className="text-sm text-gray-600">Por vencer</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredPurchases.filter(p => ['vencido', 'agotado'].includes(getPackageStatus(p).status)).length}
            </div>
            <div className="text-sm text-gray-600">Vencidos/Agotados</div>
          </div>
        </div>
      </div>

      {/* Tabla de paquetes */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-5 text-left">Cliente</th>
                <th className="py-3 px-5 text-left">Paquete</th>
                <th className="py-3 px-5 text-center">Créditos</th>
                <th className="py-3 px-5 text-center">Precio</th>
                <th className="py-3 px-5 text-center">Compra</th>
                <th className="py-3 px-5 text-center">Vencimiento</th>
                <th className="py-3 px-5 text-center">Estado</th>
                <th className="py-3 px-5 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => {
                  const status = getPackageStatus(purchase);
                  return (
                    <tr key={purchase.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-5 text-left">
                        <div>
                          <div className="font-medium">{purchase.users?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{purchase.users?.email}</div>
                          {purchase.users?.phone && (
                            <div className="text-xs text-gray-500">{purchase.users.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-left">
                        <div className="font-medium">{purchase.packages?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">
                          {purchase.packages?.class_credits} créditos totales
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <div className="font-medium">{purchase.credits_remaining}</div>
                        <div className="text-xs text-gray-500">restantes</div>
                      </td>
                      <td className="py-3 px-5 text-center font-medium">
                        {formatCurrency(purchase.packages?.price || 0)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {formatDate(purchase.purchase_date)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {formatDate(purchase.expiration_date)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <div className="text-xs text-gray-500">
                          {purchase.authorization_code && (
                            <div>Autorización: {purchase.authorization_code}</div>
                          )}
                          {purchase.transaction_id && (
                            <div>Transacción: {purchase.transaction_id}</div>
                          )}
                          {purchase.users?.cedula && (
                            <div>Cédula: {purchase.users.cedula}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 px-5 text-center text-gray-500">
                    No se encontraron paquetes con los filtros aplicados.
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