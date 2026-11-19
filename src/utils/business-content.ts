export function unwrapData(ctx: any): Record<string, any> {
  const input = (ctx.request.body ?? {}) as Record<string, any>;
  return input.data && typeof input.data === 'object' && !Array.isArray(input.data)
    ? input.data
    : input;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePromotion(data: Record<string, any>) {
  if (typeof data.titulo !== 'string' || data.titulo.trim().length < 2 || data.titulo.trim().length > 200) {
    throw new Error('titulo es obligatorio y debe tener entre 2 y 200 caracteres.');
  }
  data.titulo = data.titulo.trim();
  if (!['descuento', 'dos-por-uno', 'envio-gratis', 'especial'].includes(data.tipo)) {
    throw new Error('tipo debe ser descuento, dos-por-uno, envio-gratis o especial.');
  }
  if (!validDate(data.fechaInicio) || !validDate(data.fechaFin)) {
    throw new Error('fechaInicio y fechaFin deben usar el formato YYYY-MM-DD.');
  }
  if (data.fechaFin < data.fechaInicio) throw new Error('fechaFin no puede ser anterior a fechaInicio.');
  if (data.tipo === 'descuento') {
    const value = Number(data.valor);
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      throw new Error('valor es obligatorio para descuentos y debe estar entre 0 y 100.');
    }
  } else if (data.valor !== undefined && data.valor !== null && !Number.isFinite(Number(data.valor))) {
    throw new Error('valor debe ser numérico.');
  }
}

export function validateBanner(data: Record<string, any>) {
  if (typeof data.titulo !== 'string' || data.titulo.trim().length < 2 || data.titulo.trim().length > 200) {
    throw new Error('titulo es obligatorio y debe tener entre 2 y 200 caracteres.');
  }
  data.titulo = data.titulo.trim();
  const target = data.enlaceDestino;
  if (typeof target !== 'string' || target.length > 500) throw new Error('enlaceDestino es obligatorio.');
  const internalPath = target.startsWith('/') && !target.startsWith('//');
  let secureExternalUrl = false;
  try {
    const parsed = new URL(target);
    secureExternalUrl = ['https:', 'http:'].includes(parsed.protocol);
  } catch { /* A non-URL destination must be a local path. */ }
  if (!internalPath && !secureExternalUrl) {
    throw new Error('enlaceDestino debe ser una ruta local o una URL HTTP/HTTPS válida.');
  }
  if (!Number.isInteger(Number(data.ordenVisualizacion)) || Number(data.ordenVisualizacion) < 0) {
    throw new Error('ordenVisualizacion debe ser un entero igual o mayor que cero.');
  }
}

export function validateBranch(data: Record<string, any>) {
  for (const [field, label, max] of [
    ['nombre', 'nombre', 160],
    ['ciudad', 'ciudad', 120],
    ['telefono', 'telefono', 40],
    ['diasAtencion', 'diasAtencion', 120],
  ] as const) {
    if (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > max) {
      throw new Error(`${label} es obligatorio y no puede superar ${max} caracteres.`);
    }
    data[field] = data[field].trim();
  }
  if (typeof data.direccion !== 'string' || !data.direccion.trim()) {
    throw new Error('direccion es obligatoria.');
  }
  const timePattern = /^(([01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d)(?:\.(\d{3}))?)?$/;
  const validTime = (value: unknown) => typeof value === 'string' && timePattern.test(value);
  if (!validTime(data.horaApertura) || !validTime(data.horaCierre)) {
    throw new Error('horaApertura y horaCierre deben usar el formato HH:mm o HH:mm:ss.');
  }
  const normalizeTime = (value: string) => {
    const match = value.match(timePattern)!;
    return `${match[1]}:${match[3] ?? '00'}.${match[4] ?? '000'}`;
  };
  data.horaApertura = normalizeTime(data.horaApertura);
  data.horaCierre = normalizeTime(data.horaCierre);
  const toSeconds = (value: string) => {
    const [hours, minutes, seconds = '0'] = value.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  };
  if (toSeconds(data.horaCierre) <= toSeconds(data.horaApertura)) {
    throw new Error('horaCierre debe ser posterior a horaApertura.');
  }

  const hasLatitude = data.latitud !== undefined && data.latitud !== null && data.latitud !== '';
  const hasLongitude = data.longitud !== undefined && data.longitud !== null && data.longitud !== '';
  if (hasLatitude !== hasLongitude) throw new Error('latitud y longitud deben enviarse juntas.');
  if (hasLatitude) {
    const latitude = Number(data.latitud);
    const longitude = Number(data.longitud);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('latitud debe estar entre -90 y 90.');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('longitud debe estar entre -180 y 180.');
  }
}
