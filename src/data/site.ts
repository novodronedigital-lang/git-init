export const SITE = {
  name: "DronEduca",
  tagline: "Actividades con drones para niños",
  description:
    "Actividades extraescolares, jornadas y eventos con drones para niños y jóvenes en Zaragoza. Aprenden a volar con seguridad, diversión y formación de calidad.",
  url: "https://droneduca.es",
  email: "hola@droneduca.com",
  phone: "+34 663 30 75 62",
  location: "Calle Adolfo Aznar 28, Zaragoza",
  instagram: "https://instagram.com/droneduca",
};

export const MARKETING_URL = "https://droneduca.es";
export const FORMACION_URL = "https://formacion.droneduca.es";
export const ADMIN_URL = "https://admin.droneduca.es";

/**
 * Datos legales/fiscales del titular, para el Aviso Legal, la Política de Privacidad y los Términos de
 * Servicio. "DronEduca" y "Novodrone" son marcas comerciales; el titular legal es la cooperativa.
 */
export const LEGAL = {
  legalName: "SJM TECH S.COOP",
  cif: "F99553935",
  // Falta el código postal — añádelo aquí en cuanto lo tengas a mano.
  address: "Calle Sierra de Guara, 2, Zaragoza",
  // Falta el número de inscripción en el Registro de Sociedades Cooperativas de Aragón — añádelo aquí.
  registryNote: "Inscrita en el Registro de Sociedades Cooperativas de Aragón.",
};

/**
 * Qué subdominio se está generando en este build: "marketing" (droneduca.es, por defecto en local),
 * "formacion" (formacion.droneduca.es) o "admin" (admin.droneduca.es).
 */
export const SITE_TARGET = (import.meta.env.PUBLIC_SITE_TARGET as string | undefined) || "marketing";

/** En `astro dev` todo se sirve junto en localhost, así que los enlaces siempre deben ser relativos. */
const IS_DEV = import.meta.env.DEV;

interface NavLink {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

/**
 * Construye el nav según el subdominio actual: los enlaces que viven en el mismo dominio quedan relativos,
 * y los que cruzan a otro subdominio se vuelven absolutos. En local (astro dev) todo es siempre relativo.
 */
export function getNavLinks(target: string = SITE_TARGET): NavLink[] {
  const cursosHref = IS_DEV || target === "formacion" ? "/cursos" : `${FORMACION_URL}/cursos`;

  const marketingHref = (path: string) => (IS_DEV || target === "marketing" ? path : `${MARKETING_URL}${path}`);

  return [
    { label: "Inicio", href: marketingHref("/") },
    { label: "Quiénes somos", href: marketingHref("/quienes-somos") },
    {
      label: "Servicios",
      href: marketingHref("/servicios"),
      children: [
        { label: "Actividades extraescolares", href: marketingHref("/servicios/actividades-extraescolares") },
        { label: "Jornadas y eventos", href: marketingHref("/servicios/jornadas-eventos") },
        { label: "Cursos y talleres", href: marketingHref("/servicios/cursos-talleres") },
      ],
    },
    { label: "Precios", href: marketingHref("/precios") },
    { label: "Cursos online", href: cursosHref },
    { label: "Blog", href: marketingHref("/blog") },
    { label: "Contacto", href: marketingHref("/contacto") },
  ];
}

/** Href del logo: a la home de marketing, absoluto si estamos en otro subdominio (nunca en local). */
export function getHomeHref(target: string = SITE_TARGET): string {
  return IS_DEV || target === "marketing" ? "/" : `${MARKETING_URL}/`;
}

/** Href de contacto, para enlaces sueltos fuera del nav que también cruzan de dominio (p. ej. desde /campus). */
export function getContactoHref(target: string = SITE_TARGET): string {
  return IS_DEV || target === "marketing" ? "/contacto" : `${MARKETING_URL}/contacto`;
}

/** Href al panel de administración desde fuera de él (p. ej. el botón "Admin" de /campus). */
export function getAdminHref(): string {
  return IS_DEV ? "/admin" : `${ADMIN_URL}/`;
}
