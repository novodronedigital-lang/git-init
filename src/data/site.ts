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

export const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Quiénes somos", href: "/quienes-somos" },
  {
    label: "Servicios",
    href: "/servicios",
    children: [
      { label: "Actividades extraescolares", href: "/servicios/actividades-extraescolares" },
      { label: "Jornadas y eventos", href: "/servicios/jornadas-eventos" },
      { label: "Cursos y talleres", href: "/servicios/cursos-talleres" },
    ],
  },
  { label: "Precios", href: "/precios" },
  { label: "Cursos online", href: "/cursos" },
  { label: "Blog", href: "/blog" },
  { label: "Contacto", href: "/contacto" },
];
