import { errors } from '@strapi/utils';

const UID = 'api::producto.producto';
const MAX_GALLERY_IMAGES = 4;

type LifecycleEvent = {
  action: 'beforeCreate' | 'beforeUpdate';
  params: { data: Record<string, unknown>; where?: Record<string, unknown> };
};
type StrapiLike = {
  db: {
    query(uid: string): {
      findOne(args: unknown): Promise<{ galeria?: MediaReference[] } | null>;
    };
  };
};

type MediaReference = number | string | { id?: number; documentId?: string };

function references(value: unknown): MediaReference[] {
  if (Array.isArray(value)) return value as MediaReference[];
  if (value && typeof value === 'object') {
    const operations = value as { set?: MediaReference[]; connect?: MediaReference[] };
    if (Array.isArray(operations.set)) return operations.set;
    if (Array.isArray(operations.connect)) return operations.connect;
  }
  return [];
}

function referenceKey(reference: MediaReference): string {
  if (typeof reference === 'object') return String(reference.documentId ?? reference.id);
  return String(reference);
}

async function validateGallery(event: LifecycleEvent): Promise<void> {
  const gallery = event.params.data.galeria;
  if (gallery === undefined) return;

  let count = references(gallery).length;
  const ops = gallery && typeof gallery === 'object' && !Array.isArray(gallery)
    ? gallery as { set?: MediaReference[]; connect?: MediaReference[]; disconnect?: MediaReference[] }
    : null;

  if (ops?.set) {
    count = ops.set.length;
  } else if (event.action === 'beforeUpdate' && (ops?.connect || ops?.disconnect)) {
    const strapi = (globalThis as typeof globalThis & { strapi?: StrapiLike }).strapi;
    if (strapi && event.params.where) {
      const existing = await strapi.db.query(UID).findOne({
        where: event.params.where,
        populate: { galeria: { select: ['id', 'documentId'] } },
      });
      const current = (existing?.galeria ?? []) as MediaReference[];
      const keys = new Set(current.map(referenceKey));
      for (const item of ops.connect ?? []) keys.add(referenceKey(item));
      for (const item of ops.disconnect ?? []) keys.delete(referenceKey(item));
      count = keys.size;
    } else {
      count = references(ops.connect).length;
    }
  }

  if (count > MAX_GALLERY_IMAGES) {
    throw new errors.ValidationError(`La galería admite hasta ${MAX_GALLERY_IMAGES} imágenes adicionales.`);
  }
}

export default {
  async beforeCreate(event: LifecycleEvent) {
    await validateGallery(event);
  },
  async beforeUpdate(event: LifecycleEvent) {
    await validateGallery(event);
  },
};
