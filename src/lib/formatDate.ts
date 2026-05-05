export function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return "Fecha pendiente";

  const [year, month, day] = fecha.split("-");

  if (!year || !month || !day) return fecha;

  return `${day}-${month}-${year}`;
}