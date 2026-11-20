import type { Schema, Struct } from '@strapi/strapi';

export interface CatalogoCaracteristica extends Struct.ComponentSchema {
  collectionName: 'components_catalogo_caracteristicas';
  info: {
    description: 'Elemento ordenado de las caracter\u00EDsticas del producto';
    displayName: 'Caracter\u00EDstica';
  };
  attributes: {
    nombre: Schema.Attribute.String & Schema.Attribute.Required;
    valor: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NegocioRedSocial extends Struct.ComponentSchema {
  collectionName: 'components_negocio_redes_sociales';
  info: {
    displayName: 'Red social';
  };
  attributes: {
    activo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    nombre: Schema.Attribute.Enumeration<
      ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin']
    > &
      Schema.Attribute.Required;
    url: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'catalogo.caracteristica': CatalogoCaracteristica;
      'negocio.red-social': NegocioRedSocial;
    }
  }
}
