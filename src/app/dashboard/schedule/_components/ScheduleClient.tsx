'use client';

import { useState, useTransition } from 'react';
import { getNextMonday, formatDate, toISOString } from '@/lib/utils/dateUtils';
import { addDefaultScheduleEntry, deleteDefaultScheduleEntry, updateDefaultScheduleEntry, generateWeeklyClasses } from '../actions';
import { type DefaultScheduleEntry, type Instructor } from '../page'; // Importar tipos desde la página
import CustomSelect from './CustomSelect';
import CustomTimeInput from './CustomTimeInput';

// Helper para formatear hora HH:MM
const formatTime = (timeString: string) => {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
};

// Arreglo de días en español para el select
const daysOfWeekSpanish = [
    { value: 'Monday', label: 'Lunes' },
    { value: 'Tuesday', label: 'Martes' },
    { value: 'Wednesday', label: 'Miércoles' },
    { value: 'Thursday', label: 'Jueves' },
    { value: 'Friday', label: 'Viernes' },
    { value: 'Saturday', label: 'Sábado' },
    { value: 'Sunday', label: 'Domingo' },
];

// Helper para traducir el nombre del día (si se recibe en inglés desde la BD)
const translateDay = (day: string): string => {
    const found = daysOfWeekSpanish.find(d => d.value === day);
    return found ? found.label : day; // Devuelve español o el original si no se encuentra
}

