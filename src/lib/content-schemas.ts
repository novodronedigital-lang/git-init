export type FieldType = "text" | "textarea" | "string-list" | "object-list" | "icon";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  fields?: FieldDef[];
}

export interface ContentSchema {
  key: string;
  label: string;
  page: string;
  fields: FieldDef[];
}

export const ICON_OPTIONS = [
  "shield",
  "spark",
  "compass",
  "book",
  "users",
  "calendar",
  "trophy",
  "map-pin",
  "drone",
  "propeller",
  "check",
  "phone",
  "mail",
  "instagram",
];

const statFields: FieldDef[] = [
  { key: "value", label: "Valor", type: "text" },
  { key: "label", label: "Etiqueta", type: "text" },
];

const cardWithIconFields: FieldDef[] = [
  { key: "icon", label: "Icono", type: "icon" },
  { key: "title", label: "Título", type: "text" },
  { key: "description", label: "Descripción", type: "textarea" },
];

export const CONTENT_SCHEMAS: ContentSchema[] = [
  {
    key: "home.hero",
    label: "Inicio · Cabecera",
    page: "Inicio",
    fields: [
      { key: "badge", label: "Etiqueta superior", type: "text" },
      { key: "title", label: "Título", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "stats", label: "Estadísticas", type: "object-list", fields: statFields },
    ],
  },
  {
    key: "home.services",
    label: "Inicio · Servicios",
    page: "Inicio",
    fields: [
      {
        key: "items",
        label: "Servicios",
        type: "object-list",
        fields: [...cardWithIconFields, { key: "href", label: "Enlace", type: "text" }],
      },
    ],
  },
  {
    key: "home.benefits",
    label: "Inicio · Por qué elegirnos",
    page: "Inicio",
    fields: [{ key: "items", label: "Beneficios", type: "object-list", fields: cardWithIconFields }],
  },
  {
    key: "home.skills",
    label: "Inicio · Habilidades y destacado",
    page: "Inicio",
    fields: [
      { key: "title", label: "Título de la sección", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "items", label: "Habilidades", type: "string-list" },
      { key: "highlightTitle", label: "Título del recuadro destacado", type: "text" },
      { key: "highlightText", label: "Texto del recuadro destacado", type: "textarea" },
    ],
  },
  {
    key: "home.zaragoza",
    label: "Inicio · Zaragoza / fuera de Aragón",
    page: "Inicio",
    fields: [
      { key: "zaragozaTitle", label: "Título Zaragoza", type: "text" },
      { key: "zaragozaText", label: "Texto Zaragoza", type: "textarea" },
      { key: "outsideTitle", label: "Título fuera de Aragón", type: "text" },
      { key: "outsideText", label: "Texto fuera de Aragón", type: "textarea" },
    ],
  },
  {
    key: "quienes-somos.hero",
    label: "Quiénes somos · Cabecera",
    page: "Quiénes somos",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "stats", label: "Estadísticas", type: "object-list", fields: statFields },
      { key: "bannerTitle", label: "Título del recuadro oscuro", type: "text" },
      { key: "bannerText", label: "Texto del recuadro oscuro", type: "text" },
    ],
  },
  {
    key: "quienes-somos.milestones",
    label: "Quiénes somos · Nuestra historia",
    page: "Quiénes somos",
    fields: [
      {
        key: "items",
        label: "Hitos",
        type: "object-list",
        fields: [
          { key: "title", label: "Título", type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "quienes-somos.values",
    label: "Quiénes somos · Valores",
    page: "Quiénes somos",
    fields: [{ key: "items", label: "Valores", type: "object-list", fields: cardWithIconFields }],
  },
  {
    key: "quienes-somos.team",
    label: "Quiénes somos · Equipo",
    page: "Quiénes somos",
    fields: [
      { key: "title", label: "Título de la sección", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "items",
        label: "Personas del equipo",
        type: "object-list",
        fields: [
          { key: "name", label: "Nombre", type: "text" },
          { key: "role", label: "Rol", type: "text" },
        ],
      },
    ],
  },
  {
    key: "servicios.actividades-extraescolares",
    label: "Servicios · Actividades extraescolares",
    page: "Servicios",
    fields: [
      { key: "hero.title", label: "Título", type: "text" },
      { key: "hero.description", label: "Descripción", type: "textarea" },
      { key: "hero.note", label: "Nota (AMPA / equipo directivo)", type: "textarea" },
      {
        key: "levels",
        label: "Niveles",
        type: "object-list",
        fields: [
          { key: "title", label: "Título", type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
        ],
      },
      { key: "included", label: "Qué incluye", type: "string-list" },
    ],
  },
  {
    key: "servicios.jornadas-eventos",
    label: "Servicios · Jornadas y eventos",
    page: "Servicios",
    fields: [
      { key: "hero.title", label: "Título", type: "text" },
      { key: "hero.description", label: "Descripción", type: "textarea" },
      { key: "hero.bannerTitle", label: "Título recuadro oscuro", type: "text" },
      { key: "hero.bannerText", label: "Texto recuadro oscuro", type: "textarea" },
      { key: "formats", label: "Formatos", type: "object-list", fields: cardWithIconFields },
      { key: "audiences", label: "Trabajamos con", type: "string-list" },
    ],
  },
  {
    key: "servicios.cursos-talleres",
    label: "Servicios · Cursos y talleres",
    page: "Servicios",
    fields: [
      { key: "hero.title", label: "Título", type: "text" },
      { key: "hero.description", label: "Descripción", type: "textarea" },
      { key: "hero.noteTitle", label: "Título nota extraoficial", type: "text" },
      { key: "hero.noteText", label: "Texto nota extraoficial", type: "textarea" },
      { key: "intro", label: "Introducción a los talleres", type: "textarea" },
      {
        key: "courses",
        label: "Talleres",
        type: "object-list",
        fields: [
          { key: "icon", label: "Icono", type: "icon" },
          { key: "title", label: "Título", type: "text" },
          { key: "duration", label: "Duración", type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "precios.plans",
    label: "Precios · Planes",
    page: "Precios",
    fields: [
      {
        key: "items",
        label: "Planes",
        type: "object-list",
        fields: [
          { key: "name", label: "Nombre", type: "text" },
          { key: "price", label: "Precio", type: "text" },
          { key: "unit", label: "Unidad", type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
          { key: "href", label: "Enlace", type: "text" },
          { key: "bullets", label: "Características", type: "string-list" },
        ],
      },
    ],
  },
  {
    key: "precios.faqs",
    label: "Precios · Preguntas frecuentes",
    page: "Precios",
    fields: [
      {
        key: "items",
        label: "Preguntas",
        type: "object-list",
        fields: [
          { key: "q", label: "Pregunta", type: "text" },
          { key: "a", label: "Respuesta", type: "textarea" },
        ],
      },
    ],
  },
];

export function getSchema(key: string): ContentSchema | undefined {
  return CONTENT_SCHEMAS.find((s) => s.key === key);
}
