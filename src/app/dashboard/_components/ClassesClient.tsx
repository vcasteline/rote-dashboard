'use client';

import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { type ClassData, type Instructor } from '../page'; // Importar tipos desde la página
import { updateClassName, updateClassInstructor, createClass, deleteClass, getLocations } from '../actions';
import { formatTime, formatDateFromString, getNowInEcuador, toISOString, toEcuadorDateTime } from '@/lib/utils/dateUtils';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import CustomSelect from '../schedule/_components/CustomSelect';

// Componente para manejar la edición inline del nombre
function EditableClassName({ cls, isPending }: { cls: ClassData; isPending: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(cls.name || '');
    const inputRef = useRef<HTMLInputElement>(null);
    const [localIsPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            // Llama a la Server Action para guardar
            await updateClassName(cls.id, name);
            setIsEditing(false);
            // La UI se actualizará por revalidatePath
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setName(cls.name || ''); // Revertir cambios
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave} // Guardar al perder foco
                onKeyDown={handleKeyDown}
                disabled={localIsPending || isPending}
                className="px-1 py-0.5 border border-[#d4bfad] rounded bg-[#f5ebe3] w-full text-sm text-[#330601]"
                autoFocus
            />
        );
    }

    return (
        <span             onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-[#e7ceb9] px-1 rounded">
            {cls.name || <span className="text-[#8a6b63] italic">Clic para añadir nombre</span>}
        </span>
    );
}

