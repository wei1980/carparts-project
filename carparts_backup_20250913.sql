--
-- PostgreSQL database dump
--

\restrict aoPXhoNHQ3vE22sTvRZGTdEsEjzyayOAOPZTxvLiEXkdB8ijYttlm6TYL6hrtPC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: rule_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rule_type AS ENUM (
    'discount_pct',
    'add_pct',
    'fixed_price',
    'fixed_markup'
);


ALTER TYPE public.rule_type OWNER TO postgres;

--
-- Name: scope_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.scope_type AS ENUM (
    'part',
    'brand',
    'category',
    'global'
);


ALTER TYPE public.scope_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'wholesaler',
    'garage',
    'member',
    'retail'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: generations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generations (
    id integer NOT NULL,
    model_id integer NOT NULL,
    name character varying(50),
    year_from integer,
    year_to integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.generations OWNER TO postgres;

--
-- Name: generations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.generations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.generations_id_seq OWNER TO postgres;

--
-- Name: generations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.generations_id_seq OWNED BY public.generations.id;


--
-- Name: makes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.makes (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    country character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.makes OWNER TO postgres;

--
-- Name: makes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.makes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.makes_id_seq OWNER TO postgres;

--
-- Name: makes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.makes_id_seq OWNED BY public.makes.id;


--
-- Name: models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.models (
    id integer NOT NULL,
    make_id integer NOT NULL,
    name character varying(100) NOT NULL,
    external_code character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.models OWNER TO postgres;

--
-- Name: models_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.models_id_seq OWNER TO postgres;

--
-- Name: models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.models_id_seq OWNED BY public.models.id;


--
-- Name: part_compatibilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.part_compatibilities (
    id integer NOT NULL,
    part_id integer NOT NULL,
    vehicle_variant_id integer NOT NULL,
    note jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.part_compatibilities OWNER TO postgres;

--
-- Name: part_compatibilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.part_compatibilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.part_compatibilities_id_seq OWNER TO postgres;

--
-- Name: part_compatibilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.part_compatibilities_id_seq OWNED BY public.part_compatibilities.id;


--
-- Name: parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parts (
    id integer NOT NULL,
    sku character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100) NOT NULL,
    brand character varying(100),
    price_twd numeric(12,2) NOT NULL,
    cost_twd numeric(12,2),
    currency character varying(3) DEFAULT 'TWD'::character varying,
    weight_kg numeric(8,3),
    vat_included boolean DEFAULT true,
    stock_qty integer DEFAULT 0,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT parts_price_twd_check CHECK ((price_twd > (0)::numeric)),
    CONSTRAINT parts_stock_qty_check CHECK ((stock_qty >= 0))
);


ALTER TABLE public.parts OWNER TO postgres;

--
-- Name: parts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parts_id_seq OWNER TO postgres;

--
-- Name: parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parts_id_seq OWNED BY public.parts.id;


--
-- Name: price_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_rules (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    role public.user_role,
    scope_type public.scope_type NOT NULL,
    scope_value character varying(100),
    rule_type public.rule_type NOT NULL,
    value numeric(10,4) NOT NULL,
    priority integer DEFAULT 10,
    active boolean DEFAULT true,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.price_rules OWNER TO postgres;

--
-- Name: price_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_rules_id_seq OWNER TO postgres;

--
-- Name: price_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_rules_id_seq OWNED BY public.price_rules.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    display_name character varying(100),
    email character varying(255),
    role public.user_role NOT NULL,
    price_tier character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicle_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_variants (
    id integer NOT NULL,
    model_id integer NOT NULL,
    generation_id integer,
    variant_name character varying(100),
    year_from integer NOT NULL,
    year_to integer NOT NULL,
    engine_code character varying(50),
    displacement_cc integer,
    power_ps integer,
    intake_type character varying(50),
    drive_type character varying(20),
    front_suspension character varying(100),
    rear_suspension character varying(100),
    fuel_type character varying(50) NOT NULL,
    special_tech text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vehicle_variants OWNER TO postgres;

--
-- Name: vehicle_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vehicle_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vehicle_variants_id_seq OWNER TO postgres;

--
-- Name: vehicle_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vehicle_variants_id_seq OWNED BY public.vehicle_variants.id;


--
-- Name: generations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generations ALTER COLUMN id SET DEFAULT nextval('public.generations_id_seq'::regclass);


--
-- Name: makes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.makes ALTER COLUMN id SET DEFAULT nextval('public.makes_id_seq'::regclass);


--
-- Name: models id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models ALTER COLUMN id SET DEFAULT nextval('public.models_id_seq'::regclass);


--
-- Name: part_compatibilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_compatibilities ALTER COLUMN id SET DEFAULT nextval('public.part_compatibilities_id_seq'::regclass);


--
-- Name: parts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts ALTER COLUMN id SET DEFAULT nextval('public.parts_id_seq'::regclass);


--
-- Name: price_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_rules ALTER COLUMN id SET DEFAULT nextval('public.price_rules_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicle_variants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_variants ALTER COLUMN id SET DEFAULT nextval('public.vehicle_variants_id_seq'::regclass);


--
-- Data for Name: generations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.generations (id, model_id, name, year_from, year_to, created_at) FROM stdin;
\.


--
-- Data for Name: makes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.makes (id, name, country, created_at) FROM stdin;
\.


--
-- Data for Name: models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.models (id, make_id, name, external_code, created_at) FROM stdin;
\.


--
-- Data for Name: part_compatibilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.part_compatibilities (id, part_id, vehicle_variant_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parts (id, sku, name, category, brand, price_twd, cost_twd, currency, weight_kg, vat_included, stock_qty, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: price_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_rules (id, name, role, scope_type, scope_value, rule_type, value, priority, active, valid_from, valid_to, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, display_name, email, role, price_tier, created_at) FROM stdin;
\.


--
-- Data for Name: vehicle_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_variants (id, model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech, created_at) FROM stdin;
\.


--
-- Name: generations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.generations_id_seq', 1, false);


--
-- Name: makes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.makes_id_seq', 1, false);


--
-- Name: models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.models_id_seq', 1, false);


--
-- Name: part_compatibilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.part_compatibilities_id_seq', 1, false);


--
-- Name: parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parts_id_seq', 1, false);


--
-- Name: price_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_rules_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: vehicle_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vehicle_variants_id_seq', 1, false);


--
-- Name: generations generations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generations
    ADD CONSTRAINT generations_pkey PRIMARY KEY (id);


--
-- Name: makes makes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.makes
    ADD CONSTRAINT makes_name_key UNIQUE (name);


--
-- Name: makes makes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.makes
    ADD CONSTRAINT makes_pkey PRIMARY KEY (id);


--
-- Name: models models_make_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_make_id_name_key UNIQUE (make_id, name);


--
-- Name: models models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);


--
-- Name: part_compatibilities part_compatibilities_part_id_vehicle_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_compatibilities
    ADD CONSTRAINT part_compatibilities_part_id_vehicle_variant_id_key UNIQUE (part_id, vehicle_variant_id);


--
-- Name: part_compatibilities part_compatibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_compatibilities
    ADD CONSTRAINT part_compatibilities_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: parts parts_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_sku_key UNIQUE (sku);


--
-- Name: price_rules price_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_rules
    ADD CONSTRAINT price_rules_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vehicle_variants vehicle_variants_model_id_engine_code_year_from_year_to_var_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_variants
    ADD CONSTRAINT vehicle_variants_model_id_engine_code_year_from_year_to_var_key UNIQUE (model_id, engine_code, year_from, year_to, variant_name);


--
-- Name: vehicle_variants vehicle_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_variants
    ADD CONSTRAINT vehicle_variants_pkey PRIMARY KEY (id);


--
-- Name: idx_part_compatibilities_part_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_part_compatibilities_part_id ON public.part_compatibilities USING btree (part_id);


--
-- Name: idx_part_compatibilities_vehicle_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_part_compatibilities_vehicle_variant_id ON public.part_compatibilities USING btree (vehicle_variant_id);


--
-- Name: idx_parts_brand; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_parts_brand ON public.parts USING btree (brand);


--
-- Name: idx_parts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_parts_category ON public.parts USING btree (category);


--
-- Name: idx_price_rules_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_rules_role ON public.price_rules USING btree (role);


--
-- Name: idx_price_rules_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_rules_scope ON public.price_rules USING btree (scope_type, scope_value);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_vehicle_variants_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vehicle_variants_year ON public.vehicle_variants USING btree (year_from, year_to);


--
-- Name: parts update_parts_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_parts_timestamp BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: generations generations_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generations
    ADD CONSTRAINT generations_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- Name: models models_make_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_make_id_fkey FOREIGN KEY (make_id) REFERENCES public.makes(id) ON DELETE CASCADE;


--
-- Name: part_compatibilities part_compatibilities_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_compatibilities
    ADD CONSTRAINT part_compatibilities_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;


--
-- Name: part_compatibilities part_compatibilities_vehicle_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_compatibilities
    ADD CONSTRAINT part_compatibilities_vehicle_variant_id_fkey FOREIGN KEY (vehicle_variant_id) REFERENCES public.vehicle_variants(id) ON DELETE CASCADE;


--
-- Name: vehicle_variants vehicle_variants_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_variants
    ADD CONSTRAINT vehicle_variants_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.generations(id);


--
-- Name: vehicle_variants vehicle_variants_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_variants
    ADD CONSTRAINT vehicle_variants_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aoPXhoNHQ3vE22sTvRZGTdEsEjzyayOAOPZTxvLiEXkdB8ijYttlm6TYL6hrtPC

