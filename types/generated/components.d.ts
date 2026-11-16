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

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'catalogo.caracteristica': CatalogoCaracteristica;
    }
  }
}