// Componente para manejar la edición inline del instructor
function EditableInstructor({ 
    cls, 
    instructors, 
    isPending 
}: { 
    cls: ClassData; 
    instructors: Instructor[]; 
    isPending: boolean 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedInstructorId, setSelectedInstructorId] = useState(cls.instructor_id || '');
    const [localIsPending, startTransition] = useTransition();

    const handleSave = (instructorId: string) => {
        if (instructorId === cls.instructor_id) {
            setIsEditing(false);
            return;
        }

        startTransition(async () => {
            const result = await updateClassInstructor(cls.id, instructorId);
            if (result.error) {
                alert(result.error);
                setSelectedInstructorId(cls.instructor_id || ''); // Revertir cambios
            }
            setIsEditing(false);
            // La UI se actualizará por revalidatePath
        });
    };

    const handleCancel = () => {
        setSelectedInstructorId(cls.instructor_id || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="relative">
                <select
                    value={selectedInstructorId}
                    onChange={(e) => handleSave(e.target.value)}
                    onBlur={() => handleCancel()}
                    disabled={localIsPending || isPending}
                    className="px-1 py-0.5 border border-[#d4bfad] rounded bg-[#f5ebe3] w-full text-sm text-[#330601]"
                    autoFocus
                >
                    <option value="">Seleccionar instructor</option>
                    {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                            {instructor.name}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <span 
            onClick={() => setIsEditing(true)} 
            className="cursor-pointer hover:bg-[#e7ceb9] px-1 rounded"
        >
            {cls.instructors?.name || <span className="text-[#8a6b63] italic">Clic para asignar</span>}
        </span>
    );
}

// Componente del modal para agregar clase
function AddClassModal({ 
  isOpen, 
  onClose, 
  instructors
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  instructors: Instructor[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<Array<{ id: string; name: string; address: string | null }>>([]);

  useEffect(() => {
    if (isOpen) {
      getLocations().then(result => {
        if (result.locations) {
          setLocations(result.locations);
        }
      });
    }
  }, [isOpen]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setMessage('');
    setError('');
    
    const result = await createClass(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      setMessage(result.message || 'Clase creada exitosamente');
      setTimeout(() => {
        onClose();
        setMessage('');
        setError('');
      }, 1500);
    }
    
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  // Usar Luxon para obtener fechas en zona horaria de Ecuador
  const todayInEcuador = getNowInEcuador();
  const todayString = toISOString(todayInEcuador).split('T')[0];
  
  // Permitir crear clases hasta 7 días desde hoy
  const maxDate = todayInEcuador.plus({ days: 7 });
  const maxDateString = toISOString(maxDate).split('T')[0];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div className="bg-[#f5ebe3] rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border-2 border-[#d4bfad]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#330601]">Agregar Nueva Clase</h2>
          <button
            onClick={onClose}
            className="text-[#8a6b63] hover:text-[#5d241d]"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-[#5d241d] mb-1">
              Fecha
            </label>
            <input
              type="date"
              id="date"
              name="date"
              min={todayString}
              max={maxDateString}
              required
              className="w-full px-3 py-2 border border-[#d4bfad] rounded-md focus:outline-none focus:ring-2 focus:ring-[#a75a4a] text-[#330601] bg-[#f5ebe3]"
            />
            <p className="text-xs text-[#8a6b63] mt-1">Puedes agregar clases desde hoy hasta 7 días adelante</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-[#5d241d] mb-1">
                Hora Inicio
              </label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                required
                className="w-full px-3 py-2 border border-[#d4bfad] rounded-md focus:outline-none focus:ring-2 focus:ring-[#a75a4a] text-[#330601] bg-[#f5ebe3]"
              />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-[#5d241d] mb-1">
                Hora Fin
              </label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                required
                className="w-full px-3 py-2 border border-[#d4bfad] rounded-md focus:outline-none focus:ring-2 focus:ring-[#a75a4a] text-[#330601] bg-[#f5ebe3]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="instructor_id" className="block text-sm font-medium text-[#5d241d] mb-1">
              Instructor
            </label>
            <select
              id="instructor_id"
              name="instructor_id"
              required
              className="w-full px-3 py-2 border border-[#d4bfad] rounded-md focus:outline-none focus:ring-2 focus:ring-[#a75a4a] text-[#330601] bg-[#f5ebe3]"
            >
              <option value="">Selecciona un instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>

          {locations.length > 0 && (
            <div>
              <label htmlFor="location_id" className="block text-sm font-medium text-[#5d241d] mb-1">
                Ubicación
              </label>
              <select
                id="location_id"
                name="location_id"
                className="w-full px-3 py-2 border border-[#d4bfad] rounded-md focus:outline-none focus:ring-2 focus:ring-[#a75a4a] text-[#330601] bg-[#f5ebe3]"
              >
                <option value="">Sin ubicación específica</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Modalidad siempre es 'cycle' con capacidad 25 */}
          <input type="hidden" name="modality" value="cycle" />
          <div>
            <label className="block text-sm font-medium text-[#5d241d] mb-1">
              Modalidad
            </label>
            <div className="w-full px-3 py-2 border border-[#d4bfad] rounded-md bg-[#f5ebe3] text-[#330601]">
              Cycle (Capacidad: 25)
            </div>
            <p className="text-xs text-[#8a6b63] mt-1">
              Capacidad automática: 25 espacios
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#5d241d] mb-1">
              Nombre de la Clase
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Ej: Cycling Intenso"
              className="w-full px-3 py-2 border border-[#d4bfad] rounded-md focus:outline-none focus:ring-2 focus:ring-[#a75a4a] text-[#330601] bg-[#f5ebe3]"
            />
          </div>

          {message && (
            <div className="p-3 bg-[#e7ceb9] border border-[#a75a4a] text-[#330601] rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#f5ebe3] border border-[#8b372d] text-[#5d241d] rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[#5d241d] border border-[#d4bfad] rounded-md hover:bg-[#e7ceb9] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#e7ceb9] text-[#330601] rounded-md hover:bg-[#a75a4a] disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#330601]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </>
              ) : (
                'Crear Clase'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    );
}

// Componente del modal para confirmar borrar clase
function DeleteClassModal({ 
  isOpen, 
  onClose, 
  classToDelete,
  onConfirm,
  isDeleting,
  message,
  error
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  classToDelete: ClassData | null;
  onConfirm: (id: string) => void;
  isDeleting: boolean;
  message: string;
  error: string;
}) {
  if (!isOpen || !classToDelete) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div className="bg-[#f5ebe3] rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border-2 border-[#d4bfad]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#330601]">Confirmar Eliminación</h2>
          <button
            onClick={onClose}
            className="text-[#8a6b63] hover:text-[#5d241d]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-12 h-12 text-[#8b372d]" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-[#330601]">
                ¿Estás seguro de borrar esta clase?
              </h3>
              <p className="text-sm text-[#8a6b63] mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="bg-[#e7ceb9] p-4 rounded-lg">
            <p className="text-sm text-[#330601]">
              <strong>Fecha:</strong> {formatDateFromString(classToDelete.date)}
            </p>
            <p className="text-sm text-[#330601]">
              <strong>Hora:</strong> {classToDelete.start_time} - {classToDelete.end_time}
            </p>
            <p className="text-sm text-[#330601]">
              <strong>Instructor:</strong> {classToDelete.instructors?.name ?? 'N/A'}
            </p>
            {classToDelete.name && (
              <p className="text-sm text-[#330601]">
                <strong>Nombre:</strong> {classToDelete.name}
              </p>
            )}
          </div>

          <div className="mt-4 p-3 bg-[#e7ceb9] border border-[#a75a4a] rounded">
            <div className="text-sm text-[#330601]">
              <p className="mb-2"><strong>¿Qué va a pasar?</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Sin reservas:</strong> Se borra completamente de la base de datos (cualquier clase)</li>
                <li><strong>Con reservas:</strong> Se marca como cancelada para preservar el historial</li>
                <li><strong>Spots:</strong> Se borran en ambos casos</li>
                <li><strong>Reservas activas:</strong> Impiden el borrado de clases futuras</li>
              </ul>
            </div>
          </div>

          {/* Mensajes de resultado */}
          {message && (
            <div className="mt-4 p-3 bg-[#e7ceb9] border border-[#a75a4a] text-[#330601] rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-[#f5ebe3] border border-[#8b372d] text-[#5d241d] rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-[#5d241d] border border-[#d4bfad] rounded-md hover:bg-[#e7ceb9] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(classToDelete.id)}
            disabled={isDeleting}
            className="px-4 py-2 bg-[#8b372d] text-[#e7ceb9] rounded-md hover:bg-[#5d241d] disabled:opacity-50 flex items-center"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Borrando...
              </>
            ) : (
              'Sí, Borrar Clase'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal del cliente
export default function ClassesClient({ 
  initialClasses, 
  instructors 
}: { 
  initialClasses: ClassData[]; 
  instructors: Instructor[];
}) {
  const [isPendingName, startTransitionName] = useTransition(); // Para el componente hijo
  const [isPendingInstructor, startTransitionInstructor] = useTransition(); // Para el instructor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; address: string | null }>>([]);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');

  // Cargar ubicaciones al montar el componente
  useEffect(() => {
    getLocations().then(result => {
      if (result.locations) {
        setLocations(result.locations);
      }
    });
  }, []);

  // Filtrar clases por ubicación
  const filteredClasses = useMemo(() => {
    if (!selectedLocationFilter) {
      return initialClasses;
    }
    return initialClasses.filter(cls => {
      // Comparar location_id directamente
      return cls.location_id === selectedLocationFilter;
    });
  }, [initialClasses, selectedLocationFilter]);

  // Función para abrir el modal de confirmación de borrado
  const handleDeleteClick = (cls: ClassData) => {
    setClassToDelete(cls);
    setIsDeleteModalOpen(true);
    setDeleteMessage('');
    setDeleteError('');
  };

  // Función para cerrar el modal de borrado
  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setClassToDelete(null);
    setDeleteMessage('');
    setDeleteError('');
  };

  // Función para confirmar el borrado
  const handleDeleteConfirm = async (classId: string) => {
    setIsDeleting(true);
    setDeleteMessage('');
    setDeleteError('');
    
    const result = await deleteClass(classId);
    
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeleteMessage(result.message || 'Clase borrada exitosamente');
      // Cerrar el modal después de 2 segundos si fue exitoso
      setTimeout(() => {
        handleDeleteModalClose();
      }, 2000);
    }
    
    setIsDeleting(false);
  };

  return (
    <div>
      {/* Botón para agregar nueva clase y filtro */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-[#5d241d]">
          Aquí puedes ver y gestionar las próximas clases programadas
        </p>
        <div className="flex items-center gap-4">
          {/* Filtro por ubicación */}
          {locations.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="location_filter" className="text-sm font-medium text-[#5d241d] whitespace-nowrap">
                Filtrar por ubicación:
              </label>
              <div className="w-48">
                <CustomSelect
                  id="location_filter"
                  options={[
                    { value: '', label: 'Todas las ubicaciones' },
                    ...locations.map(location => ({
                      value: location.id,
                      label: location.name
                    }))
                  ]}
                  value={selectedLocationFilter}
                  onChange={setSelectedLocationFilter}
                  placeholder="Todas las ubicaciones"
                />
              </div>
            </div>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#e7ceb9] text-[#330601] rounded-md hover:bg-[#a75a4a] flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Clase para Esta Semana
          </button>
        </div>
      </div>

      {/* Tabla de clases */}
    <div className="bg-white shadow-md rounded overflow-hidden">
      <table className="min-w-full leading-normal">
        <thead>
          <tr className="bg-[#d4bfad] text-[#5d241d] uppercase text-sm leading-normal">
            <th className="py-3 px-5 text-left">Fecha</th>
            <th className="py-3 px-5 text-left">Hora</th>
            <th className="py-3 px-5 text-left">Instructor</th>
            <th className="py-3 px-5 text-left">Modalidad</th>
            <th className="py-3 px-5 text-left">Ubicación</th>
            <th className="py-3 px-5 text-left">Nombre Clase</th>
            <th className="py-3 px-5 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="text-[#330601] text-sm font-light">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => (
              <tr key={cls.id} className="border-b border-[#d4bfad] hover:bg-gray-50">
                <td className="py-3 px-5 text-left whitespace-nowrap">
                    {formatDateFromString(cls.date)}
                </td>
                <td className="py-3 px-5 text-left whitespace-nowrap">
                    {`${cls.start_time} - ${cls.end_time}`}
                </td>
                <td className="py-3 px-5 text-left">
                  <EditableInstructor 
                    cls={cls} 
                    instructors={instructors} 
                    isPending={isPendingInstructor} 
                  />
                </td>
                <td className="py-3 px-5 text-left">
                  {cls.modality ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e7ceb9] text-[#330601] capitalize">
                      {cls.modality}
                    </span>
                  ) : (
                    <span className="text-[#8a6b63] italic">N/A</span>
                  )}
                </td>
                <td className="py-3 px-5 text-left">
                  {cls.locations?.name || <span className="text-[#8a6b63] italic">N/A</span>}
                </td>
                <td className="py-3 px-5 text-left">
                    <EditableClassName cls={cls} isPending={isPendingName} />
                </td>
                <td className="py-3 px-5 text-center">
                  <button
                    onClick={() => handleDeleteClick(cls)}
                    disabled={isDeleting}
                    className="text-[#8b372d] hover:text-[#5d241d] disabled:opacity-50 p-2 rounded hover:bg-[#f5ebe3]"
                    title="Borrar clase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="py-3 px-5 text-center">
                {selectedLocationFilter 
                  ? `No se encontraron clases para la ubicación seleccionada.`
                  : 'No se encontraron próximas clases.'
                }
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Modal para agregar clase */}
      <AddClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        instructors={instructors}
      />

      {/* Modal para borrar clase */}
      <DeleteClassModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        classToDelete={classToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        message={deleteMessage}
        error={deleteError}
      />

      {/* Mensajes de resultado del borrado */}
      {deleteMessage && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-[#e7ceb9] border border-[#a75a4a] text-[#330601] rounded shadow-lg">
          {deleteMessage}
        </div>
      )}

      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-[#f5ebe3] border border-[#8b372d] text-[#5d241d] rounded shadow-lg">
          {deleteError}
        </div>
      )}
    </div>
  );
} 