export default function ScheduleClient({
  initialDefaultSchedule,
  instructors,
}: {
  initialDefaultSchedule: DefaultScheduleEntry[];
  instructors: Instructor[];
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [addError, setAddError] = useState('');
  let [isPending, startTransition] = useTransition(); // Para la eliminación

  // Estados para el modal de confirmación simple
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<DefaultScheduleEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState('');

  // Estados para los selectores personalizados (formulario agregar)
  const [selectedWeekday, setSelectedWeekday] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Estados para el formulario de edición
  const [editWeekday, setEditWeekday] = useState('');
  const [editInstructor, setEditInstructor] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Eliminamos el uso del cliente de navegador para RPCs privilegiados

  // Preparar opciones para el selector de instructores
  const instructorOptions = instructors.map(instructor => ({
    value: instructor.id,
    label: instructor.name
  }));

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    setGenerateMessage('');
    setGenerateError('');
    const nextMonday = getNextMonday();
    const nextMondayString = toISOString(nextMonday).split('T')[0];

    try {
      const result = await generateWeeklyClasses(nextMondayString);
      if (result.error) {
        setGenerateError(result.error);
      } else {
        setGenerateMessage(result.message || `Clases para la semana del ${nextMondayString} generadas o ya existentes.`);
      }
    } catch (err: any) {
      console.error('Error generando horario:', err);
      setGenerateError(`Error al generar el horario: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddEntry = async (formData: FormData) => {
    setIsAdding(true);
    setAddMessage('');
    setAddError('');
    const result = await addDefaultScheduleEntry(formData);
    if (result.error) {
      setAddError(result.error);
    } else {
      setAddMessage(result.message || '¡Entrada añadida!');
      // Limpiar formulario
      setSelectedWeekday('');
      setSelectedInstructor('');
      setStartTime('');
      setEndTime('');
    }
    setIsAdding(false);
  };

  const handleEditEntry = (entry: DefaultScheduleEntry) => {
    setEntryToEdit(entry);
    setEditWeekday(entry.weekday);
    setEditInstructor(entry.instructor_id);
    setEditStartTime(entry.start_time);
    setEditEndTime(entry.end_time);
    setShowEditModal(true);
    setEditMessage('');
    setEditError('');
  };

  const handleUpdateEntry = async (formData: FormData) => {
    if (!entryToEdit) return;

    setIsEditing(true);
    setEditMessage('');
    setEditError('');
    
    const result = await updateDefaultScheduleEntry(entryToEdit.id, formData);
    
    if (result.error) {
      setEditError(result.error);
    } else {
      setEditMessage(result.message || '¡Entrada actualizada!');
      setTimeout(() => {
        setShowEditModal(false);
        setEntryToEdit(null);
        setEditMessage('');
        setEditError('');
      }, 1500);
    }
    
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEntryToEdit(null);
    setEditMessage('');
    setEditError('');
  };

  const handleDeleteEntry = (id: string) => {
    setEntryToDelete(id);
    setShowDeleteModal(true);
    setDeleteMessage('');
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    startTransition(async () => {
      const result = await deleteDefaultScheduleEntry(entryToDelete);
      
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setDeleteMessage(result.message || '¡Entrada eliminada!');
        setShowDeleteModal(false);
        setEntryToDelete(null);
      }
    });
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setEntryToDelete(null);
    setDeleteMessage('');
    setDeleteError('');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Gestionar Horario</h1>

      {/* Modal de edición */}
      {showEditModal && entryToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Editar Horario
            </h3>
            
            <form action={handleUpdateEntry} className="space-y-4">
              <div>
                <label htmlFor="edit_weekday" className="block text-sm font-medium text-gray-700 mb-2">
                  Día de la semana
                </label>
                <CustomSelect
                  id="edit_weekday"
                  name="weekday"
                  options={daysOfWeekSpanish}
                  value={editWeekday}
                  onChange={setEditWeekday}
                  placeholder="Selecciona Día"
                  required={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit_start_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Inicio
                  </label>
                  <CustomTimeInput
                    id="edit_start_time"
                    name="start_time"
                    value={editStartTime}
                    onChange={setEditStartTime}
                    required={true}
                  />
                </div>
                <div>
                  <label htmlFor="edit_end_time" className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Fin
                  </label>
                  <CustomTimeInput
                    id="edit_end_time"
                    name="end_time"
                    value={editEndTime}
                    onChange={setEditEndTime}
                    required={true}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit_instructor_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor
                </label>
                <CustomSelect
                  id="edit_instructor_id"
                  name="instructor_id"
                  options={instructorOptions}
                  value={editInstructor}
                  onChange={setEditInstructor}
                  placeholder={instructors.length === 0 ? 'No hay instructores' : 'Selecciona Instructor'}
                  disabled={instructors.length === 0}
                  required={true}
                />
              </div>

              {editMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{editMessage}</p>
                </div>
              )}
              
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{editError}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isEditing}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación simplificado */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ¿Eliminar horario?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Se eliminará la plantilla del horario. Las clases ya generadas se mantendrán como independientes.
            </p>

            {deleteMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{deleteMessage}</p>
              </div>
            )}
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={handleCancelDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de eliminación global */}
      {deleteMessage && !showDeleteModal && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">{deleteMessage}</p>
        </div>
      )}

      {deleteError && !showDeleteModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{deleteError}</p>
        </div>
      )}

      {/* Sección para Generar Clases Semanales */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
          <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
          Generar Clases Semanales
        </h2>
        <p className="mb-6 text-gray-600 leading-relaxed">
          El horario que configures abajo será utilizado para generar automáticamente las clases de la próxima semana.
          La generación ocurre cada domingo a las 9:00 PM, creando el horario que iniciará el lunes siguiente.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {generateMessage && (
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                {generateMessage}
              </div>
            )}
            {generateError && (
              <div className="flex items-center text-sm text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                {generateError}
              </div>
            )}
          </div>
          <button
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Generando...
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {`Generar para semana del ${formatDate(getNextMonday())}`}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Sección para Administrar Horario Default */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
            Horario Semanal por Defecto
          </h2>
        </div>

        {/* Formulario para Añadir Entrada */}
        <div className="p-6">
          <form action={handleAddEntry} className="mb-6 p-6 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-white shadow-sm">
             <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
               <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
               Añadir Nueva Entrada
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                      <label htmlFor="weekday" className="block text-sm font-medium text-gray-700">Día de la semana</label>
                      <CustomSelect
                          id="weekday"
                          name="weekday"
                          options={daysOfWeekSpanish}
                          value={selectedWeekday}
                          onChange={setSelectedWeekday}
                          placeholder="Selecciona Día"
                          required={true}
                      />
                  </div>
                   <div className="space-y-1">
                      <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Hora de Inicio</label>
                      <CustomTimeInput
                          id="start_time"
                          name="start_time"
                          value={startTime}
                          onChange={setStartTime}
                          required={true}
                       />
                  </div>
                  <div className="space-y-1">
                       <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">Hora de Finalización</label>
                       <CustomTimeInput
                          id="end_time"
                          name="end_time"
                          value={endTime}
                          onChange={setEndTime}
                          required={true}
                       />
                  </div>
                   <div className="space-y-1">
                      <label htmlFor="instructor_id" className="block text-sm font-medium text-gray-700">Instructor Asignado</label>
                      <CustomSelect
                          id="instructor_id"
                          name="instructor_id"
                          options={instructorOptions}
                          value={selectedInstructor}
                          onChange={setSelectedInstructor}
                          placeholder={instructors.length === 0 ? 'No hay instructores' : 'Selecciona Instructor'}
                          disabled={instructors.length === 0}
                          required={true}
                      />
                  </div>
             </div>
             <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
               <div className="flex items-center space-x-4">
                 {addMessage && (
                   <div className="flex items-center text-sm text-green-600">
                     <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                     {addMessage}
                   </div>
                 )}
                 {addError && (
                   <div className="flex items-center text-sm text-red-600">
                     <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                     {addError}
                   </div>
                 )}
               </div>
               <button
                    type="submit"
                    disabled={isAdding}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    {isAdding ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Añadiendo...
                      </div>
                    ) : 'Añadir Entrada'}
                </button>
             </div>
          </form>

          {/* Tabla del Horario Default Actual */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Día</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Inicio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Fin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initialDefaultSchedule.length > 0 ? (
                    initialDefaultSchedule.map((entry, index) => (
                      <tr key={entry.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{translateDay(entry.weekday)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTime(entry.start_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTime(entry.end_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{entry.instructors?.name ?? 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditEntry(entry)}
                              disabled={isPending}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                              aria-label="Editar entrada"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={isPending}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                              aria-label="Eliminar entrada"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No hay entradas en el horario</h3>
                          <p className="text-sm text-gray-500">Comienza añadiendo una nueva entrada usando el formulario de arriba.</p>
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