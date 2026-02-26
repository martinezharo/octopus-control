CREATE TABLE public.productos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  descripcion text,
  precio numeric,
  categoria text,
  imagenes ARRAY,
  destacado boolean DEFAULT false,
  activo boolean DEFAULT true,
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);