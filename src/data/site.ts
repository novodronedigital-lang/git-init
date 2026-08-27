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
/** Tienda de la marca hermana Novodrone — sitio externo, sin relación con este proyecto. */
export const NOVODRONE_URL = "https://novodrone.com";

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
  /** Enlace a un sitio fuera de la red de dominios de DronEduca — se abre en pestaña nueva. */
  external?: boolean;
  children?: { label: string; href: string }[];
}

/**
 * Convierte una ruta que solo existe en el dominio de marketing (p. ej. "/cookies", "/aviso-legal") en el
 * href correcto según dónde se esté sirviendo la página actual — relativa si ya estamos en marketing,
 * absoluta al dominio de marketing si no. Úsalo en cualquier componente compartido entre los tres
 * subdominios (Footer, CookieBanner...) en vez de un href relativo a pelo, que solo funciona por casualidad
 * mientras el componente solo se use en páginas de marketing.
 */
export function getMarketingHref(path: string, target: string = SITE_TARGET): string {
  return IS_DEV || target === "marketing" ? path : `${MARKETING_URL}${path}`;
}

/** Href a "Mi campus" desde fuera del subdominio de formación (p. ej. el enlace "Ver campus" del admin). */
export function getCampusHref(): string {
  return IS_DEV ? "/campus" : `${FORMACION_URL}/campus`;
}

/**
 * Construye el nav según el subdominio actual: los enlaces que viven en el mismo dominio quedan relativos,
 * y los que cruzan a otro subdominio se vuelven absolutos. En local (astro dev) todo es siempre relativo.
 */
export function getNavLinks(target: string = SITE_TARGET): NavLink[] {
  const cursosHref = IS_DEV || target === "formacion" ? "/cursos" : `${FORMACION_URL}/cursos`;
  const marketingHref = (path: string) => getMarketingHref(path, target);

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
    { label: "Tienda de drones", href: NOVODRONE_URL, external: true },
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

/** Href público de una galería, absoluto si estamos fuera del dominio de marketing (p. ej. desde /admin). */
export function getGaleriaHref(slug: string): string {
  return IS_DEV || SITE_TARGET === "marketing" ? `/galeria/${slug}` : `${MARKETING_URL}/galeria/${slug}`;
}
