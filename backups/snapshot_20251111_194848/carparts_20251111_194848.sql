--
-- PostgreSQL database dump
--

\restrict 72pM5fMnCU3Qf7Oa5LtAxpmxeRujW8D0RouZK0nRAp0NksWHRSC4q5XKIthHRkH

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
    'garage',
    'wholesaler',
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
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    parent_id integer,
    path character varying(255),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    is_nav boolean DEFAULT true NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: garage_query_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.garage_query_logs (
    id integer NOT NULL,
    garage_id integer NOT NULL,
    query_type character varying(50) NOT NULL,
    query_count integer DEFAULT 0,
    query_limit integer DEFAULT 100,
    reset_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.garage_query_logs OWNER TO postgres;

--
-- Name: garage_query_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.garage_query_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.garage_query_logs_id_seq OWNER TO postgres;

--
-- Name: garage_query_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.garage_query_logs_id_seq OWNED BY public.garage_query_logs.id;


--
-- Name: garages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.garages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    tax_id character varying(20),
    line_id character varying(50),
    phone character varying(20),
    contact_person character varying(100),
    address text NOT NULL,
    map_url text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    business_hours jsonb,
    specialized_brands integer[],
    feature_tags text[],
    payment_methods text[],
    technician_count integer,
    parking_slots integer,
    has_towing_service boolean DEFAULT false,
    license_photo_url text,
    environment_photos text[],
    revenue_share numeric(5,2),
    bank_account jsonb,
    user_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.garages OWNER TO postgres;

--
-- Name: garages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.garages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.garages_id_seq OWNER TO postgres;

--
-- Name: garages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.garages_id_seq OWNED BY public.garages.id;


--
-- Name: generations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generations (
    id integer NOT NULL,
    model_id integer NOT NULL,
    name character varying(50),
    year_from integer,
    year_to integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
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
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
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
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL
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
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    part_id integer NOT NULL,
    quantity integer NOT NULL,
    price_twd numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    garage_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


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
    image_url character varying(255),
    msrp_twd integer,
    wholesale_twd integer,
    availability_mode text,
    lead_time_days integer,
    CONSTRAINT parts_availability_mode_check CHECK (((availability_mode = ANY (ARRAY['stock'::text, 'lead'::text, 'mto'::text])) OR (availability_mode IS NULL))),
    CONSTRAINT parts_cost_twd_check CHECK ((cost_twd >= (0)::numeric)),
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
-- Name: parts_on_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parts_on_categories (
    id integer NOT NULL,
    part_id integer NOT NULL,
    category_id integer NOT NULL,
    is_primary boolean DEFAULT false
);


ALTER TABLE public.parts_on_categories OWNER TO postgres;

--
-- Name: parts_on_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parts_on_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parts_on_categories_id_seq OWNER TO postgres;

--
-- Name: parts_on_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parts_on_categories_id_seq OWNED BY public.parts_on_categories.id;


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
    display_name character varying(100) NOT NULL,
    email character varying(255),
    role public.user_role DEFAULT 'garage'::public.user_role NOT NULL,
    password_hash text NOT NULL,
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
    year_from integer NOT NULL,
    year_to integer NOT NULL,
    engine_code character varying(50),
    displacement_cc integer,
    power_ps integer,
    intake_type character varying(50),
    drive_type character varying(20),
    front_suspension character varying(100),
    rear_suspension character varying(100),
    fuel_type character varying(50) DEFAULT 'gasoline'::character varying NOT NULL,
    special_tech text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    name text
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
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: garage_query_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garage_query_logs ALTER COLUMN id SET DEFAULT nextval('public.garage_query_logs_id_seq'::regclass);


--
-- Name: garages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garages ALTER COLUMN id SET DEFAULT nextval('public.garages_id_seq'::regclass);


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
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: part_compatibilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_compatibilities ALTER COLUMN id SET DEFAULT nextval('public.part_compatibilities_id_seq'::regclass);


--
-- Name: parts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts ALTER COLUMN id SET DEFAULT nextval('public.parts_id_seq'::regclass);


--
-- Name: parts_on_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts_on_categories ALTER COLUMN id SET DEFAULT nextval('public.parts_on_categories_id_seq'::regclass);


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
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, parent_id, path, sort_order, is_active, is_nav) FROM stdin;
1	進氣	intake	\N	\N	0	t	t
3	進氣套件	intake-kit	1	\N	1	t	t
5	洩壓閥	bov-dv	1	\N	3	t	t
7	其他	intake-misc	1	\N	5	f	t
8	煞車	brakes	\N	\N	1	t	t
9	來令片	brake-pads	8	\N	0	t	t
10	碟盤	brake-rotors	8	\N	1	t	t
11	煞車油管	brake-lines	8	\N	2	t	t
13	底盤	suspension	\N	\N	2	t	t
14	避震器	coilover-damper	13	\N	0	t	t
15	短彈簧	lowering-springs	13	\N	1	t	t
16	防傾桿	sway-bars	13	\N	2	t	t
17	其他	susp-misc	13	\N	3	f	t
18	排氣	exhaust	\N	\N	3	t	t
19	排氣管	catback	18	\N	0	t	t
20	觸媒頭段	downpipe-cat	18	\N	1	t	t
21	其他	exhaust-misc	18	\N	2	f	t
22	引擎	engine	\N	\N	4	t	t
25	考爾	ignition-coils	22	\N	2	t	t
26	渦輪	turbocharger	22	\N	3	t	t
27	其他	engine-misc	22	\N	4	f	t
28	冷卻	cooling	\N	\N	5	t	t
29	水箱	radiators	28	\N	0	t	t
30	中冷器	intercoolers	28	\N	1	t	t
31	其他	cooling-misc	28	\N	2	f	t
32	傳動	drivetrain	\N	\N	6	t	t
33	離合器	clutch-kits	32	\N	0	t	t
34	飛輪	flywheels	32	\N	1	t	t
37	其他	drivetrain-misc	32	\N	4	f	t
38	燃油	fuel	\N	\N	7	t	t
39	汽油幫浦	fuel-pumps	38	\N	0	t	t
40	噴油嘴	injectors	38	\N	1	t	t
41	其他	fuel-misc	38	\N	2	f	t
42	輪圈	wheels	\N	\N	8	t	t
45	輪圈墊片	spacers	42	\N	2	t	t
46	輪胎	tires	42	\N	3	f	t
49	大燈	headlights	48	\N	0	f	t
50	維修保養	maintenance	\N	\N	11	f	f
52	工具設備	tools-garage	\N	\N	13	f	f
2	濾芯	air-filter	1	\N	0	t	t
12	煞車套件	bbk	8	\N	3	t	t
43	鋁圈	rims	42	\N	0	t	t
44	輪圈螺絲	wheel-bolts-nuts	42	\N	1	t	t
6	節氣門	throttle-body	1	\N	4	t	t
24	連桿	connecting-rods	22	\N	1	t	t
23	活塞	pistons	22	\N	0	t	t
35	差速器	differentals	32	\N	2	t	t
36	傳動軸	driveshafts	32	\N	3	t	t
47	外觀	exterior	\N	\N	9	t	t
4	渦輪管	turbo-inlet	1	\N	2	t	t
48	電系	electric	\N	\N	10	t	t
53	儀表	gauges	48	\N	0	t	t
51	動力	power	\N	\N	12	t	f
54	渦輪	turbo	51	\N	0	t	t
55	ECU	ecu	51	\N	1	t	t
\.


--
-- Data for Name: garage_query_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.garage_query_logs (id, garage_id, query_type, query_count, query_limit, reset_date, created_at) FROM stdin;
\.


--
-- Data for Name: garages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.garages (id, name, tax_id, line_id, phone, contact_person, address, map_url, latitude, longitude, business_hours, specialized_brands, feature_tags, payment_methods, technician_count, parking_slots, has_towing_service, license_photo_url, environment_photos, revenue_share, bank_account, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: generations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.generations (id, model_id, name, year_from, year_to, created_at, updated_at) FROM stdin;
1	1	E87	2004	2011	2025-09-16 01:08:47.522179	2025-11-08 23:27:54.79
2	2	E90	2005	2012	2025-09-16 01:08:47.533525	2025-11-08 23:27:54.79
4	2	F30	2012	2018	2025-09-16 01:08:47.542923	2025-11-08 23:27:54.79
6	2	G20	2019	2023	2025-09-16 01:08:47.548571	2025-11-08 23:27:54.79
7	3	E60	2003	2010	2025-09-16 01:08:47.55624	2025-11-08 23:27:54.79
8	3	F10	2010	2016	2025-09-16 01:08:47.559425	2025-11-08 23:27:54.79
9	3	G30	2017	2023	2025-09-16 01:08:47.562495	2025-11-08 23:27:54.79
10	4	F01	2008	2015	2025-09-16 01:08:47.568269	2025-11-08 23:27:54.79
11	4	G11	2015	2022	2025-09-16 01:08:47.572907	2025-11-08 23:27:54.79
13	5	F25	2010	2017	2025-09-16 01:08:47.579315	2025-11-08 23:27:54.79
14	5	G01	2017	2023	2025-09-16 01:08:47.582172	2025-11-08 23:27:54.79
15	6	E70	2006	2013	2025-09-16 01:08:47.587001	2025-11-08 23:27:54.79
16	6	F15	2013	2018	2025-09-16 01:08:47.590591	2025-11-08 23:27:54.79
17	6	G05	2018	2023	2025-09-16 01:08:47.594345	2025-11-08 23:27:54.79
18	7	E89	2009	2016	2025-09-16 01:08:47.598073	2025-11-08 23:27:54.79
19	7	G29	2018	2023	2025-09-16 01:08:47.602493	2025-11-08 23:27:54.79
20	8	I01	2013	2022	2025-09-16 01:08:47.606064	2025-11-08 23:27:54.79
21	9	I12	2014	2020	2025-09-16 01:08:47.609195	2025-11-08 23:27:54.79
22	10	I20	2021	2023	2025-09-16 01:08:47.612463	2025-11-08 23:27:54.79
23	11	E90	2007	2013	2025-09-16 01:08:47.616634	2025-11-08 23:27:54.79
24	11	F80	2014	2018	2025-09-16 01:08:47.619673	2025-11-08 23:27:54.79
26	12	F10	2011	2016	2025-09-16 01:08:47.62546	2025-11-08 23:27:54.79
27	12	F90	2017	2023	2025-09-16 01:08:47.628588	2025-11-08 23:27:54.79
28	13	F97	2019	2023	2025-09-16 01:08:47.632893	2025-11-08 23:27:54.79
29	14	F85	2013	2018	2025-09-16 01:08:47.636091	2025-11-08 23:27:54.79
30	15	F96	2019	2023	2025-09-16 01:08:47.639039	2025-11-08 23:27:54.79
31	16	F44	2020	2023	2025-09-16 01:08:47.642385	2025-11-08 23:27:54.79
32	17	F32	2014	2020	2025-09-16 01:08:47.64666	2025-11-08 23:27:54.79
33	17	G22	2020	2023	2025-09-16 01:08:47.649957	2025-11-08 23:27:54.79
34	18	G32	2017	2020	2025-09-16 01:08:47.653031	2025-11-08 23:27:54.79
35	19	G15	2018	2023	2025-09-16 01:08:47.65593	2025-11-08 23:27:54.79
36	20	G02	2018	2023	2025-09-16 01:08:47.659216	2025-11-08 23:27:54.79
37	21	G07	2018	2023	2025-09-16 01:08:47.663628	2025-11-08 23:27:54.79
38	22	G26	2021	2023	2025-09-16 01:08:47.666671	2025-11-08 23:27:54.79
39	23	G82	2022	2023	2025-09-16 01:08:47.669599	2025-11-08 23:27:54.79
41	24	G09	2023	2023	2025-09-16 01:08:47.675797	2025-11-08 23:27:54.79
42	2	E46	2003	2004	2025-09-16 01:08:47.679864	2025-11-08 23:27:54.79
43	25	W203	2004	2007	2025-09-16 01:08:47.683344	2025-11-08 23:27:54.79
44	25	W204	2008	2014	2025-09-16 01:08:47.686072	2025-11-08 23:27:54.79
45	25	W205	2015	2021	2025-09-16 01:08:47.688719	2025-11-08 23:27:54.79
46	25	W206	2021	2025	2025-09-16 01:08:47.691907	2025-11-08 23:27:54.79
47	26	W211	2004	2009	2025-09-16 01:08:47.696269	2025-11-08 23:27:54.79
48	26	W212	2009	2016	2025-09-16 01:08:47.699097	2025-11-08 23:27:54.79
49	26	W213	2016	2023	2025-09-16 01:08:47.702085	2025-11-08 23:27:54.79
50	26	W214	2023	2025	2025-09-16 01:08:47.704857	2025-11-08 23:27:54.79
51	27	W221	2006	2013	2025-09-16 01:08:47.708072	2025-11-08 23:27:54.79
52	27	W222	2014	2020	2025-09-16 01:08:47.712668	2025-11-08 23:27:54.79
53	27	W223	2021	2025	2025-09-16 01:08:47.715534	2025-11-08 23:27:54.79
54	28	X253	2015	2022	2025-09-16 01:08:47.718516	2025-11-08 23:27:54.79
55	28	X254	2022	2025	2025-09-16 01:08:47.721306	2025-11-08 23:27:54.79
56	29	W166	2015	2019	2025-09-16 01:08:47.724318	2025-11-08 23:27:54.79
57	29	W167	2019	2025	2025-09-16 01:08:47.729976	2025-11-08 23:27:54.79
58	30	W176	2012	2018	2025-09-16 01:08:47.733045	2025-11-08 23:27:54.79
59	30	W177	2018	2025	2025-09-16 01:08:47.735804	2025-11-08 23:27:54.79
60	31	X156	2014	2020	2025-09-16 01:08:47.738732	2025-11-08 23:27:54.79
61	31	H247	2020	2025	2025-09-16 01:08:47.743256	2025-11-08 23:27:54.79
62	32	X247	2019	2025	2025-09-16 01:08:47.746447	2025-11-08 23:27:54.79
63	33	W463	2004	2018	2025-09-16 01:08:47.74935	2025-11-08 23:27:54.79
64	33	W464	2018	2025	2025-09-16 01:08:47.752073	2025-11-08 23:27:54.79
65	34	V295	2022	2025	2025-09-16 01:08:47.755353	2025-11-08 23:27:54.79
66	35	V297	2021	2025	2025-09-16 01:08:47.760185	2025-11-08 23:27:54.79
67	36	C190	2015	2023	2025-09-16 01:08:47.763369	2025-11-08 23:27:54.79
68	36	C192	2023	2025	2025-09-16 01:08:47.76616	2025-11-08 23:27:54.79
69	37	X118	2013	2019	2025-09-16 01:08:47.769223	2025-11-08 23:27:54.79
71	38	R231	2012	2020	2025-09-16 01:08:47.776909	2025-11-08 23:27:54.79
72	38	R232	2022	2025	2025-09-16 01:08:47.779671	2025-11-08 23:27:54.79
73	39	B7	2004	2008	2025-09-16 01:08:47.783006	2025-11-08 23:27:54.79
75	39	B8	2008	2015	2025-09-16 01:08:47.789871	2025-11-08 23:27:54.79
76	39	B9	2015	2023	2025-09-16 01:08:47.793262	2025-11-08 23:27:54.79
77	39	B10	2023	2025	2025-09-16 01:08:47.796126	2025-11-08 23:27:54.79
78	40	C6	2005	2011	2025-09-16 01:08:47.799031	2025-11-08 23:27:54.79
79	40	C7	2011	2018	2025-09-16 01:08:47.801886	2025-11-08 23:27:54.79
80	40	C8	2018	2025	2025-09-16 01:08:47.805836	2025-11-08 23:27:54.79
81	41	D4	2010	2017	2025-09-16 01:08:47.809234	2025-11-08 23:27:54.79
82	41	D5	2017	2025	2025-09-16 01:08:47.812225	2025-11-08 23:27:54.79
83	42	8J	2006	2014	2025-09-16 01:08:47.815217	2025-11-08 23:27:54.79
85	43	8R	2009	2017	2025-09-16 01:08:47.823007	2025-11-08 23:27:54.79
86	43	FY	2017	2023	2025-09-16 01:08:47.826048	2025-11-08 23:27:54.79
88	44	4L	2006	2015	2025-09-16 01:08:47.832095	2025-11-08 23:27:54.79
91	45	GE	2019	2025	2025-09-16 01:08:47.842293	2025-11-08 23:27:54.79
92	46	J1	2021	2025	2025-09-16 01:08:47.845596	2025-11-08 23:27:54.79
93	47	C7	2013	2018	2025-09-16 01:08:47.848444	2025-11-08 23:27:54.79
94	47	C8	2019	2025	2025-09-16 01:08:47.852409	2025-11-08 23:27:54.79
95	48	8P	2004	2012	2025-09-16 01:08:47.85558	2025-11-08 23:27:54.79
98	49	8U	2011	2018	2025-09-16 01:08:47.864571	2025-11-08 23:27:54.79
99	49	F3	2018	2025	2025-09-16 01:08:47.868841	2025-11-08 23:27:54.79
100	50	42	2007	2015	2025-09-16 01:08:47.871891	2025-11-08 23:27:54.79
101	50	Type 4S	2015	2023	2025-09-16 01:08:47.87446	2025-11-08 23:27:54.79
102	51	GE	2020	2025	2025-09-16 01:08:47.878033	2025-11-08 23:27:54.79
103	52	4M	2018	2025	2025-09-16 01:08:47.882128	2025-11-08 23:27:54.79
104	53	FZ	2021	2025	2025-09-16 01:08:47.885514	2025-11-08 23:27:54.79
105	54	8T	2007	2016	2025-09-16 01:08:47.888332	2025-11-08 23:27:54.79
106	54	F5	2016	2023	2025-09-16 01:08:47.891117	2025-11-08 23:27:54.79
107	55	4M	2020	2025	2025-09-16 01:08:47.89447	2025-11-08 23:27:54.79
108	56	5代	2004	2009	2025-09-16 01:08:47.898757	2025-11-08 23:27:54.79
110	56	6代	2009	2013	2025-09-16 01:08:47.904524	2025-11-08 23:27:54.79
112	56	7代	2013	2020	2025-09-16 01:08:47.910901	2025-11-08 23:27:54.79
114	56	8代	2020	2025	2025-09-16 01:08:47.917928	2025-11-08 23:27:54.79
116	57	B6	2005	2011	2025-09-16 01:08:47.923717	2025-11-08 23:27:54.79
117	57	B7	2011	2015	2025-09-16 01:08:47.927647	2025-11-08 23:27:54.79
118	57	B8	2015	2023	2025-09-16 01:08:47.932983	2025-11-08 23:27:54.79
119	57	B9	2023	2025	2025-09-16 01:08:47.937079	2025-11-08 23:27:54.79
120	58	1代	2008	2016	2025-09-16 01:08:47.940694	2025-11-08 23:27:54.79
121	58	2代	2016	2020	2025-09-16 01:08:47.944921	2025-11-08 23:27:54.79
122	58	3代	2020	2025	2025-09-16 01:08:47.948151	2025-11-08 23:27:54.79
123	59	1代	2018	2023	2025-09-16 01:08:47.951256	2025-11-08 23:27:54.79
125	60	1代	2004	2010	2025-09-16 01:08:47.957065	2025-11-08 23:27:54.79
126	60	2代	2010	2015	2025-09-16 01:08:47.961547	2025-11-08 23:27:54.79
127	60	3代	2015	2025	2025-09-16 01:08:47.964525	2025-11-08 23:27:54.79
128	61	1代	2017	2025	2025-09-16 01:08:47.967542	2025-11-08 23:27:54.79
129	62	1代	2021	2025	2025-09-16 01:08:47.970589	2025-11-08 23:27:54.79
131	63	4代	2004	2010	2025-09-16 01:08:47.978562	2025-11-08 23:27:54.79
132	63	5代	2010	2020	2025-09-16 01:08:47.981501	2025-11-08 23:27:54.79
134	64	5代	2009	2017	2025-09-16 01:08:47.987353	2025-11-08 23:27:54.79
135	64	6代	2018	2025	2025-09-16 01:08:47.991328	2025-11-08 23:27:54.79
136	65	1代	2022	2025	2025-09-16 01:08:47.995111	2025-11-08 23:27:54.79
137	66	1代	2023	2025	2025-09-16 01:08:47.998061	2025-11-08 23:27:54.79
138	67	1代	2019	2025	2025-09-16 01:08:48.001791	2025-11-08 23:27:54.79
139	68	1代	2005	2007	2025-09-16 01:08:48.004965	2025-11-08 23:27:54.79
140	68	2代	2007	2014	2025-09-16 01:08:48.009442	2025-11-08 23:27:54.79
142	68	4代	2022	2025	2025-09-16 01:08:48.01521	2025-11-08 23:27:54.79
143	69	1代	2005	2008	2025-09-16 01:08:48.018459	2025-11-08 23:27:54.79
144	69	2代	2008	2013	2025-09-16 01:08:48.022372	2025-11-08 23:27:54.79
145	69	3代	2013	2020	2025-09-16 01:08:48.026416	2025-11-08 23:27:54.79
146	69	4代	2019	2024	2025-09-16 01:08:48.029336	2025-11-08 23:27:54.79
147	69	5代	2024	2025	2025-09-16 01:08:48.032108	2025-11-08 23:27:54.79
148	70	1代	2006	2010	2025-09-16 01:08:48.039089	2025-11-08 23:27:54.79
149	71	1代	2005	2008	2025-09-16 01:08:48.042909	2025-11-08 23:27:54.79
150	71	2代	2008	2015	2025-09-16 01:08:48.045797	2025-11-08 23:27:54.79
151	71	3代	2015	2023	2025-09-16 01:08:48.048648	2025-11-08 23:27:54.79
152	71	4代	2023	2025	2025-09-16 01:08:48.051514	2025-11-08 23:27:54.79
153	72	1代	2010	2015	2025-09-16 01:08:48.056457	2025-11-08 23:27:54.79
154	73	1代	2012	2019	2025-09-16 01:08:48.059952	2025-11-08 23:27:54.79
155	74	1代	2017	2022	2025-09-16 01:08:48.063147	2025-11-08 23:27:54.79
156	74	2代	2023	2025	2025-09-16 01:08:48.065871	2025-11-08 23:27:54.79
157	75	1代	2018	2022	2025-09-16 01:08:48.07042	2025-11-08 23:27:54.79
158	75	2代	2022	2025	2025-09-16 01:08:48.073319	2025-11-08 23:27:54.79
159	76	1代	2019	2025	2025-09-16 01:08:48.076777	2025-11-08 23:27:54.79
160	77	1代	2019	2022	2025-09-16 01:08:48.079823	2025-11-08 23:27:54.79
161	77	2代	2023	2025	2025-09-16 01:08:48.082594	2025-11-08 23:27:54.79
162	78	1代	2021	2025	2025-09-16 01:08:48.087089	2025-11-08 23:27:54.79
164	79	第一代(R50/R53)	2005	2006	2025-09-16 01:08:48.093589	2025-11-08 23:27:54.79
165	79	第二代(R56)	2007	2013	2025-09-16 01:08:48.099183	2025-11-08 23:27:54.79
166	80	R60	2011	2017	2025-09-16 01:08:48.10631	2025-11-08 23:27:54.79
167	79	第三代(F56)	2014	2023	2025-09-16 01:08:48.10941	2025-11-08 23:27:54.79
168	81	F54	2015	2023	2025-09-16 01:08:48.116237	2025-11-08 23:27:54.79
169	82	F57	2016	2023	2025-09-16 01:08:48.119759	2025-11-08 23:27:54.79
170	83	第三代(F56)	2020	2023	2025-09-16 01:08:48.122804	2025-11-08 23:27:54.79
171	84	997	2005	2012	2025-09-16 01:08:48.126246	2025-11-08 23:27:54.79
173	84	991	2012	2019	2025-09-16 01:08:48.135626	2025-11-08 23:27:54.79
175	84	992	2019	2025	2025-09-16 01:08:48.144298	2025-11-08 23:27:54.79
177	85	987	2005	2012	2025-09-16 01:08:48.15208	2025-11-08 23:27:54.79
178	85	981	2012	2016	2025-09-16 01:08:48.154742	2025-11-08 23:27:54.79
179	86	987	2005	2012	2025-09-16 01:08:48.157732	2025-11-08 23:27:54.79
180	86	981	2012	2016	2025-09-16 01:08:48.161097	2025-11-08 23:27:54.79
181	87	1代	2003	2010	2025-09-16 01:08:48.165363	2025-11-08 23:27:54.79
182	87	2代	2010	2017	2025-09-16 01:08:48.168172	2025-11-08 23:27:54.79
183	87	3代	2017	2025	2025-09-16 01:08:48.171143	2025-11-08 23:27:54.79
184	88	1代	2019	2025	2025-09-16 01:08:48.174137	2025-11-08 23:27:54.79
185	89	1代	2014	2021	2025-09-16 01:08:48.17888	2025-11-08 23:27:54.79
186	90	1代	2009	2016	2025-09-16 01:08:48.18258	2025-11-08 23:27:54.79
187	90	2代	2017	2021	2025-09-16 01:08:48.185321	2025-11-08 23:27:54.79
188	91	982	2016	2020	2025-09-16 01:08:48.18831	2025-11-08 23:27:54.79
189	92	1代	2019	2025	2025-09-16 01:08:48.195511	2025-11-08 23:27:54.79
190	93	2代	2004	2008	2025-09-16 01:08:48.199686	2025-11-08 23:27:54.79
191	93	3代	2011	2015	2025-09-16 01:08:48.202639	2025-11-08 23:27:54.79
192	93	4代	2015	2018	2025-09-16 01:08:48.205421	2025-11-08 23:27:54.79
193	93	4.5代	2018	2022	2025-09-16 01:08:48.208562	2025-11-08 23:27:54.79
194	93	5代	2022	2025	2025-09-16 01:08:48.213089	2025-11-08 23:27:54.79
195	94	2代	2013	2016	2025-09-16 01:08:48.216128	2025-11-08 23:27:54.79
196	94	3代	2020	2025	2025-09-16 01:08:48.218885	2025-11-08 23:27:54.79
197	95	4代	2007	2014	2025-09-16 01:08:48.224738	2025-11-08 23:27:54.79
198	95	5代	2015	2022	2025-09-16 01:08:48.229282	2025-11-08 23:27:54.79
199	95	6代	2023	2025	2025-09-16 01:08:48.232106	2025-11-08 23:27:54.79
200	96	6代	2008	2013	2025-09-16 01:08:48.235156	2025-11-08 23:27:54.79
201	96	7代	2014	2022	2025-09-16 01:08:48.237971	2025-11-08 23:27:54.79
202	97	3代	2012	2019	2025-09-16 01:08:48.242503	2025-11-08 23:27:54.79
203	97	4代	2019	2025	2025-09-16 01:08:48.245798	2025-11-08 23:27:54.79
204	98	2代	2014	2023	2025-09-16 01:08:48.248885	2025-11-08 23:27:54.79
205	99	2代	2022	2025	2025-09-16 01:08:48.251944	2025-11-08 23:27:54.79
206	100	5代	2015	2023	2025-09-16 01:08:48.254857	2025-11-08 23:27:54.79
207	100	6代	2024	2025	2025-09-16 01:08:48.26025	2025-11-08 23:27:54.79
208	101	2代	2004	2008	2025-09-16 01:08:48.263558	2025-11-08 23:27:54.79
209	102	1代	2014	2022	2025-09-16 01:08:48.266675	2025-11-08 23:27:54.79
210	103	3代	2022	2025	2025-09-16 01:08:48.269771	2025-11-08 23:27:54.79
211	104	5代	2022	2025	2025-09-16 01:08:48.273725	2025-11-08 23:27:54.79
212	105	6代	2023	2025	2025-09-16 01:08:48.277771	2025-11-08 23:27:54.79
213	106	2代	2004	2012	2025-09-16 01:08:48.281131	2025-11-08 23:27:54.79
214	107	1代	2000	2009	2025-09-16 01:08:48.28681	2025-11-08 23:27:54.79
215	107	2代	2010	2018	2025-09-16 01:08:48.290752	2025-11-08 23:27:54.79
216	107	3代	2019	2025	2025-09-16 01:08:48.296724	2025-11-08 23:27:54.79
217	108	2代	2006	2016	2025-09-16 01:08:48.302838	2025-11-08 23:27:54.79
218	109	2代	2016	2025	2025-09-16 01:08:48.310341	2025-11-08 23:27:54.79
219	110	1代	2004	2012	2025-09-16 01:08:48.313332	2025-11-08 23:27:54.79
220	111	1代	2010	2018	2025-09-16 01:08:48.316279	2025-11-08 23:27:54.79
221	111	2代	2019	2025	2025-09-16 01:08:48.320181	2025-11-08 23:27:54.79
222	112	3代	2000	2007	2025-09-16 01:08:48.323703	2025-11-08 23:27:54.79
223	113	1代	2008	2017	2025-09-16 01:08:48.327164	2025-11-08 23:27:54.79
224	113	2代	2019	2025	2025-09-16 01:08:48.329974	2025-11-08 23:27:54.79
226	114	2代	2007	2016	2025-09-16 01:08:48.339924	2025-11-08 23:27:54.79
227	115	1代	2002	2014	2025-09-16 01:08:48.343333	2025-11-08 23:27:54.79
228	115	2代	2015	2025	2025-09-16 01:08:48.346053	2025-11-08 23:27:54.79
229	116	1代	2018	2025	2025-09-16 01:08:48.349042	2025-11-08 23:27:54.79
231	117	1代	2006	2013	2025-09-16 01:08:48.356422	2025-11-08 23:27:54.79
232	118	2代	2006	2013	2025-09-16 01:08:48.35984	2025-11-08 23:27:54.79
233	119	ZN6	2012	2020	2025-09-16 01:08:48.363181	2025-11-08 23:27:54.79
234	119	ZN8	2020	2025	2025-09-16 01:08:48.370305	2025-11-08 23:27:54.79
235	120	9代	2004	2007	2025-09-16 01:08:48.373297	2025-11-08 23:27:54.79
236	120	10代	2008	2013	2025-09-16 01:08:48.376343	2025-11-08 23:27:54.79
237	120	11代	2014	2019	2025-09-16 01:08:48.379294	2025-11-08 23:27:54.79
238	120	12代	2019	2023	2025-09-16 01:08:48.383391	2025-11-08 23:27:54.79
240	121	5代	2006	2011	2025-09-16 01:08:48.38945	2025-11-08 23:27:54.79
241	121	6代	2012	2017	2025-09-16 01:08:48.392512	2025-11-08 23:27:54.79
242	121	7代	2018	2023	2025-09-16 01:08:48.396059	2025-11-08 23:27:54.79
243	121	8代	2023	2025	2025-09-16 01:08:48.401424	2025-11-08 23:27:54.79
244	122	3代	2006	2012	2025-09-16 01:08:48.404906	2025-11-08 23:27:54.79
245	122	4代	2013	2018	2025-09-16 01:08:48.407996	2025-11-08 23:27:54.79
246	122	5代	2019	2025	2025-09-16 01:08:48.411378	2025-11-08 23:27:54.79
247	123	1代	2006	2014	2025-09-16 01:08:48.419886	2025-11-08 23:27:54.79
248	123	2代	2014	2020	2025-09-16 01:08:48.423022	2025-11-08 23:27:54.79
249	123	3代	2020	2025	2025-09-16 01:08:48.426369	2025-11-08 23:27:54.79
250	124	1代	2003	2007	2025-09-16 01:08:48.430702	2025-11-08 23:27:54.79
251	124	2代	2008	2013	2025-09-16 01:08:48.433507	2025-11-08 23:27:54.79
252	124	3代	2014	2023	2025-09-16 01:08:48.436352	2025-11-08 23:27:54.79
253	124	4代	2023	2025	2025-09-16 01:08:48.43939	2025-11-08 23:27:54.79
254	125	3代	2009	2015	2025-09-16 01:08:48.444185	2025-11-08 23:27:54.79
255	125	4代	2016	2022	2025-09-16 01:08:48.447304	2025-11-08 23:27:54.79
256	125	5代	2023	2025	2025-09-16 01:08:48.450219	2025-11-08 23:27:54.79
257	126	2代	2009	2015	2025-09-16 01:08:48.453428	2025-11-08 23:27:54.79
258	126	3代	2015	2023	2025-09-16 01:08:48.456239	2025-11-08 23:27:54.79
259	126	4代	2023	2025	2025-09-16 01:08:48.461343	2025-11-08 23:27:54.79
260	127	1代	2016	2022	2025-09-16 01:08:48.464677	2025-11-08 23:27:54.79
261	127	2代	2022	2025	2025-09-16 01:08:48.467503	2025-11-08 23:27:54.79
262	128	1代	2020	2025	2025-09-16 01:08:48.470673	2025-11-08 23:27:54.79
264	129	16代	2023	2025	2025-09-16 01:08:48.478288	2025-11-08 23:27:54.79
265	130	8代	2019	2025	2025-09-16 01:08:48.481169	2025-11-08 23:27:54.79
266	131	1代	2019	2025	2025-09-16 01:08:48.484169	2025-11-08 23:27:54.79
267	132	1代	2022	2025	2025-09-16 01:08:48.48738	2025-11-08 23:27:54.79
268	133	1代	2017	2023	2025-09-16 01:08:48.491913	2025-11-08 23:27:54.79
269	134	1代	2023	2025	2025-09-16 01:08:48.495241	2025-11-08 23:27:54.79
270	135	8代(FD1–FD3)	2006	2011	2025-09-16 01:08:48.498425	2025-11-08 23:27:54.79
271	135	8代	2006	2011	2025-09-16 01:08:48.501211	2025-11-08 23:27:54.79
272	135	9代(FA1–FA5)	2012	2016	2025-09-16 01:08:48.506027	2025-11-08 23:27:54.79
273	135	9代	2012	2016	2025-09-16 01:08:48.510418	2025-11-08 23:27:54.79
274	135	10代	2016	2021	2025-09-16 01:08:48.513588	2025-11-08 23:27:54.79
276	135	11代	2022	2025	2025-09-16 01:08:48.5193	2025-11-08 23:27:54.79
278	136	7代	2003	2008	2025-09-16 01:08:48.527302	2025-11-08 23:27:54.79
279	136	8th (CL7–CM1)	2008	2013	2025-09-16 01:08:48.529936	2025-11-08 23:27:54.79
280	136	8代	2008	2013	2025-09-16 01:08:48.532556	2025-11-08 23:27:54.79
281	136	9代	2013	2019	2025-09-16 01:08:48.535579	2025-11-08 23:27:54.79
282	136	10代	2018	2025	2025-09-16 01:08:48.542586	2025-11-08 23:27:54.79
283	137	3代	2007	2011	2025-09-16 01:08:48.548439	2025-11-08 23:27:54.79
284	137	4代	2012	2016	2025-09-16 01:08:48.552435	2025-11-08 23:27:54.79
285	137	5代	2017	2022	2025-09-16 01:08:48.555703	2025-11-08 23:27:54.79
286	137	6代	2023	2025	2025-09-16 01:08:48.558521	2025-11-08 23:27:54.79
287	138	2代	2008	2014	2025-09-16 01:08:48.562033	2025-11-08 23:27:54.79
288	138	3代	2014	2020	2025-09-16 01:08:48.564737	2025-11-08 23:27:54.79
289	138	4代	2020	2025	2025-09-16 01:08:48.568864	2025-11-08 23:27:54.79
290	139	1代	2015	2021	2025-09-16 01:08:48.57205	2025-11-08 23:27:54.79
291	139	2代	2022	2025	2025-09-16 01:08:48.574802	2025-11-08 23:27:54.79
292	140	4代	2004	2013	2025-09-16 01:08:48.58098	2025-11-08 23:27:54.79
293	140	5代	2014	2020	2025-09-16 01:08:48.585459	2025-11-08 23:27:54.79
294	140	6代	2021	2025	2025-09-16 01:08:48.588685	2025-11-08 23:27:54.79
295	141	5代	2008	2014	2025-09-16 01:08:48.592086	2025-11-08 23:27:54.79
296	141	6代	2014	2020	2025-09-16 01:08:48.59502	2025-11-08 23:27:54.79
297	141	7代	2020	2025	2025-09-16 01:08:48.597831	2025-11-08 23:27:54.79
298	142	AP2	2005	2009	2025-09-16 01:08:48.602052	2025-11-08 23:27:54.79
299	143	4代	2005	2012	2025-09-16 01:08:48.60495	2025-11-08 23:27:54.79
300	144	1代	2005	2008	2025-09-16 01:08:48.607835	2025-11-08 23:27:54.79
301	144	2代	2009	2015	2025-09-16 01:08:48.611195	2025-11-08 23:27:54.79
302	144	3代	2016	2022	2025-09-16 01:08:48.615	2025-11-08 23:27:54.79
303	144	4代	2023	2025	2025-09-16 01:08:48.618267	2025-11-08 23:27:54.79
304	145	1代	2005	2011	2025-09-16 01:08:48.621352	2025-11-08 23:27:54.79
305	146	第一代	2003	2006	2025-09-16 01:08:48.624383	2025-11-08 23:27:54.79
306	147	第二代	2007	2013	2025-09-16 01:08:48.627546	2025-11-08 23:27:54.79
307	148	第一代	2013	2018	2025-09-16 01:08:48.631434	2025-11-08 23:27:54.79
308	148	第二代	2019	2023	2025-09-16 01:08:48.634724	2025-11-08 23:27:54.79
309	149	第一代	2008	2017	2025-09-16 01:08:48.637649	2025-11-08 23:27:54.79
310	149	第二代	2018	2025	2025-09-16 01:08:48.640394	2025-11-08 23:27:54.79
311	150	第一代	2013	2020	2025-09-16 01:08:48.643852	2025-11-08 23:27:54.79
312	150	第二代	2021	2025	2025-09-16 01:08:48.647523	2025-11-08 23:27:54.79
313	151	第一代	2003	2008	2025-09-16 01:08:48.650703	2025-11-08 23:27:54.79
314	152	第二代	2009	2012	2025-09-16 01:08:48.653562	2025-11-08 23:27:54.79
315	153	第二代	2009	2013	2025-09-16 01:08:48.657206	2025-11-08 23:27:54.79
316	154	第一代	2014	2019	2025-09-16 01:08:48.660518	2025-11-08 23:27:54.79
317	155	2代	2006	2013	2025-09-16 01:08:48.665206	2025-11-08 23:27:54.79
318	155	3代	2013	2020	2025-09-16 01:08:48.667888	2025-11-08 23:27:54.79
319	156	5代	2006	2012	2025-09-16 01:08:48.670933	2025-11-08 23:27:54.79
320	156	6代	2012	2018	2025-09-16 01:08:48.673506	2025-11-08 23:27:54.79
321	157	3代	2008	2015	2025-09-16 01:08:48.678222	2025-11-08 23:27:54.79
322	157	4代	2015	2022	2025-09-16 01:08:48.681278	2025-11-08 23:27:54.79
323	158	4代	2006	2017	2025-09-16 01:08:48.684132	2025-11-08 23:27:54.79
324	158	5代	2017	2023	2025-09-16 01:08:48.686938	2025-11-08 23:27:54.79
325	159	1代	2014	2021	2025-09-16 01:08:48.690206	2025-11-08 23:27:54.79
326	159	2代	2021	2025	2025-09-16 01:08:48.694537	2025-11-08 23:27:54.79
327	160	1代	2018	2025	2025-09-16 01:08:48.697611	2025-11-08 23:27:54.79
328	161	1代	2017	2025	2025-09-16 01:08:48.703129	2025-11-08 23:27:54.79
329	162	2代	2013	2019	2025-09-16 01:08:48.710671	2025-11-08 23:27:54.79
330	163	3代	2019	2023	2025-09-16 01:08:48.713625	2025-11-08 23:27:54.79
331	164	2代	2012	2018	2025-09-16 01:08:48.716494	2025-11-08 23:27:54.79
332	165	3代	2018	2023	2025-09-16 01:08:48.719473	2025-11-08 23:27:54.79
333	166	1代	2012	2017	2025-09-16 01:08:48.723435	2025-11-08 23:27:54.79
334	167	2代	2017	2023	2025-09-16 01:08:48.727344	2025-11-08 23:27:54.79
335	168	1代	2019	2023	2025-09-16 01:08:48.730346	2025-11-08 23:27:54.79
336	169	1代	2015	2020	2025-09-16 01:08:48.733366	2025-11-08 23:27:54.79
337	170	3代	2015	2023	2025-09-16 01:08:48.736216	2025-11-08 23:27:54.79
338	171	C11	2005	2011	2025-09-16 01:08:48.740482	2025-11-08 23:27:54.79
339	171	C12	2011	2019	2025-09-16 01:08:48.743838	2025-11-08 23:27:54.79
340	172	B17	2013	2019	2025-09-16 01:08:48.746868	2025-11-08 23:27:54.79
341	173	L33	2013	2018	2025-09-16 01:08:48.749896	2025-11-08 23:27:54.79
342	174	T31	2007	2013	2025-09-16 01:08:48.752794	2025-11-08 23:27:54.79
343	174	T32	2013	2021	2025-09-16 01:08:48.757942	2025-11-08 23:27:54.79
344	175	F15	2010	2019	2025-09-16 01:08:48.761191	2025-11-08 23:27:54.79
345	176	Z51	2009	2014	2025-09-16 01:08:48.764073	2025-11-08 23:27:54.79
346	177	P15	2017	2025	2025-09-16 01:08:48.767145	2025-11-08 23:27:54.79
347	178	R35	2008	2022	2025-09-16 01:08:48.77102	2025-11-08 23:27:54.79
348	179	Z33	2003	2009	2025-09-16 01:08:48.774449	2025-11-08 23:27:54.79
349	180	Z34	2009	2020	2025-09-16 01:08:48.778019	2025-11-08 23:27:54.79
350	181	GD	2006	2011	2025-09-16 01:08:48.781257	2025-11-08 23:27:54.79
353	182	SH	2008	2013	2025-09-16 01:08:48.791076	2025-11-08 23:27:54.79
356	183	BP	2005	2009	2025-09-16 01:08:48.800147	2025-11-08 23:27:54.79
358	184	VAB	2014	2021	2025-09-16 01:08:48.806998	2025-11-08 23:27:54.79
359	185	ZN6	2012	2020	2025-09-16 01:08:48.810417	2025-11-08 23:27:54.79
361	186	E87	2004	2011	2025-09-30 14:33:57.698	2025-11-08 23:27:54.79
362	187	E90	2005	2012	2025-09-30 14:33:57.712	2025-11-08 23:27:54.79
363	188	E90	2007	2010	2025-09-30 14:33:57.718	2025-11-08 23:27:54.79
364	187	F30	2012	2018	2025-09-30 14:33:57.72	2025-11-08 23:27:54.79
365	189	F30	2015	2019	2025-09-30 14:33:57.723	2025-11-08 23:27:54.79
366	190	G20	2019	2023	2025-09-30 14:33:57.727	2025-11-08 23:27:54.79
367	191	G20	2019	2023	2025-09-30 14:33:57.732	2025-11-08 23:27:54.79
368	192	E60	2003	2010	2025-09-30 14:33:57.737	2025-11-08 23:27:54.79
369	193	F10	2010	2016	2025-09-30 14:33:57.74	2025-11-08 23:27:54.79
370	194	G30	2017	2023	2025-09-30 14:33:57.743	2025-11-08 23:27:54.79
371	195	G30	2017	2023	2025-09-30 14:33:57.747	2025-11-08 23:27:54.79
372	196	F01	2008	2015	2025-09-30 14:33:57.75	2025-11-08 23:27:54.79
373	197	G11	2015	2022	2025-09-30 14:33:57.753	2025-11-08 23:27:54.79
374	198	G11	2016	2022	2025-09-30 14:33:57.757	2025-11-08 23:27:54.79
375	199	F25	2010	2017	2025-09-30 14:33:57.76	2025-11-08 23:27:54.79
376	200	G01	2017	2023	2025-09-30 14:33:57.763	2025-11-08 23:27:54.79
377	201	E70	2006	2013	2025-09-30 14:33:57.767	2025-11-08 23:27:54.79
378	14	F15	2013	2018	2025-09-30 14:33:57.77	2025-11-08 23:27:54.79
379	202	G05	2018	2023	2025-09-30 14:33:57.775	2025-11-08 23:27:54.79
380	203	E89	2009	2016	2025-09-30 14:33:57.778	2025-11-08 23:27:54.79
381	204	G29	2018	2023	2025-09-30 14:33:57.781	2025-11-08 23:27:54.79
384	205	I20	2021	2023	2025-09-30 14:33:57.791	2025-11-08 23:27:54.79
387	206	G80	2020	2023	2025-09-30 14:33:57.802	2025-11-08 23:27:54.79
389	207	F90	2017	2023	2025-09-30 14:33:57.808	2025-11-08 23:27:54.79
390	208	F97	2019	2023	2025-09-30 14:33:57.812	2025-11-08 23:27:54.79
392	209	F96	2019	2023	2025-09-30 14:33:57.818	2025-11-08 23:27:54.79
393	210	F44	2020	2023	2025-09-30 14:33:57.821	2025-11-08 23:27:54.79
394	211	F32	2014	2020	2025-09-30 14:33:57.824	2025-11-08 23:27:54.79
395	212	G22	2020	2023	2025-09-30 14:33:57.827	2025-11-08 23:27:54.79
396	213	G32	2017	2020	2025-09-30 14:33:57.832	2025-11-08 23:27:54.79
397	214	G15	2018	2023	2025-09-30 14:33:57.835	2025-11-08 23:27:54.79
398	215	G02	2018	2023	2025-09-30 14:33:57.839	2025-11-08 23:27:54.79
399	216	G07	2018	2023	2025-09-30 14:33:57.842	2025-11-08 23:27:54.79
400	217	G26	2021	2023	2025-09-30 14:33:57.846	2025-11-08 23:27:54.79
401	218	G82	2022	2023	2025-09-30 14:33:57.851	2025-11-08 23:27:54.79
402	219	F90	2021	2022	2025-09-30 14:33:57.856	2025-11-08 23:27:54.79
403	220	G09	2023	2023	2025-09-30 14:33:57.861	2025-11-08 23:27:54.79
404	221	E46	2003	2004	2025-09-30 14:33:57.865	2025-11-08 23:27:54.79
405	222	W203	2004	2007	2025-09-30 14:33:57.872	2025-11-08 23:27:54.79
406	223	W204	2008	2014	2025-09-30 14:33:57.876	2025-11-08 23:27:54.79
407	222	W205	2015	2021	2025-09-30 14:33:57.878	2025-11-08 23:27:54.79
408	222	W206	2021	2025	2025-09-30 14:33:57.881	2025-11-08 23:27:54.79
409	224	W211	2004	2009	2025-09-30 14:33:57.886	2025-11-08 23:27:54.79
410	225	W212	2009	2016	2025-09-30 14:33:57.89	2025-11-08 23:27:54.79
411	226	W213	2016	2023	2025-09-30 14:33:57.894	2025-11-08 23:27:54.79
412	226	W214	2023	2025	2025-09-30 14:33:57.897	2025-11-08 23:27:54.79
413	227	W221	2006	2013	2025-09-30 14:33:57.902	2025-11-08 23:27:54.79
414	228	W222	2014	2020	2025-09-30 14:33:57.906	2025-11-08 23:27:54.79
415	229	W223	2021	2025	2025-09-30 14:33:57.91	2025-11-08 23:27:54.79
416	230	X253	2015	2022	2025-09-30 14:33:57.915	2025-11-08 23:27:54.79
417	231	X254	2022	2025	2025-09-30 14:33:57.919	2025-11-08 23:27:54.79
418	232	W166	2015	2019	2025-09-30 14:33:57.923	2025-11-08 23:27:54.79
419	233	W167	2019	2025	2025-09-30 14:33:57.927	2025-11-08 23:27:54.79
420	234	W176	2012	2018	2025-09-30 14:33:57.932	2025-11-08 23:27:54.79
421	235	W177	2018	2025	2025-09-30 14:33:57.936	2025-11-08 23:27:54.79
422	236	X156	2014	2020	2025-09-30 14:33:57.94	2025-11-08 23:27:54.79
423	237	H247	2020	2025	2025-09-30 14:33:57.945	2025-11-08 23:27:54.79
424	238	X247	2019	2025	2025-09-30 14:33:57.949	2025-11-08 23:27:54.79
425	239	W463	2004	2018	2025-09-30 14:33:57.953	2025-11-08 23:27:54.79
426	240	W464	2018	2025	2025-09-30 14:33:57.957	2025-11-08 23:27:54.79
427	241	V295	2022	2025	2025-09-30 14:33:57.962	2025-11-08 23:27:54.79
428	242	V297	2021	2025	2025-09-30 14:33:57.966	2025-11-08 23:27:54.79
429	243	C190	2015	2023	2025-09-30 14:33:57.971	2025-11-08 23:27:54.79
430	244	C192	2023	2025	2025-09-30 14:33:57.975	2025-11-08 23:27:54.79
431	245	X118	2013	2019	2025-09-30 14:33:57.979	2025-11-08 23:27:54.79
432	246	X118	2020	2025	2025-09-30 14:33:57.984	2025-11-08 23:27:54.79
433	247	R231	2012	2020	2025-09-30 14:33:57.988	2025-11-08 23:27:54.79
434	248	R232	2022	2025	2025-09-30 14:33:57.992	2025-11-08 23:27:54.79
435	249	B7	2004	2008	2025-09-30 14:33:57.998	2025-11-08 23:27:54.79
436	250	B7	2006	2008	2025-09-30 14:33:58.002	2025-11-08 23:27:54.79
437	251	B8	2008	2015	2025-09-30 14:33:58.007	2025-11-08 23:27:54.79
438	252	B9	2015	2023	2025-09-30 14:33:58.011	2025-11-08 23:27:54.79
439	253	B10	2023	2025	2025-09-30 14:33:58.015	2025-11-08 23:27:54.79
440	254	C6	2005	2011	2025-09-30 14:33:58.019	2025-11-08 23:27:54.79
441	255	C7	2011	2018	2025-09-30 14:33:58.023	2025-11-08 23:27:54.79
442	256	C8	2018	2025	2025-09-30 14:33:58.028	2025-11-08 23:27:54.79
443	257	D4	2010	2017	2025-09-30 14:33:58.032	2025-11-08 23:27:54.79
444	258	D5	2017	2025	2025-09-30 14:33:58.036	2025-11-08 23:27:54.79
445	259	8J	2006	2014	2025-09-30 14:33:58.039	2025-11-08 23:27:54.79
446	260	8S	2014	2023	2025-09-30 14:33:58.041	2025-11-08 23:27:54.79
447	261	8R	2009	2017	2025-09-30 14:33:58.044	2025-11-08 23:27:54.79
448	262	FY	2017	2023	2025-09-30 14:33:58.047	2025-11-08 23:27:54.79
449	263	FY	2020	2025	2025-09-30 14:33:58.051	2025-11-08 23:27:54.79
450	264	4L	2006	2015	2025-09-30 14:33:58.055	2025-11-08 23:27:54.79
451	265	4M	2015	2023	2025-09-30 14:33:58.059	2025-11-08 23:27:54.79
452	266	4M	2017	2023	2025-09-30 14:33:58.063	2025-11-08 23:27:54.79
453	267	GE	2019	2025	2025-09-30 14:33:58.068	2025-11-08 23:27:54.79
455	268	C7	2013	2018	2025-09-30 14:33:58.077	2025-11-08 23:27:54.79
456	268	C8	2019	2025	2025-09-30 14:33:58.079	2025-11-08 23:27:54.79
457	269	8P	2004	2012	2025-09-30 14:33:58.084	2025-11-08 23:27:54.79
458	270	8V	2012	2020	2025-09-30 14:33:58.088	2025-11-08 23:27:54.79
459	271	8Y	2020	2025	2025-09-30 14:33:58.092	2025-11-08 23:27:54.79
460	272	8U	2011	2018	2025-09-30 14:33:58.096	2025-11-08 23:27:54.79
461	273	F3	2018	2025	2025-09-30 14:33:58.1	2025-11-08 23:27:54.79
462	274	42	2007	2015	2025-09-30 14:33:58.102	2025-11-08 23:27:54.79
463	275	Type 4S	2015	2023	2025-09-30 14:33:58.105	2025-11-08 23:27:54.79
464	276	GE	2020	2025	2025-09-30 14:33:58.108	2025-11-08 23:27:54.79
465	277	4M	2018	2025	2025-09-30 14:33:58.111	2025-11-08 23:27:54.79
466	278	FZ	2021	2025	2025-09-30 14:33:58.113	2025-11-08 23:27:54.79
467	279	8T	2007	2016	2025-09-30 14:33:58.118	2025-11-08 23:27:54.79
468	280	F5	2016	2023	2025-09-30 14:33:58.121	2025-11-08 23:27:54.79
470	281	5代	2004	2009	2025-09-30 14:33:58.13	2025-11-08 23:27:54.79
471	282	5代	2006	2009	2025-09-30 14:33:58.134	2025-11-08 23:27:54.79
472	283	6代	2009	2013	2025-09-30 14:33:58.138	2025-11-08 23:27:54.79
473	282	6代	2010	2013	2025-09-30 14:33:58.14	2025-11-08 23:27:54.79
474	283	7代	2013	2020	2025-09-30 14:33:58.142	2025-11-08 23:27:54.79
475	282	7代	2014	2020	2025-09-30 14:33:58.144	2025-11-08 23:27:54.79
476	284	8代	2020	2025	2025-09-30 14:33:58.149	2025-11-08 23:27:54.79
477	282	8代	2021	2025	2025-09-30 14:33:58.151	2025-11-08 23:27:54.79
478	285	B6	2005	2011	2025-09-30 14:33:58.155	2025-11-08 23:27:54.79
479	286	B7	2011	2015	2025-09-30 14:33:58.158	2025-11-08 23:27:54.79
480	287	B8	2015	2023	2025-09-30 14:33:58.161	2025-11-08 23:27:54.79
481	288	B9	2023	2025	2025-09-30 14:33:58.165	2025-11-08 23:27:54.79
482	289	1代	2008	2016	2025-09-30 14:33:58.168	2025-11-08 23:27:54.79
483	290	2代	2016	2020	2025-09-30 14:33:58.171	2025-11-08 23:27:54.79
484	291	3代	2020	2025	2025-09-30 14:33:58.174	2025-11-08 23:27:54.79
485	292	1代	2018	2023	2025-09-30 14:33:58.177	2025-11-08 23:27:54.79
486	293	1代	2021	2025	2025-09-30 14:33:58.182	2025-11-08 23:27:54.79
487	294	1代	2004	2010	2025-09-30 14:33:58.187	2025-11-08 23:27:54.79
488	295	2代	2010	2015	2025-09-30 14:33:58.192	2025-11-08 23:27:54.79
489	296	3代	2015	2025	2025-09-30 14:33:58.196	2025-11-08 23:27:54.79
490	297	1代	2017	2025	2025-09-30 14:33:58.2	2025-11-08 23:27:54.79
491	298	4代	2004	2010	2025-09-30 14:33:58.204	2025-11-08 23:27:54.79
492	299	5代	2010	2020	2025-09-30 14:33:58.209	2025-11-08 23:27:54.79
493	300	5代	2020	2025	2025-09-30 14:33:58.215	2025-11-08 23:27:54.79
494	301	5代	2009	2017	2025-09-30 14:33:58.22	2025-11-08 23:27:54.79
495	302	6代	2018	2025	2025-09-30 14:33:58.224	2025-11-08 23:27:54.79
496	303	1代	2019	2025	2025-09-30 14:33:58.228	2025-11-08 23:27:54.79
497	304	1代	2005	2007	2025-09-30 14:33:58.233	2025-11-08 23:27:54.79
498	305	2代	2007	2014	2025-09-30 14:33:58.237	2025-11-08 23:27:54.79
499	306	2代	2011	2015	2025-09-30 14:33:58.242	2025-11-08 23:27:54.79
500	307	4代	2022	2025	2025-09-30 14:33:58.245	2025-11-08 23:27:54.79
501	308	1代	2005	2008	2025-09-30 14:33:58.25	2025-11-08 23:27:54.79
502	309	2代	2008	2013	2025-09-30 14:33:58.255	2025-11-08 23:27:54.79
503	310	3代	2013	2020	2025-09-30 14:33:58.26	2025-11-08 23:27:54.79
504	311	4代	2019	2024	2025-09-30 14:33:58.262	2025-11-08 23:27:54.79
505	311	5代	2024	2025	2025-09-30 14:33:58.265	2025-11-08 23:27:54.79
506	312	5代	2024	2025	2025-09-30 14:33:58.269	2025-11-08 23:27:54.79
507	313	1代	2005	2008	2025-09-30 14:33:58.272	2025-11-08 23:27:54.79
508	314	2代	2008	2015	2025-09-30 14:33:58.276	2025-11-08 23:27:54.79
509	315	3代	2015	2023	2025-09-30 14:33:58.279	2025-11-08 23:27:54.79
510	316	4代	2023	2025	2025-09-30 14:33:58.283	2025-11-08 23:27:54.79
511	317	1代	2010	2015	2025-09-30 14:33:58.285	2025-11-08 23:27:54.79
512	318	1代	2012	2019	2025-09-30 14:33:58.288	2025-11-08 23:27:54.79
513	315	1代	2017	2022	2025-09-30 14:33:58.29	2025-11-08 23:27:54.79
514	319	2代	2023	2025	2025-09-30 14:33:58.292	2025-11-08 23:27:54.79
515	320	1代	2018	2022	2025-09-30 14:33:58.295	2025-11-08 23:27:54.79
516	320	2代	2022	2025	2025-09-30 14:33:58.297	2025-11-08 23:27:54.79
517	321	1代	2019	2025	2025-09-30 14:33:58.301	2025-11-08 23:27:54.79
520	322	997.2	2009	2011	2025-09-30 14:33:58.308	2025-11-08 23:27:54.79
521	322	991.1	2011	2015	2025-09-30 14:33:58.31	2025-11-08 23:27:54.79
522	322	991.2	2015	2019	2025-09-30 14:33:58.311	2025-11-08 23:27:54.79
523	322	992	2019	2025	2025-09-30 14:33:58.313	2025-11-08 23:27:54.79
525	85	982 (718)	2016	2025	2025-09-30 14:33:58.318	2025-11-08 23:27:54.79
527	86	982 (718)	2016	2025	2025-09-30 14:33:58.322	2025-11-08 23:27:54.79
528	87	E2	2010	2017	2025-09-30 14:33:58.325	2025-11-08 23:27:54.79
529	87	E3	2018	2023	2025-09-30 14:33:58.327	2025-11-08 23:27:54.79
530	323	E3 小改	2023	2025	2025-09-30 14:33:58.33	2025-11-08 23:27:54.79
531	89	第一代(95B)	2014	2023	2025-09-30 14:33:58.334	2025-11-08 23:27:54.79
532	324	第二代(電動)	2024	2025	2025-09-30 14:33:58.338	2025-11-08 23:27:54.79
533	90	第一代(970)	2010	2016	2025-09-30 14:33:58.341	2025-11-08 23:27:54.79
534	90	第二代(971)	2016	2023	2025-09-30 14:33:58.343	2025-11-08 23:27:54.79
535	90	第三代(976)	2023	2025	2025-09-30 14:33:58.345	2025-11-08 23:27:54.79
536	325	J1	2020	2025	2025-09-30 14:33:58.349	2025-11-08 23:27:54.79
537	326	第二代(R56)	2007	2013	2025-09-30 14:33:58.353	2025-11-08 23:27:54.79
538	327	第二代(R56)	2007	2013	2025-09-30 14:33:58.357	2025-11-08 23:27:54.79
540	326	第三代(F56)	2014	2023	2025-09-30 14:33:58.362	2025-11-08 23:27:54.79
541	327	第三代(F56)	2014	2023	2025-09-30 14:33:58.365	2025-11-08 23:27:54.79
544	328	第三代(F56)	2020	2023	2025-09-30 14:33:58.372	2025-11-08 23:27:54.79
545	329	2代	2004	2008	2025-09-30 14:33:58.376	2025-11-08 23:27:54.79
546	330	3代	2011	2015	2025-09-30 14:33:58.379	2025-11-08 23:27:54.79
547	331	4代	2015	2018	2025-09-30 14:33:58.382	2025-11-08 23:27:54.79
548	332	4.5代	2018	2022	2025-09-30 14:33:58.385	2025-11-08 23:27:54.79
549	333	5代	2022	2025	2025-09-30 14:33:58.389	2025-11-08 23:27:54.79
550	334	2代	2013	2016	2025-09-30 14:33:58.393	2025-11-08 23:27:54.79
551	335	3代	2020	2025	2025-09-30 14:33:58.396	2025-11-08 23:27:54.79
552	336	3代	2020	2025	2025-09-30 14:33:58.4	2025-11-08 23:27:54.79
553	337	4代	2007	2014	2025-09-30 14:33:58.402	2025-11-08 23:27:54.79
554	338	5代	2015	2022	2025-09-30 14:33:58.405	2025-11-08 23:27:54.79
555	339	6代	2023	2025	2025-09-30 14:33:58.407	2025-11-08 23:27:54.79
556	340	6代	2008	2013	2025-09-30 14:33:58.411	2025-11-08 23:27:54.79
557	341	7代	2014	2022	2025-09-30 14:33:58.414	2025-11-08 23:27:54.79
558	342	3代	2012	2019	2025-09-30 14:33:58.417	2025-11-08 23:27:54.79
559	343	4代	2019	2025	2025-09-30 14:33:58.42	2025-11-08 23:27:54.79
562	344	5代	2015	2023	2025-09-30 14:33:58.429	2025-11-08 23:27:54.79
563	345	6代	2024	2025	2025-09-30 14:33:58.434	2025-11-08 23:27:54.79
564	346	2代	2004	2008	2025-09-30 14:33:58.437	2025-11-08 23:27:54.79
565	347	1代	2014	2022	2025-09-30 14:33:58.44	2025-11-08 23:27:54.79
566	348	3代	2022	2025	2025-09-30 14:33:58.444	2025-11-08 23:27:54.79
568	349	1代	2023	2025	2025-09-30 14:33:58.45	2025-11-08 23:27:54.79
570	350	2代	2004	2012	2025-09-30 14:33:58.456	2025-11-08 23:27:54.79
571	351	2代	2004	2012	2025-09-30 14:33:58.46	2025-11-08 23:27:54.79
572	352	1代	2000	2009	2025-09-30 14:33:58.464	2025-11-08 23:27:54.79
573	353	2代	2010	2018	2025-09-30 14:33:58.468	2025-11-08 23:27:54.79
574	354	2代	2010	2018	2025-09-30 14:33:58.472	2025-11-08 23:27:54.79
575	355	3代	2019	2025	2025-09-30 14:33:58.475	2025-11-08 23:27:54.79
576	356	3代	2019	2025	2025-09-30 14:33:58.479	2025-11-08 23:27:54.79
577	357	2代	2006	2016	2025-09-30 14:33:58.483	2025-11-08 23:27:54.79
578	358	2代	2006	2016	2025-09-30 14:33:58.486	2025-11-08 23:27:54.79
579	359	2代	2016	2025	2025-09-30 14:33:58.49	2025-11-08 23:27:54.79
580	360	1代	2004	2012	2025-09-30 14:33:58.493	2025-11-08 23:27:54.79
581	361	1代	2010	2018	2025-09-30 14:33:58.497	2025-11-08 23:27:54.79
582	362	2代	2019	2025	2025-09-30 14:33:58.5	2025-11-08 23:27:54.79
583	363	3代	2000	2007	2025-09-30 14:33:58.503	2025-11-08 23:27:54.79
584	364	1代	2008	2017	2025-09-30 14:33:58.506	2025-11-08 23:27:54.79
585	365	2代	2019	2025	2025-09-30 14:33:58.509	2025-11-08 23:27:54.79
586	366	2代	2019	2025	2025-09-30 14:33:58.512	2025-11-08 23:27:54.79
587	367	2代	2017	2025	2025-09-30 14:33:58.516	2025-11-08 23:27:54.79
588	368	2代	2007	2016	2025-09-30 14:33:58.52	2025-11-08 23:27:54.79
589	369	1代	2002	2014	2025-09-30 14:33:58.523	2025-11-08 23:27:54.79
590	370	2代	2015	2025	2025-09-30 14:33:58.527	2025-11-08 23:27:54.79
591	371	1代	2018	2025	2025-09-30 14:33:58.531	2025-11-08 23:27:54.79
592	372	1代	2021	2025	2025-09-30 14:33:58.534	2025-11-08 23:27:54.79
593	373	1代	2006	2013	2025-09-30 14:33:58.537	2025-11-08 23:27:54.79
594	374	2代	2006	2013	2025-09-30 14:33:58.542	2025-11-08 23:27:54.79
595	375	A90 (J29/DB)	2019	2021	2025-09-30 14:33:58.546	2025-11-08 23:27:54.79
596	376	A91 (DB)	2022	2025	2025-09-30 14:33:58.55	2025-11-08 23:27:54.79
597	377	A91 (DB22)	2021	2025	2025-09-30 14:33:58.553	2025-11-08 23:27:54.79
598	378	ZN6	2012	2020	2025-09-30 14:33:58.556	2025-11-08 23:27:54.79
599	379	ZN6	2012	2020	2025-09-30 14:33:58.559	2025-11-08 23:27:54.79
600	380	ZN8	2020	2025	2025-09-30 14:33:58.562	2025-11-08 23:27:54.79
601	381	9代	2004	2007	2025-09-30 14:33:58.565	2025-11-08 23:27:54.79
602	382	10代	2008	2013	2025-09-30 14:33:58.569	2025-11-08 23:27:54.79
603	383	11代	2014	2019	2025-09-30 14:33:58.574	2025-11-08 23:27:54.79
604	384	12代	2019	2023	2025-09-30 14:33:58.579	2025-11-08 23:27:54.79
605	385	12代	2021	2025	2025-09-30 14:33:58.582	2025-11-08 23:27:54.79
606	386	5代	2006	2011	2025-09-30 14:33:58.585	2025-11-08 23:27:54.79
607	387	6代	2012	2017	2025-09-30 14:33:58.587	2025-11-08 23:27:54.79
608	388	7代	2018	2023	2025-09-30 14:33:58.59	2025-11-08 23:27:54.79
609	389	8代	2023	2025	2025-09-30 14:33:58.593	2025-11-08 23:27:54.79
610	390	3代	2006	2012	2025-09-30 14:33:58.597	2025-11-08 23:27:54.79
611	391	4代	2013	2018	2025-09-30 14:33:58.602	2025-11-08 23:27:54.79
612	392	5代	2019	2025	2025-09-30 14:33:58.606	2025-11-08 23:27:54.79
613	393	5代	2019	2025	2025-09-30 14:33:58.61	2025-11-08 23:27:54.79
614	394	1代	2006	2014	2025-09-30 14:33:58.614	2025-11-08 23:27:54.79
615	395	2代	2014	2020	2025-09-30 14:33:58.618	2025-11-08 23:27:54.79
616	396	3代	2020	2025	2025-09-30 14:33:58.624	2025-11-08 23:27:54.79
617	397	1代	2003	2007	2025-09-30 14:33:58.628	2025-11-08 23:27:54.79
618	398	2代	2008	2013	2025-09-30 14:33:58.632	2025-11-08 23:27:54.79
619	399	3代	2014	2023	2025-09-30 14:33:58.635	2025-11-08 23:27:54.79
620	400	4代	2023	2025	2025-09-30 14:33:58.638	2025-11-08 23:27:54.79
621	401	3代	2009	2015	2025-09-30 14:33:58.64	2025-11-08 23:27:54.79
622	401	4代	2016	2022	2025-09-30 14:33:58.642	2025-11-08 23:27:54.79
623	402	5代	2023	2025	2025-09-30 14:33:58.646	2025-11-08 23:27:54.79
624	403	2代	2009	2015	2025-09-30 14:33:58.651	2025-11-08 23:27:54.79
625	404	3代	2015	2023	2025-09-30 14:33:58.655	2025-11-08 23:27:54.79
626	404	4代	2023	2025	2025-09-30 14:33:58.657	2025-11-08 23:27:54.79
627	405	1代	2016	2022	2025-09-30 14:33:58.662	2025-11-08 23:27:54.79
628	406	2代	2022	2025	2025-09-30 14:33:58.667	2025-11-08 23:27:54.79
629	407	1代	2020	2025	2025-09-30 14:33:58.67	2025-11-08 23:27:54.79
630	408	1代	2023	2025	2025-09-30 14:33:58.674	2025-11-08 23:27:54.79
631	409	16代	2023	2025	2025-09-30 14:33:58.677	2025-11-08 23:27:54.79
632	410	8代	2019	2025	2025-09-30 14:33:58.681	2025-11-08 23:27:54.79
633	411	1代	2019	2025	2025-09-30 14:33:58.685	2025-11-08 23:27:54.79
635	412	1代	2017	2023	2025-09-30 14:33:58.691	2025-11-08 23:27:54.79
636	413	1代	2023	2025	2025-09-30 14:33:58.694	2025-11-08 23:27:54.79
637	414	8代(FD1–FD3)	2006	2011	2025-09-30 14:33:58.7	2025-11-08 23:27:54.79
638	415	8代	2006	2011	2025-09-30 14:33:58.703	2025-11-08 23:27:54.79
639	414	9代(FA1–FA5)	2012	2016	2025-09-30 14:33:58.705	2025-11-08 23:27:54.79
640	416	9代	2012	2016	2025-09-30 14:33:58.708	2025-11-08 23:27:54.79
641	417	10代	2016	2021	2025-09-30 14:33:58.712	2025-11-08 23:27:54.79
642	418	10代	2017	2021	2025-09-30 14:33:58.716	2025-11-08 23:27:54.79
643	419	11代	2022	2025	2025-09-30 14:33:58.72	2025-11-08 23:27:54.79
644	418	11代	2023	2025	2025-09-30 14:33:58.721	2025-11-08 23:27:54.79
645	420	7代	2003	2008	2025-09-30 14:33:58.725	2025-11-08 23:27:54.79
646	420	8th (CL7–CM1)	2008	2013	2025-09-30 14:33:58.727	2025-11-08 23:27:54.79
647	421	8代	2008	2013	2025-09-30 14:33:58.731	2025-11-08 23:27:54.79
648	420	9代	2013	2019	2025-09-30 14:33:58.733	2025-11-08 23:27:54.79
649	421	9代	2013	2019	2025-09-30 14:33:58.735	2025-11-08 23:27:54.79
650	422	10代	2018	2025	2025-09-30 14:33:58.739	2025-11-08 23:27:54.79
651	423	10代	2018	2025	2025-09-30 14:33:58.742	2025-11-08 23:27:54.79
652	424	3代	2007	2011	2025-09-30 14:33:58.745	2025-11-08 23:27:54.79
653	424	4代	2012	2016	2025-09-30 14:33:58.748	2025-11-08 23:27:54.79
654	425	5代	2017	2022	2025-09-30 14:33:58.752	2025-11-08 23:27:54.79
655	426	6代	2023	2025	2025-09-30 14:33:58.755	2025-11-08 23:27:54.79
656	427	2代	2008	2014	2025-09-30 14:33:58.759	2025-11-08 23:27:54.79
657	427	3代	2014	2020	2025-09-30 14:33:58.761	2025-11-08 23:27:54.79
658	428	4代	2020	2025	2025-09-30 14:33:58.765	2025-11-08 23:27:54.79
659	429	1代	2015	2021	2025-09-30 14:33:58.768	2025-11-08 23:27:54.79
660	430	2代	2022	2025	2025-09-30 14:33:58.77	2025-11-08 23:27:54.79
661	431	2代	2022	2025	2025-09-30 14:33:58.773	2025-11-08 23:27:54.79
662	432	4代	2004	2013	2025-09-30 14:33:58.775	2025-11-08 23:27:54.79
663	432	5代	2014	2020	2025-09-30 14:33:58.777	2025-11-08 23:27:54.79
664	433	6代	2021	2025	2025-09-30 14:33:58.78	2025-11-08 23:27:54.79
665	434	5代	2008	2014	2025-09-30 14:33:58.783	2025-11-08 23:27:54.79
666	434	6代	2014	2020	2025-09-30 14:33:58.785	2025-11-08 23:27:54.79
667	435	7代	2020	2025	2025-09-30 14:33:58.789	2025-11-08 23:27:54.79
669	436	4代	2005	2012	2025-09-30 14:33:58.795	2025-11-08 23:27:54.79
670	437	1代	2005	2008	2025-09-30 14:33:58.799	2025-11-08 23:27:54.79
671	437	2代	2009	2015	2025-09-30 14:33:58.801	2025-11-08 23:27:54.79
672	437	3代	2016	2022	2025-09-30 14:33:58.803	2025-11-08 23:27:54.79
673	437	4代	2023	2025	2025-09-30 14:33:58.805	2025-11-08 23:27:54.79
674	438	1代	2005	2011	2025-09-30 14:33:58.808	2025-11-08 23:27:54.79
687	439	2代	2006	2013	2025-09-30 14:33:58.846	2025-11-08 23:27:54.79
688	440	3代	2013	2020	2025-09-30 14:33:58.85	2025-11-08 23:27:54.79
689	441	5代	2006	2012	2025-09-30 14:33:58.854	2025-11-08 23:27:54.79
690	442	6代	2012	2018	2025-09-30 14:33:58.858	2025-11-08 23:27:54.79
691	443	3代	2008	2015	2025-09-30 14:33:58.862	2025-11-08 23:27:54.79
692	444	4代	2015	2022	2025-09-30 14:33:58.866	2025-11-08 23:27:54.79
693	445	4代	2006	2017	2025-09-30 14:33:58.87	2025-11-08 23:27:54.79
694	446	5代	2017	2023	2025-09-30 14:33:58.873	2025-11-08 23:27:54.79
695	447	1代	2014	2021	2025-09-30 14:33:58.876	2025-11-08 23:27:54.79
696	448	2代	2021	2025	2025-09-30 14:33:58.88	2025-11-08 23:27:54.79
697	449	1代	2018	2025	2025-09-30 14:33:58.884	2025-11-08 23:27:54.79
698	450	1代	2018	2025	2025-09-30 14:33:58.887	2025-11-08 23:27:54.79
699	451	1代	2017	2025	2025-09-30 14:33:58.89	2025-11-08 23:27:54.79
700	452	1代	2017	2025	2025-09-30 14:33:58.894	2025-11-08 23:27:54.79
701	453	2代 BM	2013	2019	2025-09-30 14:33:58.899	2025-11-08 23:27:54.79
702	453	3代 BP	2019	2023	2025-09-30 14:33:58.901	2025-11-08 23:27:54.79
703	454	2代 GJ	2012	2018	2025-09-30 14:33:58.904	2025-11-08 23:27:54.79
704	454	3代 GL	2018	2023	2025-09-30 14:33:58.906	2025-11-08 23:27:54.79
705	455	1代 KE	2012	2017	2025-09-30 14:33:58.91	2025-11-08 23:27:54.79
706	455	2代 KF	2017	2023	2025-09-30 14:33:58.912	2025-11-08 23:27:54.79
707	456	1代 DM	2019	2023	2025-09-30 14:33:58.916	2025-11-08 23:27:54.79
708	457	1代 DK	2015	2020	2025-09-30 14:33:58.919	2025-11-08 23:27:54.79
709	458	3代 ND	2015	2023	2025-09-30 14:33:58.922	2025-11-08 23:27:54.79
722	459	GD	2006	2011	2025-09-30 14:33:58.962	2025-11-08 23:27:54.79
724	460	GV/GP	2012	2016	2025-09-30 14:33:58.967	2025-11-08 23:27:54.79
725	461	SH	2008	2013	2025-09-30 14:33:58.97	2025-11-08 23:27:54.79
726	462	SJ	2013	2018	2025-09-30 14:33:58.973	2025-11-08 23:27:54.79
727	463	SK	2018	2022	2025-09-30 14:33:58.977	2025-11-08 23:27:54.79
728	464	BP	2005	2009	2025-09-30 14:33:58.98	2025-11-08 23:27:54.79
729	465	BL	2009	2014	2025-09-30 14:33:58.984	2025-11-08 23:27:54.79
731	466	ZN6	2012	2020	2025-09-30 14:33:58.988	2025-11-08 23:27:54.79
732	282	MK7.5	2018	2020	2025-11-08 15:28:36.91	2025-11-08 15:28:36.91
733	56	MK7	2013	2017	2025-11-08 17:53:32.21	2025-11-08 17:53:32.21
734	467	8V FL	2017	2020	2025-11-08 17:53:32.228	2025-11-08 17:53:32.228
735	468	F30 LCI	2016	2019	2025-11-08 17:53:32.239	2025-11-08 17:53:32.239
736	469	A90	2019	2020	2025-11-08 17:53:32.248	2025-11-08 17:53:32.248
\.


--
-- Data for Name: makes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.makes (id, name, country, created_at, updated_at) FROM stdin;
1	BMW	\N	2025-09-16 01:08:47.498709	2025-11-08 23:27:54.73
2	Benz	\N	2025-09-16 01:08:47.681903	2025-11-08 23:27:54.73
3	Audi	\N	2025-09-16 01:08:47.781618	2025-11-08 23:27:54.73
4	VW	\N	2025-09-16 01:08:47.89714	2025-11-08 23:27:54.73
5	Skoda	\N	2025-09-16 01:08:48.003546	2025-11-08 23:27:54.73
6	Mini	\N	2025-09-16 01:08:48.091934	2025-11-08 23:27:54.73
7	Porsche	\N	2025-09-16 01:08:48.12448	2025-11-08 23:27:54.73
8	Ford	\N	2025-09-16 01:08:48.197909	2025-11-08 23:27:54.73
9	Volvo	\N	2025-09-16 01:08:48.279674	2025-11-08 23:27:54.73
10	Toyota	\N	2025-09-16 01:08:48.361764	2025-11-08 23:27:54.73
11	Honda	\N	2025-09-16 01:08:48.496988	2025-11-08 23:27:54.73
12	Infiniti	\N	2025-09-16 01:08:48.623065	2025-11-08 23:27:54.73
13	Lexus	\N	2025-09-16 01:08:48.663623	2025-11-08 23:27:54.73
14	Mazda	\N	2025-09-16 01:08:48.708716	2025-11-08 23:27:54.73
15	Nissan	\N	2025-09-16 01:08:48.737843	2025-11-08 23:27:54.73
16	Subaru	\N	2025-09-16 01:08:48.779737	2025-11-08 23:27:54.73
\.


--
-- Data for Name: models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.models (id, make_id, name, external_code, created_at, updated_at) FROM stdin;
1	1	1 Series	\N	2025-09-16 01:08:47.51219	2025-11-08 23:27:54.787
2	1	3 Series	\N	2025-09-16 01:08:47.531925	2025-11-08 23:27:54.787
3	1	5 Series	\N	2025-09-16 01:08:47.555193	2025-11-08 23:27:54.787
4	1	7 Series	\N	2025-09-16 01:08:47.567396	2025-11-08 23:27:54.787
5	1	X3	\N	2025-09-16 01:08:47.57843	2025-11-08 23:27:54.787
6	1	X5	\N	2025-09-16 01:08:47.585783	2025-11-08 23:27:54.787
7	1	Z4	\N	2025-09-16 01:08:47.597142	2025-11-08 23:27:54.787
8	1	i3	\N	2025-09-16 01:08:47.605176	2025-11-08 23:27:54.787
9	1	i8	\N	2025-09-16 01:08:47.60826	2025-11-08 23:27:54.787
10	1	iX	\N	2025-09-16 01:08:47.611656	2025-11-08 23:27:54.787
11	1	M3	\N	2025-09-16 01:08:47.615721	2025-11-08 23:27:54.787
12	1	M5	\N	2025-09-16 01:08:47.624483	2025-11-08 23:27:54.787
13	1	X3 M	\N	2025-09-16 01:08:47.631909	2025-11-08 23:27:54.787
14	1	X5 M	\N	2025-09-16 01:08:47.635318	2025-11-08 23:27:54.787
15	1	X6 M	\N	2025-09-16 01:08:47.638223	2025-11-08 23:27:54.787
16	1	2 Series	\N	2025-09-16 01:08:47.641473	2025-11-08 23:27:54.787
17	1	4 Series	\N	2025-09-16 01:08:47.645105	2025-11-08 23:27:54.787
18	1	6 Series	\N	2025-09-16 01:08:47.652179	2025-11-08 23:27:54.787
19	1	8 Series	\N	2025-09-16 01:08:47.655187	2025-11-08 23:27:54.787
20	1	X4	\N	2025-09-16 01:08:47.658222	2025-11-08 23:27:54.787
21	1	X7	\N	2025-09-16 01:08:47.662681	2025-11-08 23:27:54.787
22	1	i4	\N	2025-09-16 01:08:47.66593	2025-11-08 23:27:54.787
23	1	M4	\N	2025-09-16 01:08:47.668766	2025-11-08 23:27:54.787
24	1	XM	\N	2025-09-16 01:08:47.674831	2025-11-08 23:27:54.787
25	2	C-Class	\N	2025-09-16 01:08:47.682532	2025-11-08 23:27:54.787
26	2	E-Class	\N	2025-09-16 01:08:47.695211	2025-11-08 23:27:54.787
27	2	S-Class	\N	2025-09-16 01:08:47.707082	2025-11-08 23:27:54.787
28	2	GLC	\N	2025-09-16 01:08:47.717709	2025-11-08 23:27:54.787
29	2	GLE	\N	2025-09-16 01:08:47.723525	2025-11-08 23:27:54.787
30	2	A-Class	\N	2025-09-16 01:08:47.732283	2025-11-08 23:27:54.787
31	2	GLA	\N	2025-09-16 01:08:47.737955	2025-11-08 23:27:54.787
32	2	GLB	\N	2025-09-16 01:08:47.745696	2025-11-08 23:27:54.787
33	2	G-Class	\N	2025-09-16 01:08:47.748613	2025-11-08 23:27:54.787
34	2	EQE	\N	2025-09-16 01:08:47.754596	2025-11-08 23:27:54.787
35	2	EQS	\N	2025-09-16 01:08:47.759116	2025-11-08 23:27:54.787
36	2	AMG GT	\N	2025-09-16 01:08:47.762557	2025-11-08 23:27:54.787
37	2	CLA	\N	2025-09-16 01:08:47.768466	2025-11-08 23:27:54.787
38	2	SL	\N	2025-09-16 01:08:47.776003	2025-11-08 23:27:54.787
39	3	A4	\N	2025-09-16 01:08:47.782236	2025-11-08 23:27:54.787
40	3	A6	\N	2025-09-16 01:08:47.798286	2025-11-08 23:27:54.787
41	3	A8	\N	2025-09-16 01:08:47.808287	2025-11-08 23:27:54.787
42	3	TT	\N	2025-09-16 01:08:47.814466	2025-11-08 23:27:54.787
43	3	Q5	\N	2025-09-16 01:08:47.82217	2025-11-08 23:27:54.787
44	3	Q7	\N	2025-09-16 01:08:47.831305	2025-11-08 23:27:54.787
45	3	e-tron	\N	2025-09-16 01:08:47.841353	2025-11-08 23:27:54.787
46	3	e-tron GT	\N	2025-09-16 01:08:47.844804	2025-11-08 23:27:54.787
47	3	RS6	\N	2025-09-16 01:08:47.847728	2025-11-08 23:27:54.787
48	3	A3	\N	2025-09-16 01:08:47.854784	2025-11-08 23:27:54.787
49	3	Q3	\N	2025-09-16 01:08:47.863759	2025-11-08 23:27:54.787
50	3	R8	\N	2025-09-16 01:08:47.871136	2025-11-08 23:27:54.787
51	3	e-tron FE	\N	2025-09-16 01:08:47.877226	2025-11-08 23:27:54.787
52	3	Q8	\N	2025-09-16 01:08:47.880297	2025-11-08 23:27:54.787
53	3	Q4 e-tron	\N	2025-09-16 01:08:47.884763	2025-11-08 23:27:54.787
54	3	A5	\N	2025-09-16 01:08:47.887622	2025-11-08 23:27:54.787
55	3	RS Q8	\N	2025-09-16 01:08:47.893676	2025-11-08 23:27:54.787
56	4	Golf	\N	2025-09-16 01:08:47.897787	2025-11-08 23:27:54.787
57	4	Passat	\N	2025-09-16 01:08:47.92295	2025-11-08 23:27:54.787
58	4	Tiguan	\N	2025-09-16 01:08:47.939865	2025-11-08 23:27:54.787
59	4	T-Roc	\N	2025-09-16 01:08:47.950432	2025-11-08 23:27:54.787
60	4	Touran	\N	2025-09-16 01:08:47.956273	2025-11-08 23:27:54.787
61	4	Arteon	\N	2025-09-16 01:08:47.966728	2025-11-08 23:27:54.787
62	4	ID.4	\N	2025-09-16 01:08:47.96984	2025-11-08 23:27:54.787
63	4	Caddy	\N	2025-09-16 01:08:47.977757	2025-11-08 23:27:54.787
64	4	Polo	\N	2025-09-16 01:08:47.986569	2025-11-08 23:27:54.787
65	4	Taigo	\N	2025-09-16 01:08:47.994322	2025-11-08 23:27:54.787
66	4	ID.3	\N	2025-09-16 01:08:47.997331	2025-11-08 23:27:54.787
67	4	T-Cross	\N	2025-09-16 01:08:48.000995	2025-11-08 23:27:54.787
68	5	Fabia	\N	2025-09-16 01:08:48.004162	2025-11-08 23:27:54.787
69	5	Octavia	\N	2025-09-16 01:08:48.017529	2025-11-08 23:27:54.787
70	5	Roomster	\N	2025-09-16 01:08:48.038069	2025-11-08 23:27:54.787
71	5	Superb	\N	2025-09-16 01:08:48.041807	2025-11-08 23:27:54.787
72	5	Yeti	\N	2025-09-16 01:08:48.05565	2025-11-08 23:27:54.787
73	5	Rapid	\N	2025-09-16 01:08:48.058932	2025-11-08 23:27:54.787
74	5	Kodiaq	\N	2025-09-16 01:08:48.062396	2025-11-08 23:27:54.787
75	5	Karoq	\N	2025-09-16 01:08:48.069334	2025-11-08 23:27:54.787
76	5	Kamiq	\N	2025-09-16 01:08:48.075897	2025-11-08 23:27:54.787
77	5	Scala	\N	2025-09-16 01:08:48.079021	2025-11-08 23:27:54.787
78	5	Enyaq	\N	2025-09-16 01:08:48.086252	2025-11-08 23:27:54.787
79	6	Mini Hatch	\N	2025-09-16 01:08:48.09277	2025-11-08 23:27:54.787
80	6	Mini Countryman	\N	2025-09-16 01:08:48.105511	2025-11-08 23:27:54.787
81	6	Mini Clubman	\N	2025-09-16 01:08:48.114306	2025-11-08 23:27:54.787
82	6	Mini Convertible	\N	2025-09-16 01:08:48.11887	2025-11-08 23:27:54.787
83	6	Mini Electric	\N	2025-09-16 01:08:48.122024	2025-11-08 23:27:54.787
84	7	911	\N	2025-09-16 01:08:48.12517	2025-11-08 23:27:54.787
85	7	Boxster	\N	2025-09-16 01:08:48.151257	2025-11-08 23:27:54.787
86	7	Cayman	\N	2025-09-16 01:08:48.156997	2025-11-08 23:27:54.787
87	7	Cayenne	\N	2025-09-16 01:08:48.164326	2025-11-08 23:27:54.787
88	7	Cayenne Coupe	\N	2025-09-16 01:08:48.17338	2025-11-08 23:27:54.787
89	7	Macan	\N	2025-09-16 01:08:48.176956	2025-11-08 23:27:54.787
90	7	Panamera	\N	2025-09-16 01:08:48.181776	2025-11-08 23:27:54.787
91	7	718	\N	2025-09-16 01:08:48.187563	2025-11-08 23:27:54.787
92	7	Taycan	\N	2025-09-16 01:08:48.193588	2025-11-08 23:27:54.787
93	8	Focus	\N	2025-09-16 01:08:48.198586	2025-11-08 23:27:54.787
94	8	Kuga	\N	2025-09-16 01:08:48.215397	2025-11-08 23:27:54.787
95	8	Mondeo	\N	2025-09-16 01:08:48.223899	2025-11-08 23:27:54.787
96	8	Fiesta	\N	2025-09-16 01:08:48.234359	2025-11-08 23:27:54.787
97	8	Ranger	\N	2025-09-16 01:08:48.240406	2025-11-08 23:27:54.787
98	8	Tourneo Custom	\N	2025-09-16 01:08:48.248131	2025-11-08 23:27:54.787
99	8	Tourneo Connect	\N	2025-09-16 01:08:48.251218	2025-11-08 23:27:54.787
100	8	Mustang	\N	2025-09-16 01:08:48.25411	2025-11-08 23:27:54.787
101	8	Escape	\N	2025-09-16 01:08:48.26273	2025-11-08 23:27:54.787
102	8	EcoSport	\N	2025-09-16 01:08:48.265904	2025-11-08 23:27:54.787
103	8	KUGA PHEV	\N	2025-09-16 01:08:48.269037	2025-11-08 23:27:54.787
104	8	Focus Active	\N	2025-09-16 01:08:48.272014	2025-11-08 23:27:54.787
105	8	Explorer	\N	2025-09-16 01:08:48.276916	2025-11-08 23:27:54.787
106	9	S40	\N	2025-09-16 01:08:48.280362	2025-11-08 23:27:54.787
107	9	S60	\N	2025-09-16 01:08:48.28599	2025-11-08 23:27:54.787
108	9	S80	\N	2025-09-16 01:08:48.302086	2025-11-08 23:27:54.787
109	9	S90	\N	2025-09-16 01:08:48.309399	2025-11-08 23:27:54.787
110	9	V50	\N	2025-09-16 01:08:48.31262	2025-11-08 23:27:54.787
111	9	V60	\N	2025-09-16 01:08:48.315523	2025-11-08 23:27:54.787
112	9	V70	\N	2025-09-16 01:08:48.322912	2025-11-08 23:27:54.787
113	9	XC60	\N	2025-09-16 01:08:48.326342	2025-11-08 23:27:54.787
114	9	XC70	\N	2025-09-16 01:08:48.339135	2025-11-08 23:27:54.787
115	9	XC90	\N	2025-09-16 01:08:48.342266	2025-11-08 23:27:54.787
116	9	XC40	\N	2025-09-16 01:08:48.348274	2025-11-08 23:27:54.787
117	9	C30	\N	2025-09-16 01:08:48.355639	2025-11-08 23:27:54.787
118	9	C70	\N	2025-09-16 01:08:48.358853	2025-11-08 23:27:54.787
119	10	86	\N	2025-09-16 01:08:48.36243	2025-11-08 23:27:54.787
120	10	Corolla Altis	\N	2025-09-16 01:08:48.372549	2025-11-08 23:27:54.787
121	10	Camry	\N	2025-09-16 01:08:48.388627	2025-11-08 23:27:54.787
122	10	RAV4	\N	2025-09-16 01:08:48.404016	2025-11-08 23:27:54.787
123	10	Yaris	\N	2025-09-16 01:08:48.418939	2025-11-08 23:27:54.787
124	10	Vios	\N	2025-09-16 01:08:48.429875	2025-11-08 23:27:54.787
125	10	Prius	\N	2025-09-16 01:08:48.442008	2025-11-08 23:27:54.787
126	10	Alphard	\N	2025-09-16 01:08:48.452574	2025-11-08 23:27:54.787
127	10	Sienta	\N	2025-09-16 01:08:48.463849	2025-11-08 23:27:54.787
128	10	Corolla Cross	\N	2025-09-16 01:08:48.46991	2025-11-08 23:27:54.787
129	10	Crown	\N	2025-09-16 01:08:48.477542	2025-11-08 23:27:54.787
130	10	Hilux	\N	2025-09-16 01:08:48.480414	2025-11-08 23:27:54.787
131	10	Granvia	\N	2025-09-16 01:08:48.483378	2025-11-08 23:27:54.787
132	10	bZ4X	\N	2025-09-16 01:08:48.486634	2025-11-08 23:27:54.787
133	10	C-HR	\N	2025-09-16 01:08:48.4908	2025-11-08 23:27:54.787
134	10	Yaris Cross	\N	2025-09-16 01:08:48.494492	2025-11-08 23:27:54.787
135	11	Civic	\N	2025-09-16 01:08:48.497626	2025-11-08 23:27:54.787
136	11	Accord	\N	2025-09-16 01:08:48.52653	2025-11-08 23:27:54.787
137	11	CR-V	\N	2025-09-16 01:08:48.547704	2025-11-08 23:27:54.787
138	11	Fit	\N	2025-09-16 01:08:48.561251	2025-11-08 23:27:54.787
139	11	HR-V	\N	2025-09-16 01:08:48.571272	2025-11-08 23:27:54.787
140	11	Odyssey	\N	2025-09-16 01:08:48.580176	2025-11-08 23:27:54.787
141	11	City	\N	2025-09-16 01:08:48.591193	2025-11-08 23:27:54.787
142	11	S2000	\N	2025-09-16 01:08:48.601268	2025-11-08 23:27:54.787
143	11	Legend	\N	2025-09-16 01:08:48.604189	2025-11-08 23:27:54.787
144	11	Pilot	\N	2025-09-16 01:08:48.607112	2025-11-08 23:27:54.787
145	11	Element	\N	2025-09-16 01:08:48.620564	2025-11-08 23:27:54.787
146	12	G35	\N	2025-09-16 01:08:48.623657	2025-11-08 23:27:54.787
147	12	G37	\N	2025-09-16 01:08:48.626797	2025-11-08 23:27:54.787
148	12	Q50	\N	2025-09-16 01:08:48.629746	2025-11-08 23:27:54.787
149	12	QX50	\N	2025-09-16 01:08:48.636878	2025-11-08 23:27:54.787
150	12	QX60	\N	2025-09-16 01:08:48.64313	2025-11-08 23:27:54.787
151	12	FX35	\N	2025-09-16 01:08:48.649954	2025-11-08 23:27:54.787
152	12	FX37	\N	2025-09-16 01:08:48.652828	2025-11-08 23:27:54.787
153	12	FX50	\N	2025-09-16 01:08:48.65571	2025-11-08 23:27:54.787
154	12	Q70	\N	2025-09-16 01:08:48.659747	2025-11-08 23:27:54.787
155	13	IS	\N	2025-09-16 01:08:48.664406	2025-11-08 23:27:54.787
156	13	ES	\N	2025-09-16 01:08:48.67022	2025-11-08 23:27:54.787
157	13	RX	\N	2025-09-16 01:08:48.677244	2025-11-08 23:27:54.787
158	13	LS	\N	2025-09-16 01:08:48.683394	2025-11-08 23:27:54.787
159	13	NX	\N	2025-09-16 01:08:48.689453	2025-11-08 23:27:54.787
160	13	UX	\N	2025-09-16 01:08:48.69687	2025-11-08 23:27:54.787
161	13	LC	\N	2025-09-16 01:08:48.702355	2025-11-08 23:27:54.787
162	14	BM系列	\N	2025-09-16 01:08:48.709626	2025-11-08 23:27:54.787
163	14	BP系列	\N	2025-09-16 01:08:48.7129	2025-11-08 23:27:54.787
164	14	GJ系列	\N	2025-09-16 01:08:48.7157	2025-11-08 23:27:54.787
165	14	GL系列	\N	2025-09-16 01:08:48.718725	2025-11-08 23:27:54.787
166	14	KE系列	\N	2025-09-16 01:08:48.721829	2025-11-08 23:27:54.787
167	14	KF系列	\N	2025-09-16 01:08:48.726491	2025-11-08 23:27:54.787
168	14	DM系列	\N	2025-09-16 01:08:48.729617	2025-11-08 23:27:54.787
169	14	DK系列	\N	2025-09-16 01:08:48.732612	2025-11-08 23:27:54.787
170	14	ND系列	\N	2025-09-16 01:08:48.735493	2025-11-08 23:27:54.787
171	15	Tiida	\N	2025-09-16 01:08:48.739535	2025-11-08 23:27:54.787
172	15	Sentra	\N	2025-09-16 01:08:48.746148	2025-11-08 23:27:54.787
173	15	Altima	\N	2025-09-16 01:08:48.749142	2025-11-08 23:27:54.787
174	15	X-Trail	\N	2025-09-16 01:08:48.752086	2025-11-08 23:27:54.787
175	15	Juke	\N	2025-09-16 01:08:48.76045	2025-11-08 23:27:54.787
176	15	Murano	\N	2025-09-16 01:08:48.763365	2025-11-08 23:27:54.787
177	15	Kicks	\N	2025-09-16 01:08:48.766434	2025-11-08 23:27:54.787
178	15	GT-R	\N	2025-09-16 01:08:48.769395	2025-11-08 23:27:54.787
179	15	350Z	\N	2025-09-16 01:08:48.773729	2025-11-08 23:27:54.787
180	15	370Z	\N	2025-09-16 01:08:48.777289	2025-11-08 23:27:54.787
181	16	Impreza	\N	2025-09-16 01:08:48.780494	2025-11-08 23:27:54.787
182	16	Forester	\N	2025-09-16 01:08:48.790346	2025-11-08 23:27:54.787
183	16	Legacy	\N	2025-09-16 01:08:48.799286	2025-11-08 23:27:54.787
184	16	WRX	\N	2025-09-16 01:08:48.80625	2025-11-08 23:27:54.787
185	16	BRZ	\N	2025-09-16 01:08:48.809512	2025-11-08 23:27:54.787
186	1	130i	\N	2025-09-30 14:33:57.654	2025-11-08 23:27:54.787
187	1	320i	\N	2025-09-30 14:33:57.711	2025-11-08 23:27:54.787
188	1	335i	\N	2025-09-30 14:33:57.716	2025-11-08 23:27:54.787
189	1	340i	\N	2025-09-30 14:33:57.722	2025-11-08 23:27:54.787
190	1	330i	\N	2025-09-30 14:33:57.726	2025-11-08 23:27:54.787
191	1	M340i	\N	2025-09-30 14:33:57.729	2025-11-08 23:27:54.787
192	1	530i	\N	2025-09-30 14:33:57.735	2025-11-08 23:27:54.787
193	1	535i	\N	2025-09-30 14:33:57.738	2025-11-08 23:27:54.787
194	1	540i	\N	2025-09-30 14:33:57.742	2025-11-08 23:27:54.787
195	1	M550i	\N	2025-09-30 14:33:57.745	2025-11-08 23:27:54.787
196	1	750i	\N	2025-09-30 14:33:57.749	2025-11-08 23:27:54.787
197	1	740i	\N	2025-09-30 14:33:57.752	2025-11-08 23:27:54.787
198	1	M760i	\N	2025-09-30 14:33:57.755	2025-11-08 23:27:54.787
199	1	xDrive35i	\N	2025-09-30 14:33:57.759	2025-11-08 23:27:54.787
200	1	X3 M40i	\N	2025-09-30 14:33:57.762	2025-11-08 23:27:54.787
201	1	xDrive50i	\N	2025-09-30 14:33:57.766	2025-11-08 23:27:54.787
202	1	X5 M50i	\N	2025-09-30 14:33:57.773	2025-11-08 23:27:54.787
203	1	Z4 sDrive35i	\N	2025-09-30 14:33:57.776	2025-11-08 23:27:54.787
204	1	Z4 M40i	\N	2025-09-30 14:33:57.779	2025-11-08 23:27:54.787
205	1	iX xDrive50	\N	2025-09-30 14:33:57.79	2025-11-08 23:27:54.787
206	1	M3 Competition	\N	2025-09-30 14:33:57.801	2025-11-08 23:27:54.787
207	1	M5 Competition	\N	2025-09-30 14:33:57.807	2025-11-08 23:27:54.787
208	1	X3 M Competition	\N	2025-09-30 14:33:57.81	2025-11-08 23:27:54.787
209	1	X6 M Competition	\N	2025-09-30 14:33:57.817	2025-11-08 23:27:54.787
210	1	M235i xDrive	\N	2025-09-30 14:33:57.82	2025-11-08 23:27:54.787
211	1	440i	\N	2025-09-30 14:33:57.823	2025-11-08 23:27:54.787
212	1	M440i	\N	2025-09-30 14:33:57.826	2025-11-08 23:27:54.787
213	1	640i GT	\N	2025-09-30 14:33:57.83	2025-11-08 23:27:54.787
214	1	M850i	\N	2025-09-30 14:33:57.834	2025-11-08 23:27:54.787
215	1	X4 M40i	\N	2025-09-30 14:33:57.837	2025-11-08 23:27:54.787
216	1	X7 M50i	\N	2025-09-30 14:33:57.84	2025-11-08 23:27:54.787
217	1	i4 M50	\N	2025-09-30 14:33:57.844	2025-11-08 23:27:54.787
218	1	M4 CSL	\N	2025-09-30 14:33:57.848	2025-11-08 23:27:54.787
219	1	M5 CS	\N	2025-09-30 14:33:57.854	2025-11-08 23:27:54.787
220	1	XM Label Red	\N	2025-09-30 14:33:57.86	2025-11-08 23:27:54.787
221	1	M3 CSL	\N	2025-09-30 14:33:57.863	2025-11-08 23:27:54.787
222	2	C200	\N	2025-09-30 14:33:57.87	2025-11-08 23:27:54.787
223	2	C250	\N	2025-09-30 14:33:57.874	2025-11-08 23:27:54.787
224	2	E200K	\N	2025-09-30 14:33:57.884	2025-11-08 23:27:54.787
225	2	E250	\N	2025-09-30 14:33:57.888	2025-11-08 23:27:54.787
226	2	E200	\N	2025-09-30 14:33:57.892	2025-11-08 23:27:54.787
227	2	S350L	\N	2025-09-30 14:33:57.9	2025-11-08 23:27:54.787
228	2	S450L	\N	2025-09-30 14:33:57.904	2025-11-08 23:27:54.787
229	2	S500L	\N	2025-09-30 14:33:57.908	2025-11-08 23:27:54.787
230	2	GLC200	\N	2025-09-30 14:33:57.913	2025-11-08 23:27:54.787
231	2	GLC300e	\N	2025-09-30 14:33:57.917	2025-11-08 23:27:54.787
232	2	GLE350d	\N	2025-09-30 14:33:57.921	2025-11-08 23:27:54.787
233	2	GLE450	\N	2025-09-30 14:33:57.925	2025-11-08 23:27:54.787
234	2	A180	\N	2025-09-30 14:33:57.93	2025-11-08 23:27:54.787
235	2	A200	\N	2025-09-30 14:33:57.935	2025-11-08 23:27:54.787
236	2	GLA200	\N	2025-09-30 14:33:57.939	2025-11-08 23:27:54.787
237	2	GLA250	\N	2025-09-30 14:33:57.943	2025-11-08 23:27:54.787
238	2	GLB200	\N	2025-09-30 14:33:57.947	2025-11-08 23:27:54.787
239	2	G500	\N	2025-09-30 14:33:57.951	2025-11-08 23:27:54.787
240	2	G400d	\N	2025-09-30 14:33:57.955	2025-11-08 23:27:54.787
241	2	EQE350+	\N	2025-09-30 14:33:57.96	2025-11-08 23:27:54.787
242	2	EQS450+	\N	2025-09-30 14:33:57.964	2025-11-08 23:27:54.787
243	2	AMG GT S	\N	2025-09-30 14:33:57.969	2025-11-08 23:27:54.787
244	2	AMG GT 63 S	\N	2025-09-30 14:33:57.973	2025-11-08 23:27:54.787
245	2	CLA200	\N	2025-09-30 14:33:57.977	2025-11-08 23:27:54.787
246	2	CLA35 AMG	\N	2025-09-30 14:33:57.982	2025-11-08 23:27:54.787
247	2	SL500	\N	2025-09-30 14:33:57.986	2025-11-08 23:27:54.787
248	2	SL55 AMG	\N	2025-09-30 14:33:57.99	2025-11-08 23:27:54.787
249	3	A4 1.8T	\N	2025-09-30 14:33:57.996	2025-11-08 23:27:54.787
250	3	A4 2.0T FSI	\N	2025-09-30 14:33:58.001	2025-11-08 23:27:54.787
251	3	A4 2.0TFSI	\N	2025-09-30 14:33:58.005	2025-11-08 23:27:54.787
252	3	A4 40 TFSI	\N	2025-09-30 14:33:58.009	2025-11-08 23:27:54.787
253	3	A4 45 TFSI	\N	2025-09-30 14:33:58.013	2025-11-08 23:27:54.787
254	3	A6 2.8 FSI	\N	2025-09-30 14:33:58.017	2025-11-08 23:27:54.787
255	3	A6 35 TDI	\N	2025-09-30 14:33:58.021	2025-11-08 23:27:54.787
256	3	A6 45 TFSI	\N	2025-09-30 14:33:58.026	2025-11-08 23:27:54.787
257	3	A8L 3.0T	\N	2025-09-30 14:33:58.03	2025-11-08 23:27:54.787
258	3	A8L 55 TFSI	\N	2025-09-30 14:33:58.034	2025-11-08 23:27:54.787
259	3	TT 2.0TFSI	\N	2025-09-30 14:33:58.038	2025-11-08 23:27:54.787
260	3	TT S	\N	2025-09-30 14:33:58.04	2025-11-08 23:27:54.787
261	3	Q5 2.0TFSI	\N	2025-09-30 14:33:58.043	2025-11-08 23:27:54.787
262	3	Q5 45 TFSI	\N	2025-09-30 14:33:58.045	2025-11-08 23:27:54.787
263	3	Q5 55 TFSI e	\N	2025-09-30 14:33:58.049	2025-11-08 23:27:54.787
264	3	Q7 3.0 TDI	\N	2025-09-30 14:33:58.053	2025-11-08 23:27:54.787
265	3	Q7 45 TDI	\N	2025-09-30 14:33:58.057	2025-11-08 23:27:54.787
266	3	Q7 e-tron	\N	2025-09-30 14:33:58.061	2025-11-08 23:27:54.787
267	3	e-tron 55	\N	2025-09-30 14:33:58.066	2025-11-08 23:27:54.787
268	3	RS6 Avant	\N	2025-09-30 14:33:58.075	2025-11-08 23:27:54.787
269	3	A3 1.8T	\N	2025-09-30 14:33:58.081	2025-11-08 23:27:54.787
270	3	A3 40 TFSI	\N	2025-09-30 14:33:58.086	2025-11-08 23:27:54.787
271	3	A3 35 TFSI	\N	2025-09-30 14:33:58.09	2025-11-08 23:27:54.787
272	3	Q3 2.0TFSI	\N	2025-09-30 14:33:58.095	2025-11-08 23:27:54.787
273	3	Q3 45 TFSI	\N	2025-09-30 14:33:58.099	2025-11-08 23:27:54.787
274	3	R8 4.2 FSI	\N	2025-09-30 14:33:58.101	2025-11-08 23:27:54.787
275	3	R8 V10 Plus	\N	2025-09-30 14:33:58.104	2025-11-08 23:27:54.787
276	3	e-tron S	\N	2025-09-30 14:33:58.106	2025-11-08 23:27:54.787
277	3	Q8 55 TFSI	\N	2025-09-30 14:33:58.109	2025-11-08 23:27:54.787
278	3	Q4 40 e-tron	\N	2025-09-30 14:33:58.112	2025-11-08 23:27:54.787
279	3	A5 2.0TFSI	\N	2025-09-30 14:33:58.116	2025-11-08 23:27:54.787
280	3	A5 Sportback 45 TFSI	\N	2025-09-30 14:33:58.12	2025-11-08 23:27:54.787
281	4	Golf 1.6	\N	2025-09-30 14:33:58.128	2025-11-08 23:27:54.787
282	4	GTI 2.0T	\N	2025-09-30 14:33:58.133	2025-11-08 23:27:54.787
283	4	Golf 1.4 TSI	\N	2025-09-30 14:33:58.136	2025-11-08 23:27:54.787
284	4	Golf 1.5 eTSI	\N	2025-09-30 14:33:58.147	2025-11-08 23:27:54.787
285	4	Passat 2.0 TDI	\N	2025-09-30 14:33:58.154	2025-11-08 23:27:54.787
286	4	Passat 1.8 TSI	\N	2025-09-30 14:33:58.157	2025-11-08 23:27:54.787
287	4	Passat 2.0 TSI	\N	2025-09-30 14:33:58.16	2025-11-08 23:27:54.787
288	4	Passat 1.5 eTSI	\N	2025-09-30 14:33:58.163	2025-11-08 23:27:54.787
289	4	Tiguan 2.0 TSI	\N	2025-09-30 14:33:58.167	2025-11-08 23:27:54.787
290	4	Tiguan 330 TSI	\N	2025-09-30 14:33:58.17	2025-11-08 23:27:54.787
291	4	Tiguan 1.5 eTSI	\N	2025-09-30 14:33:58.173	2025-11-08 23:27:54.787
292	4	T-Roc 230 TSI	\N	2025-09-30 14:33:58.176	2025-11-08 23:27:54.787
293	4	T-Roc 330 TSI R-Line	\N	2025-09-30 14:33:58.179	2025-11-08 23:27:54.787
294	4	Touran 1.9 TDI	\N	2025-09-30 14:33:58.185	2025-11-08 23:27:54.787
295	4	Touran 1.4 TSI	\N	2025-09-30 14:33:58.19	2025-11-08 23:27:54.787
296	4	Touran 1.5 TSI	\N	2025-09-30 14:33:58.194	2025-11-08 23:27:54.787
297	4	Arteon 330 TSI	\N	2025-09-30 14:33:58.199	2025-11-08 23:27:54.787
298	4	Caddy 1.6 TDI	\N	2025-09-30 14:33:58.202	2025-11-08 23:27:54.787
299	4	Caddy 1.4 TSI	\N	2025-09-30 14:33:58.207	2025-11-08 23:27:54.787
300	4	Caddy Cargo	\N	2025-09-30 14:33:58.212	2025-11-08 23:27:54.787
301	4	Polo 1.6	\N	2025-09-30 14:33:58.217	2025-11-08 23:27:54.787
302	4	Polo 230 TSI	\N	2025-09-30 14:33:58.222	2025-11-08 23:27:54.787
303	4	T-Cross 230 TSI	\N	2025-09-30 14:33:58.226	2025-11-08 23:27:54.787
304	5	Fabia 1.4 MPI	\N	2025-09-30 14:33:58.231	2025-11-08 23:27:54.787
305	5	1.4L MPI	\N	2025-09-30 14:33:58.235	2025-11-08 23:27:54.787
306	5	Fabia Combi 1.2 TSI	\N	2025-09-30 14:33:58.24	2025-11-08 23:27:54.787
307	5	Fabia 1.0 TSI	\N	2025-09-30 14:33:58.244	2025-11-08 23:27:54.787
308	5	Octavia 1.6 MPI	\N	2025-09-30 14:33:58.248	2025-11-08 23:27:54.787
309	5	1.8 TSI	\N	2025-09-30 14:33:58.253	2025-11-08 23:27:54.787
310	5	1.4 TSI	\N	2025-09-30 14:33:58.258	2025-11-08 23:27:54.787
311	5	1.5 TSI e-TEC	\N	2025-09-30 14:33:58.261	2025-11-08 23:27:54.787
312	5	RS 2.0 TSI	\N	2025-09-30 14:33:58.267	2025-11-08 23:27:54.787
313	5	Superb 2.0 FSI	\N	2025-09-30 14:33:58.271	2025-11-08 23:27:54.787
314	5	2.0 TDI	\N	2025-09-30 14:33:58.274	2025-11-08 23:27:54.787
315	5	2.0 TSI	\N	2025-09-30 14:33:58.278	2025-11-08 23:27:54.787
316	5	2.0 TSI L&K	\N	2025-09-30 14:33:58.281	2025-11-08 23:27:54.787
317	5	Yeti 1.2 TSI	\N	2025-09-30 14:33:58.284	2025-11-08 23:27:54.787
318	5	1.6L MPI	\N	2025-09-30 14:33:58.287	2025-11-08 23:27:54.787
319	5	2.0 TSI RS	\N	2025-09-30 14:33:58.291	2025-11-08 23:27:54.787
320	5	1.5 TSI	\N	2025-09-30 14:33:58.294	2025-11-08 23:27:54.787
321	5	1.0 TSI	\N	2025-09-30 14:33:58.299	2025-11-08 23:27:54.787
322	7	Carrera	\N	2025-09-30 14:33:58.306	2025-11-08 23:27:54.787
323	7	Cayenne (小改)	\N	2025-09-30 14:33:58.328	2025-11-08 23:27:54.787
324	7	Macan Electric	\N	2025-09-30 14:33:58.336	2025-11-08 23:27:54.787
325	7	Taycan / 4S / Turbo	\N	2025-09-30 14:33:58.347	2025-11-08 23:27:54.787
326	6	Cooper	\N	2025-09-30 14:33:58.352	2025-11-08 23:27:54.787
327	6	Cooper S	\N	2025-09-30 14:33:58.355	2025-11-08 23:27:54.787
328	6	Cooper SE	\N	2025-09-30 14:33:58.371	2025-11-08 23:27:54.787
329	8	Focus 2.0	\N	2025-09-30 14:33:58.375	2025-11-08 23:27:54.787
330	8	Focus TDCi	\N	2025-09-30 14:33:58.378	2025-11-08 23:27:54.787
331	8	Focus 1.5T	\N	2025-09-30 14:33:58.38	2025-11-08 23:27:54.787
332	8	Focus ST-Line	\N	2025-09-30 14:33:58.384	2025-11-08 23:27:54.787
333	8	Focus ST	\N	2025-09-30 14:33:58.387	2025-11-08 23:27:54.787
334	8	Kuga 2.0T	\N	2025-09-30 14:33:58.39	2025-11-08 23:27:54.787
335	8	Kuga 180	\N	2025-09-30 14:33:58.395	2025-11-08 23:27:54.787
336	8	Kuga ST-Line	\N	2025-09-30 14:33:58.398	2025-11-08 23:27:54.787
337	8	Mondeo 2.0T	\N	2025-09-30 14:33:58.401	2025-11-08 23:27:54.787
338	8	Mondeo Hybrid	\N	2025-09-30 14:33:58.404	2025-11-08 23:27:54.787
339	8	Mondeo Wagon	\N	2025-09-30 14:33:58.406	2025-11-08 23:27:54.787
340	8	Fiesta 1.6	\N	2025-09-30 14:33:58.409	2025-11-08 23:27:54.787
341	8	Fiesta 1.0T	\N	2025-09-30 14:33:58.412	2025-11-08 23:27:54.787
342	8	Ranger 3.2	\N	2025-09-30 14:33:58.416	2025-11-08 23:27:54.787
343	8	Ranger Wildtrak	\N	2025-09-30 14:33:58.419	2025-11-08 23:27:54.787
344	8	Mustang 2.3T	\N	2025-09-30 14:33:58.428	2025-11-08 23:27:54.787
345	8	Mustang Dark Horse	\N	2025-09-30 14:33:58.432	2025-11-08 23:27:54.787
346	8	Escape 2.3	\N	2025-09-30 14:33:58.435	2025-11-08 23:27:54.787
347	8	EcoSport 1.5	\N	2025-09-30 14:33:58.439	2025-11-08 23:27:54.787
348	8	Kuga PHEV	\N	2025-09-30 14:33:58.442	2025-11-08 23:27:54.787
349	8	Territory	\N	2025-09-30 14:33:58.449	2025-11-08 23:27:54.787
350	9	S40 2.0L T4	\N	2025-09-30 14:33:58.455	2025-11-08 23:27:54.787
351	9	S40 2.5T	\N	2025-09-30 14:33:58.458	2025-11-08 23:27:54.787
352	9	S60 2.4L	\N	2025-09-30 14:33:58.462	2025-11-08 23:27:54.787
353	9	S60 T5	\N	2025-09-30 14:33:58.467	2025-11-08 23:27:54.787
354	9	S60 T6	\N	2025-09-30 14:33:58.47	2025-11-08 23:27:54.787
355	9	S60 T8 Polestar	\N	2025-09-30 14:33:58.474	2025-11-08 23:27:54.787
356	9	S60 B5	\N	2025-09-30 14:33:58.478	2025-11-08 23:27:54.787
357	9	S80 3.2	\N	2025-09-30 14:33:58.481	2025-11-08 23:27:54.787
358	9	S80 T6	\N	2025-09-30 14:33:58.485	2025-11-08 23:27:54.787
359	9	S90 B5	\N	2025-09-30 14:33:58.488	2025-11-08 23:27:54.787
360	9	V50 2.4i	\N	2025-09-30 14:33:58.492	2025-11-08 23:27:54.787
361	9	V60 T5	\N	2025-09-30 14:33:58.495	2025-11-08 23:27:54.787
362	9	V60 B5	\N	2025-09-30 14:33:58.499	2025-11-08 23:27:54.787
363	9	V70 2.5T	\N	2025-09-30 14:33:58.502	2025-11-08 23:27:54.787
364	9	XC60 3.0 T6	\N	2025-09-30 14:33:58.504	2025-11-08 23:27:54.787
365	9	XC60 B4	\N	2025-09-30 14:33:58.508	2025-11-08 23:27:54.787
366	9	XC60 B5	\N	2025-09-30 14:33:58.511	2025-11-08 23:27:54.787
367	9	XC60 T8 Recharge	\N	2025-09-30 14:33:58.515	2025-11-08 23:27:54.787
368	9	XC70 3.2	\N	2025-09-30 14:33:58.518	2025-11-08 23:27:54.787
369	9	XC90 2.5T	\N	2025-09-30 14:33:58.522	2025-11-08 23:27:54.787
370	9	XC90 T8 Recharge	\N	2025-09-30 14:33:58.525	2025-11-08 23:27:54.787
371	9	XC40 B4	\N	2025-09-30 14:33:58.529	2025-11-08 23:27:54.787
372	9	XC40 Recharge	\N	2025-09-30 14:33:58.533	2025-11-08 23:27:54.787
373	9	C30 2.4i	\N	2025-09-30 14:33:58.536	2025-11-08 23:27:54.787
374	9	C70 T5	\N	2025-09-30 14:33:58.54	2025-11-08 23:27:54.787
375	10	GR Supra 3.0 Turbo (前期)	\N	2025-09-30 14:33:58.545	2025-11-08 23:27:54.787
376	10	GR Supra 3.0 Turbo (後期)	\N	2025-09-30 14:33:58.548	2025-11-08 23:27:54.787
377	10	GR Supra 2.0 Turbo	\N	2025-09-30 14:33:58.551	2025-11-08 23:27:54.787
378	10	Toyota 86 標準版	\N	2025-09-30 14:33:58.555	2025-11-08 23:27:54.787
379	10	Toyota 86 GT	\N	2025-09-30 14:33:58.558	2025-11-08 23:27:54.787
380	10	Toyota 86 改款版	\N	2025-09-30 14:33:58.56	2025-11-08 23:27:54.787
381	10	Altis 1.8J	\N	2025-09-30 14:33:58.564	2025-11-08 23:27:54.787
382	10	Altis 1.8E	\N	2025-09-30 14:33:58.568	2025-11-08 23:27:54.787
383	10	Altis 1.8尊爵	\N	2025-09-30 14:33:58.572	2025-11-08 23:27:54.787
384	10	Altis 1.8油電	\N	2025-09-30 14:33:58.577	2025-11-08 23:27:54.787
385	10	Altis GR Sport	\N	2025-09-30 14:33:58.581	2025-11-08 23:27:54.787
386	10	Camry 2.0G	\N	2025-09-30 14:33:58.584	2025-11-08 23:27:54.787
387	10	Camry 2.5Q	\N	2025-09-30 14:33:58.586	2025-11-08 23:27:54.787
388	10	Camry 2.5 Hybrid	\N	2025-09-30 14:33:58.589	2025-11-08 23:27:54.787
389	10	Camry 2.5油電旗艦	\N	2025-09-30 14:33:58.591	2025-11-08 23:27:54.787
390	10	RAV4 2.4G	\N	2025-09-30 14:33:58.595	2025-11-08 23:27:54.787
391	10	RAV4 2.5 4WD	\N	2025-09-30 14:33:58.6	2025-11-08 23:27:54.787
392	10	RAV4 2.5 Adventure	\N	2025-09-30 14:33:58.604	2025-11-08 23:27:54.787
393	10	RAV4 Hybrid	\N	2025-09-30 14:33:58.608	2025-11-08 23:27:54.787
394	10	Yaris 1.5G	\N	2025-09-30 14:33:58.612	2025-11-08 23:27:54.787
395	10	Yaris 1.5豪華	\N	2025-09-30 14:33:58.617	2025-11-08 23:27:54.787
396	10	Yaris GR Sport	\N	2025-09-30 14:33:58.621	2025-11-08 23:27:54.787
397	10	Vios 1.5E	\N	2025-09-30 14:33:58.626	2025-11-08 23:27:54.787
398	10	Vios 1.5雅緻	\N	2025-09-30 14:33:58.631	2025-11-08 23:27:54.787
399	10	Vios 1.5豪華	\N	2025-09-30 14:33:58.634	2025-11-08 23:27:54.787
400	10	Vios 1.5油電	\N	2025-09-30 14:33:58.637	2025-11-08 23:27:54.787
401	10	Prius 1.8	\N	2025-09-30 14:33:58.639	2025-11-08 23:27:54.787
402	10	Prius PHEV	\N	2025-09-30 14:33:58.644	2025-11-08 23:27:54.787
403	10	Alphard 3.5	\N	2025-09-30 14:33:58.649	2025-11-08 23:27:54.787
404	10	Alphard 2.5油電	\N	2025-09-30 14:33:58.653	2025-11-08 23:27:54.787
405	10	Sienta 1.8	\N	2025-09-30 14:33:58.66	2025-11-08 23:27:54.787
406	10	Sienta 1.8油電	\N	2025-09-30 14:33:58.665	2025-11-08 23:27:54.787
407	10	Corolla Cross油電	\N	2025-09-30 14:33:58.669	2025-11-08 23:27:54.787
408	10	Corolla Cross GR Sport	\N	2025-09-30 14:33:58.672	2025-11-08 23:27:54.787
409	10	Crown Crossover	\N	2025-09-30 14:33:58.676	2025-11-08 23:27:54.787
410	10	Hilux 2.8	\N	2025-09-30 14:33:58.679	2025-11-08 23:27:54.787
411	10	Granvia 2.8	\N	2025-09-30 14:33:58.683	2025-11-08 23:27:54.787
412	10	C-HR 1.8油電	\N	2025-09-30 14:33:58.69	2025-11-08 23:27:54.787
413	10	Yaris Cross油電	\N	2025-09-30 14:33:58.693	2025-11-08 23:27:54.787
414	11	Civic 1.8	\N	2025-09-30 14:33:58.698	2025-11-08 23:27:54.787
415	11	Civic 2.0 Type S	\N	2025-09-30 14:33:58.702	2025-11-08 23:27:54.787
416	11	Civic 2.0	\N	2025-09-30 14:33:58.707	2025-11-08 23:27:54.787
417	11	Civic 1.5 Turbo	\N	2025-09-30 14:33:58.71	2025-11-08 23:27:54.787
418	11	Civic Type R	\N	2025-09-30 14:33:58.715	2025-11-08 23:27:54.787
419	11	Civic e:HEV	\N	2025-09-30 14:33:58.718	2025-11-08 23:27:54.787
420	11	Accord 2.4	\N	2025-09-30 14:33:58.723	2025-11-08 23:27:54.787
421	11	Accord 3.5	\N	2025-09-30 14:33:58.729	2025-11-08 23:27:54.787
422	11	Accord 1.5 Turbo	\N	2025-09-30 14:33:58.737	2025-11-08 23:27:54.787
423	11	Accord 2.0 Hybrid	\N	2025-09-30 14:33:58.74	2025-11-08 23:27:54.787
424	11	CR-V 2.4	\N	2025-09-30 14:33:58.744	2025-11-08 23:27:54.787
425	11	CR-V 1.5 Turbo	\N	2025-09-30 14:33:58.751	2025-11-08 23:27:54.787
426	11	CR-V e:HEV	\N	2025-09-30 14:33:58.754	2025-11-08 23:27:54.787
427	11	Fit 1.5	\N	2025-09-30 14:33:58.757	2025-11-08 23:27:54.787
428	11	Fit e:HEV	\N	2025-09-30 14:33:58.763	2025-11-08 23:27:54.787
429	11	HR-V 1.8	\N	2025-09-30 14:33:58.766	2025-11-08 23:27:54.787
430	11	HR-V e:HEV	\N	2025-09-30 14:33:58.769	2025-11-08 23:27:54.787
431	11	HR-V 1.5 Turbo	\N	2025-09-30 14:33:58.772	2025-11-08 23:27:54.787
432	11	Odyssey 2.4	\N	2025-09-30 14:33:58.774	2025-11-08 23:27:54.787
433	11	Odyssey e:HEV	\N	2025-09-30 14:33:58.778	2025-11-08 23:27:54.787
434	11	City 1.5	\N	2025-09-30 14:33:58.782	2025-11-08 23:27:54.787
435	11	City e:HEV	\N	2025-09-30 14:33:58.787	2025-11-08 23:27:54.787
436	11	Legend 3.5	\N	2025-09-30 14:33:58.793	2025-11-08 23:27:54.787
437	11	Pilot 3.5	\N	2025-09-30 14:33:58.797	2025-11-08 23:27:54.787
438	11	Element 2.4	\N	2025-09-30 14:33:58.807	2025-11-08 23:27:54.787
439	13	IS250	\N	2025-09-30 14:33:58.845	2025-11-08 23:27:54.787
440	13	IS300	\N	2025-09-30 14:33:58.849	2025-11-08 23:27:54.787
441	13	ES350	\N	2025-09-30 14:33:58.852	2025-11-08 23:27:54.787
442	13	ES300h	\N	2025-09-30 14:33:58.856	2025-11-08 23:27:54.787
443	13	RX350	\N	2025-09-30 14:33:58.86	2025-11-08 23:27:54.787
444	13	RX450h	\N	2025-09-30 14:33:58.865	2025-11-08 23:27:54.787
445	13	LS460	\N	2025-09-30 14:33:58.868	2025-11-08 23:27:54.787
446	13	LS500h	\N	2025-09-30 14:33:58.871	2025-11-08 23:27:54.787
447	13	NX300h	\N	2025-09-30 14:33:58.875	2025-11-08 23:27:54.787
448	13	NX350	\N	2025-09-30 14:33:58.878	2025-11-08 23:27:54.787
449	13	UX200	\N	2025-09-30 14:33:58.882	2025-11-08 23:27:54.787
450	13	UX250h	\N	2025-09-30 14:33:58.885	2025-11-08 23:27:54.787
451	13	LC500	\N	2025-09-30 14:33:58.889	2025-11-08 23:27:54.787
452	13	LC500h	\N	2025-09-30 14:33:58.892	2025-11-08 23:27:54.787
453	14	Mazda3	\N	2025-09-30 14:33:58.897	2025-11-08 23:27:54.787
454	14	Mazda6	\N	2025-09-30 14:33:58.903	2025-11-08 23:27:54.787
455	14	CX-5	\N	2025-09-30 14:33:58.908	2025-11-08 23:27:54.787
456	14	CX-30	\N	2025-09-30 14:33:58.914	2025-11-08 23:27:54.787
457	14	CX-3	\N	2025-09-30 14:33:58.917	2025-11-08 23:27:54.787
458	14	MX-5	\N	2025-09-30 14:33:58.921	2025-11-08 23:27:54.787
459	16	WRX STI	\N	2025-09-30 14:33:58.96	2025-11-08 23:27:54.787
460	16	Impreza 2.0i	\N	2025-09-30 14:33:58.965	2025-11-08 23:27:54.787
461	16	Forester 2.0XT	\N	2025-09-30 14:33:58.968	2025-11-08 23:27:54.787
462	16	Forester 2.0i	\N	2025-09-30 14:33:58.972	2025-11-08 23:27:54.787
463	16	Forester 2.0i-L	\N	2025-09-30 14:33:58.975	2025-11-08 23:27:54.787
464	16	Legacy 2.0GT	\N	2025-09-30 14:33:58.979	2025-11-08 23:27:54.787
465	16	Legacy 2.5i	\N	2025-09-30 14:33:58.982	2025-11-08 23:27:54.787
466	16	BRZ 2.0L	\N	2025-09-30 14:33:58.987	2025-11-08 23:27:54.787
467	3	RS3	\N	2025-11-08 17:53:32.22	2025-11-08 17:53:32.22
468	1	3-Series	\N	2025-11-08 17:53:32.236	2025-11-08 17:53:32.236
469	10	GR Supra	\N	2025-11-08 17:53:32.245	2025-11-08 17:53:32.245
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, part_id, quantity, price_twd, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, garage_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: part_compatibilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.part_compatibilities (id, part_id, vehicle_variant_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parts (id, sku, name, category, brand, price_twd, cost_twd, currency, weight_kg, vat_included, stock_qty, description, created_at, updated_at, image_url, msrp_twd, wholesale_twd, availability_mode, lead_time_days) FROM stdin;
2	33-3111	K&N空濾	濾芯	k&n	2200.00	2000.00	TWD	\N	t	0	品牌 K&N\n料號: 33-3111\n規格: 273x169mm\n對應車型: \nAUDI A3 1.0/1.5 2020-\nVW GOLF MK8 1.0/1.5 2021-\n\n可搭配K&N清潔組清洗後重複使用\n\n*商品庫存每日皆有變動下標前可先詢問有無現貨\n*圖片僅供參考,實際商品請以實物為準\n*賣場皆有標示對應車型/尺寸規格，下標前請先行確認\n*無安裝可退換貨，商品一旦拆封安裝一律不得退換	2025-11-03 06:52:06.13	2025-11-10 01:43:38.070966	\\media\\parts\\Intake\\airfilter\\KN\\33-3111.jpg	2200	2000	\N	\N
\.


--
-- Data for Name: parts_on_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parts_on_categories (id, part_id, category_id, is_primary) FROM stdin;
\.


--
-- Data for Name: price_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_rules (id, name, role, scope_type, scope_value, rule_type, value, priority, active, valid_from, valid_to, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, display_name, email, role, password_hash, created_at) FROM stdin;
\.


--
-- Data for Name: vehicle_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_variants (id, model_id, generation_id, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech, created_at, updated_at, name) FROM stdin;
1	1	1	2004	2011	N52	2996	265	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.525723	2025-11-08 23:27:54.793	\N
2	2	2	2005	2012	N46	1995	150	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.534913	2025-11-08 23:27:54.793	\N
3	2	2	2007	2010	N54	2979	306	雙渦輪增壓	RWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.540088	2025-11-08 23:27:54.793	\N
4	2	4	2012	2018	B48	1998	184	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.543924	2025-11-08 23:27:54.793	\N
5	2	4	2015	2019	B58	2998	326	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.546656	2025-11-08 23:27:54.793	\N
6	2	6	2019	2023	B48B20	1998	258	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.549592	2025-11-08 23:27:54.793	\N
7	2	6	2019	2023	B58B30	2998	387	渦輪增壓	AWD	雙接頭彈簧柱(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.552437	2025-11-08 23:27:54.793	\N
8	3	7	2003	2010	N52	2996	258	自然進氣	RWD	雙A臂	整體式多連桿	汽油	\N	2025-09-16 01:08:47.557188	2025-11-08 23:27:54.793	\N
9	3	8	2010	2016	N55	2979	306	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.56057	2025-11-08 23:27:54.793	\N
10	3	9	2017	2023	B58	2998	340	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.563417	2025-11-08 23:27:54.793	\N
11	3	9	2017	2023	N63	4395	530	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.565991	2025-11-08 23:27:54.793	\N
12	4	10	2008	2015	N63	4395	450	雙渦輪增壓	RWD	雙接頭彈簧柱	整體式多連桿	汽油	\N	2025-09-16 01:08:47.570511	2025-11-08 23:27:54.793	\N
13	4	11	2015	2022	B58	2998	326	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.573859	2025-11-08 23:27:54.793	\N
14	4	11	2016	2022	N74	6592	610	雙渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.577015	2025-11-08 23:27:54.793	\N
15	5	13	2010	2017	N55	2979	306	渦輪增壓	AWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.580178	2025-11-08 23:27:54.793	\N
16	5	14	2017	2023	B58	2998	360	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.583137	2025-11-08 23:27:54.793	\N
17	6	15	2006	2013	N63	4395	408	雙渦輪增壓	AWD	雙A臂	整體式多連桿	汽油	\N	2025-09-16 01:08:47.588194	2025-11-08 23:27:54.793	\N
18	6	16	2013	2018	S63	4395	575	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.591766	2025-11-08 23:27:54.793	\N
19	6	17	2018	2023	N63	4395	530	雙渦輪增壓	AWD	雙A臂	多連桿	汽油	\N	2025-09-16 01:08:47.595432	2025-11-08 23:27:54.793	\N
20	7	18	2009	2016	N54	2979	306	雙渦輪增壓	RWD	麥花臣	中央控制臂	汽油	\N	2025-09-16 01:08:47.599186	2025-11-08 23:27:54.793	\N
21	7	19	2018	2023	B58	2998	340	渦輪增壓	RWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.60374	2025-11-08 23:27:54.793	\N
22	8	20	2013	2022	電動	\N	170	電動	RWD	麥花臣	拖曳臂	純電	\N	2025-09-16 01:08:47.606907	2025-11-08 23:27:54.793	\N
23	9	21	2014	2020	B38	1499	362	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.610276	2025-11-08 23:27:54.793	\N
24	10	22	2021	2023	電動	\N	523	電動	AWD	雙接頭彈簧柱	多連桿	純電	\N	2025-09-16 01:08:47.613331	2025-11-08 23:27:54.793	\N
25	11	23	2007	2013	S65	3999	420	自然進氣	RWD	雙A臂	多連桿	汽油	\N	2025-09-16 01:08:47.617707	2025-11-08 23:27:54.793	\N
26	11	24	2014	2018	S55	2979	431	雙渦輪增壓	RWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.620579	2025-11-08 23:27:54.793	\N
28	12	26	2011	2016	S63	4395	560	雙渦輪增壓	RWD	雙A臂	多連桿	汽油	\N	2025-09-16 01:08:47.626516	2025-11-08 23:27:54.793	\N
29	12	27	2017	2023	S63	4395	625	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.629495	2025-11-08 23:27:54.793	\N
30	13	28	2019	2023	S58	2993	510	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.633921	2025-11-08 23:27:54.793	\N
31	14	29	2013	2018	S63	4395	575	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.636964	2025-11-08 23:27:54.793	\N
32	15	30	2019	2023	S63	4395	625	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.640018	2025-11-08 23:27:54.793	\N
33	16	31	2020	2023	B48	1998	306	渦輪增壓	AWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.64372	2025-11-08 23:27:54.793	\N
34	17	32	2014	2020	B58	2998	326	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.647794	2025-11-08 23:27:54.793	\N
35	17	33	2020	2023	B58B30	2998	387	渦輪增壓	AWD	雙接頭彈簧柱(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.650863	2025-11-08 23:27:54.793	\N
36	18	34	2017	2020	B58	2998	340	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.653867	2025-11-08 23:27:54.793	\N
37	19	35	2018	2023	N63	4395	530	雙渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.656888	2025-11-08 23:27:54.793	\N
38	20	36	2018	2023	B58	2998	360	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-16 01:08:47.660265	2025-11-08 23:27:54.793	\N
39	21	37	2018	2023	N63	4395	530	雙渦輪增壓	AWD	雙A臂	多連桿	汽油	\N	2025-09-16 01:08:47.664628	2025-11-08 23:27:54.793	\N
40	22	38	2021	2023	電動	\N	544	電動	AWD	雙接頭彈簧柱	多連桿	純電	\N	2025-09-16 01:08:47.667483	2025-11-08 23:27:54.793	\N
41	23	39	2022	2023	S58	2993	550	雙渦輪增壓	RWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.670464	2025-11-08 23:27:54.793	\N
42	12	27	2021	2022	S63	4395	635	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.673454	2025-11-08 23:27:54.793	\N
43	24	41	2023	2023	S68	4395	748	雙渦輪增壓+PHEV	AWD	雙A臂(主動式)	多連桿(主動式)	汽油	\N	2025-09-16 01:08:47.676813	2025-11-08 23:27:54.793	\N
44	2	42	2003	2004	S54	3246	360	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:47.680972	2025-11-08 23:27:54.793	\N
45	25	43	2004	2007	M271	1796	163	機械增壓	RWD	麥花臣	多連桿	汽油	KOMPRESSOR	2025-09-16 01:08:47.684228	2025-11-08 23:27:54.793	\N
46	25	44	2008	2014	M271	1796	204	渦輪增壓	RWD	三連桿	多連桿	汽油	BlueEFFICIENCY	2025-09-16 01:08:47.686888	2025-11-08 23:27:54.793	\N
47	25	45	2015	2021	M274	1991	184	渦輪增壓	RWD	多連桿	多連桿	汽油	ECO Start/Stop	2025-09-16 01:08:47.689635	2025-11-08 23:27:54.793	\N
48	25	46	2021	2025	M254	1499	204	渦輪增壓	RWD	多連桿	多連桿	汽油	48V EQ Boost	2025-09-16 01:08:47.692993	2025-11-08 23:27:54.793	\N
49	26	47	2004	2009	M271	1796	163	機械增壓	RWD	雙A臂	多連桿	汽油	氣壓懸吊(選配)	2025-09-16 01:08:47.697237	2025-11-08 23:27:54.793	\N
50	26	48	2009	2016	M271	1796	204	渦輪增壓	4MATIC	三連桿	多連桿	汽油	AGILITY CONTROL	2025-09-16 01:08:47.700153	2025-11-08 23:27:54.793	\N
51	26	49	2016	2023	M274	1991	184	渦輪增壓	RWD	多連桿	多連桿	汽油	氣壓懸吊(選配)	2025-09-16 01:08:47.702955	2025-11-08 23:27:54.793	\N
52	26	50	2023	2025	M254	1999	204	渦輪增壓	RWD	多連桿	多連桿	汽油	48V輕油電	2025-09-16 01:08:47.705715	2025-11-08 23:27:54.793	\N
53	27	51	2006	2013	M272	3498	272	自然進氣	RWD	雙A臂	多連桿	汽油	AIRMATIC氣壓懸吊	2025-09-16 01:08:47.710279	2025-11-08 23:27:54.793	\N
54	27	52	2014	2020	M276	2996	367	渦輪增壓	4MATIC	雙A臂	多連桿	汽油	MAGIC BODY CONTROL	2025-09-16 01:08:47.713611	2025-11-08 23:27:54.793	\N
55	27	53	2021	2025	M256	2999	435	渦輪增壓	4MATIC	雙A臂	多連桿	汽油	48V+ISG整合式啟動發電機	2025-09-16 01:08:47.716396	2025-11-08 23:27:54.793	\N
56	28	54	2015	2022	M274	1991	184	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	越野模式	2025-09-16 01:08:47.719426	2025-11-08 23:27:54.793	\N
57	28	55	2022	2025	M254	1999	313	渦輪增壓	4MATIC	多連桿	多連桿	插電混動	31.2kWh電池	2025-09-16 01:08:47.722206	2025-11-08 23:27:54.793	\N
58	29	56	2015	2019	OM642	2987	258	渦輪增壓	4MATIC	雙A臂	多連桿	柴油	ADS主動懸吊	2025-09-16 01:08:47.726305	2025-11-08 23:27:54.793	\N
59	29	57	2019	2025	M256	2999	367	渦輪增壓	4MATIC	E-ACTIVE BODY	E-ACTIVE BODY	汽油	48V主動式懸吊	2025-09-16 01:08:47.730921	2025-11-08 23:27:54.793	\N
60	30	58	2012	2018	M270	1595	122	渦輪增壓	FWD	麥花臣	扭力樑	汽油	MBUX(2018)	2025-09-16 01:08:47.733889	2025-11-08 23:27:54.793	\N
61	30	59	2018	2025	M282	1332	163	渦輪增壓	FWD	麥花臣	扭力樑	汽油	MBUX系統	2025-09-16 01:08:47.736638	2025-11-08 23:27:54.793	\N
62	31	60	2014	2020	M270	1595	156	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	越野模式	2025-09-16 01:08:47.739899	2025-11-08 23:27:54.793	\N
63	31	61	2020	2025	M260	1991	224	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	MBUX擴增實境	2025-09-16 01:08:47.7443	2025-11-08 23:27:54.793	\N
64	32	62	2019	2025	M282	1332	163	渦輪增壓	FWD	麥花臣	扭力樑	汽油	7人座配置	2025-09-16 01:08:47.747307	2025-11-08 23:27:54.793	\N
65	33	63	2004	2018	M273	5461	388	自然進氣	4MATIC	固定軸	固定軸	汽油	三差速鎖定	2025-09-16 01:08:47.75026	2025-11-08 23:27:54.793	\N
66	33	64	2018	2025	OM656	2925	330	渦輪增壓	4MATIC	雙A臂	固定軸	柴油	ECO Start/Stop	2025-09-16 01:08:47.753213	2025-11-08 23:27:54.793	\N
67	34	65	2022	2025	電動	\N	292	電動	RWD	四連桿	多連桿	純電	90.6kWh電池	2025-09-16 01:08:47.757241	2025-11-08 23:27:54.793	\N
68	35	66	2021	2025	電動	\N	333	電動	RWD	四連桿	多連桿	純電	107.8kWh電池	2025-09-16 01:08:47.761137	2025-11-08 23:27:54.793	\N
69	36	67	2015	2023	M178	3982	522	渦輪增壓	RWD	雙A臂	雙A臂	汽油	乾式油底殼	2025-09-16 01:08:47.764235	2025-11-08 23:27:54.793	\N
70	36	68	2023	2025	M177	3982	639	渦輪增壓	4MATIC+	雙A臂	雙A臂	汽油	主動式後軸轉向	2025-09-16 01:08:47.7671	2025-11-08 23:27:54.793	\N
71	37	69	2013	2019	M270	1595	156	渦輪增壓	FWD	麥花臣	多連桿	汽油	四門轎跑	2025-09-16 01:08:47.770132	2025-11-08 23:27:54.793	\N
72	37	69	2020	2025	M260	1991	306	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	AMG Performance	2025-09-16 01:08:47.774173	2025-11-08 23:27:54.793	\N
73	38	71	2012	2020	M278	4663	435	渦輪增壓	RWD	雙A臂	多連桿	汽油	主動式液壓車頂	2025-09-16 01:08:47.777805	2025-11-08 23:27:54.793	\N
74	38	72	2022	2025	M177	3982	476	渦輪增壓	4MATIC+	雙A臂	多連桿	汽油	主動式後軸轉向	2025-09-16 01:08:47.78062	2025-11-08 23:27:54.793	\N
75	39	73	2004	2008	EA113	1781	163	渦輪增壓	FWD	雙A臂	梯型多連桿	汽油	K03渦輪	2025-09-16 01:08:47.78388	2025-11-08 23:27:54.793	\N
76	39	73	2006	2008	EA113	1984	200	渦輪增壓	FWD	雙A臂	梯型多連桿	汽油	FSI直噴	2025-09-16 01:08:47.786671	2025-11-08 23:27:54.793	\N
77	39	75	2008	2015	EA888	1984	180	渦輪增壓	quattro	五連桿	梯型多連桿	汽油	AVS可變氣門	2025-09-16 01:08:47.79098	2025-11-08 23:27:54.793	\N
78	39	76	2015	2023	EA888 Gen3	1984	190	渦輪增壓	quattro	五連桿	五連桿	汽油	B循環技術	2025-09-16 01:08:47.794193	2025-11-08 23:27:54.793	\N
79	39	77	2023	2025	EA888 Evo4	1984	265	渦輪增壓	quattro	五連桿	五連桿	汽油	12V輕油電	2025-09-16 01:08:47.796995	2025-11-08 23:27:54.793	\N
80	40	78	2005	2011	BAE	2773	220	自然進氣	quattro	雙A臂	雙A臂	汽油	AVS可變氣門	2025-09-16 01:08:47.799929	2025-11-08 23:27:54.793	\N
81	40	79	2011	2018	EA288	1968	190	渦輪增壓	quattro	五連桿	梯型多連桿	柴油	雙渦輪增壓	2025-09-16 01:08:47.802713	2025-11-08 23:27:54.793	\N
82	40	80	2018	2025	EA888 Gen3	1984	245	渦輪增壓	quattro	五連桿	五連桿	汽油	12V輕油電	2025-09-16 01:08:47.806838	2025-11-08 23:27:54.793	\N
83	41	81	2010	2017	CRE	2995	290	機械增壓	quattro	雙A臂	雙A臂	汽油	全鋁合金車身	2025-09-16 01:08:47.810289	2025-11-08 23:27:54.793	\N
84	41	82	2017	2025	EA839	2995	340	渦輪增壓	quattro	雙A臂	雙A臂	汽油	48V輕油電	2025-09-16 01:08:47.813157	2025-11-08 23:27:54.793	\N
85	42	83	2006	2014	EA113	1984	200	渦輪增壓	quattro	麥花臣	四連桿	汽油	ASF鋁合金車體	2025-09-16 01:08:47.816078	2025-11-08 23:27:54.793	\N
87	43	85	2009	2017	EA888	1984	180	渦輪增壓	quattro	五連桿	梯型多連桿	汽油	quattro ultra	2025-09-16 01:08:47.823912	2025-11-08 23:27:54.793	\N
88	43	86	2017	2023	EA888 Gen3	1984	252	渦輪增壓	quattro	五連桿	五連桿	汽油	主動氣壓懸吊	2025-09-16 01:08:47.827021	2025-11-08 23:27:54.793	\N
89	43	86	2020	2025	EA888 + PHEV	1984	367	渦輪增壓	quattro	五連桿	五連桿	插電混動	17.9kWh電池	2025-09-16 01:08:47.829945	2025-11-08 23:27:54.793	\N
90	44	88	2006	2015	ASB	2967	233	渦輪增壓	quattro	雙A臂	雙A臂	柴油	可調氣壓懸吊	2025-09-16 01:08:47.832963	2025-11-08 23:27:54.793	\N
93	45	91	2019	2025	電動	\N	408	電動	quattro	雙A臂	多連桿	純電	95kWh電池	2025-09-16 01:08:47.843454	2025-11-08 23:27:54.793	\N
94	46	92	2021	2025	電動	\N	530	電動	quattro	雙A臂	多連桿	純電	800V架構	2025-09-16 01:08:47.846459	2025-11-08 23:27:54.793	\N
95	47	93	2013	2018	EA824	3993	560	雙渦輪增壓	quattro	雙A臂	雙A臂	汽油	動態駕馭控制	2025-09-16 01:08:47.849337	2025-11-08 23:27:54.793	\N
96	47	94	2019	2025	EA825	3996	600	雙渦輪增壓	quattro	雙A臂	雙A臂	汽油	48V主動防傾桿	2025-09-16 01:08:47.853462	2025-11-08 23:27:54.793	\N
97	48	95	2004	2012	EA113	1781	160	渦輪增壓	FWD	麥花臣	四連桿	汽油	橫置引擎	2025-09-16 01:08:47.856444	2025-11-08 23:27:54.793	\N
100	49	98	2011	2018	EA888	1984	170	渦輪增壓	quattro	麥花臣	四連桿	汽油	越野模式	2025-09-16 01:08:47.866465	2025-11-08 23:27:54.793	\N
101	49	99	2018	2025	EA888	1984	230	渦輪增壓	quattro	麥花臣	四連桿	汽油	虛擬座艙Plus	2025-09-16 01:08:47.869806	2025-11-08 23:27:54.793	\N
102	50	100	2007	2015	BHK	4163	420	自然進氣	quattro	雙A臂	雙A臂	汽油	ASF全鋁車身	2025-09-16 01:08:47.872704	2025-11-08 23:27:54.793	\N
103	50	101	2015	2023	EA824	5204	610	自然進氣	quattro	雙A臂	雙A臂	汽油	全碳纖維車體	2025-09-16 01:08:47.875544	2025-11-08 23:27:54.793	\N
104	51	102	2020	2025	電動	\N	435	電動	quattro	雙A臂	多連桿	純電	三馬達系統	2025-09-16 01:08:47.878881	2025-11-08 23:27:54.793	\N
105	52	103	2018	2025	EA839	2995	340	渦輪增壓	quattro	雙A臂	雙A臂	汽油	主動四輪轉向	2025-09-16 01:08:47.883314	2025-11-08 23:27:54.793	\N
106	53	104	2021	2025	電動	\N	204	電動	RWD	麥花臣	多連桿	純電	82kWh電池	2025-09-16 01:08:47.886364	2025-11-08 23:27:54.793	\N
107	54	105	2007	2016	EA888	1984	180	渦輪增壓	quattro	五連桿	梯型多連桿	汽油	無框車門	2025-09-16 01:08:47.889187	2025-11-08 23:27:54.793	\N
108	54	106	2016	2023	EA888	1984	249	渦輪增壓	quattro	五連桿	五連桿	汽油	矩陣式LED	2025-09-16 01:08:47.892166	2025-11-08 23:27:54.793	\N
109	55	107	2020	2025	EA825	3996	600	雙渦輪增壓	quattro	雙A臂	雙A臂	汽油	主動氣壓懸吊	2025-09-16 01:08:47.895365	2025-11-08 23:27:54.793	\N
110	56	108	2004	2009	EA111	1595	102	自然進氣	FWD	麥花臣	扭力樑	汽油	-	2025-09-16 01:08:47.899807	2025-11-08 23:27:54.793	\N
111	56	108	2006	2009	EA113	1984	200	渦輪增壓	FWD	麥花臣	多連桿	汽油	渦輪增壓	2025-09-16 01:08:47.902665	2025-11-08 23:27:54.793	\N
487	277	465	2018	2025	EA839	2995	340	渦輪增壓	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.111	2025-11-08 23:27:54.793	\N
112	56	110	2009	2013	EA111	1390	122	渦輪增壓	FWD	麥花臣	多連桿	汽油	機械+渦輪雙增壓	2025-09-16 01:08:47.90541	2025-11-08 23:27:54.793	\N
113	56	110	2010	2013	EA888	1984	210	渦輪增壓	FWD	麥花臣	多連桿	汽油	XDS電子差速鎖	2025-09-16 01:08:47.90866	2025-11-08 23:27:54.793	\N
114	56	112	2013	2020	EA211	1395	125	渦輪增壓	FWD	麥花臣	多連桿	汽油	ACT汽缸休止	2025-09-16 01:08:47.912855	2025-11-08 23:27:54.793	\N
115	56	112	2014	2020	EA888	1984	230	渦輪增壓	FWD	麥花臣	多連桿	汽油	VAQ電子差速器	2025-09-16 01:08:47.916067	2025-11-08 23:27:54.793	\N
116	56	114	2020	2025	EA211 EVO	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	48V輕油電	2025-09-16 01:08:47.918748	2025-11-08 23:27:54.793	\N
117	56	114	2021	2025	EA888 Evo4	1984	245	渦輪增壓	FWD	麥花臣	多連桿	汽油	VDM車輛動態管理	2025-09-16 01:08:47.921632	2025-11-08 23:27:54.793	\N
118	57	116	2005	2011	EA189	1968	140	渦輪增壓	FWD	麥花臣	多連桿	柴油	DPF柴油微粒濾清器	2025-09-16 01:08:47.924606	2025-11-08 23:27:54.793	\N
119	57	117	2011	2015	EA888	1798	160	渦輪增壓	FWD	麥花臣	多連桿	汽油	-	2025-09-16 01:08:47.930186	2025-11-08 23:27:54.793	\N
120	57	118	2015	2023	EA888	1984	190	渦輪增壓	FWD	麥花臣	多連桿	汽油	DCC主動懸吊	2025-09-16 01:08:47.934254	2025-11-08 23:27:54.793	\N
121	57	119	2023	2025	EA211 EVO2	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	插電式混合動力	2025-09-16 01:08:47.938356	2025-11-08 23:27:54.793	\N
122	58	120	2008	2016	EA888	1984	180	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	Haldex五代四驅	2025-09-16 01:08:47.941657	2025-11-08 23:27:54.793	\N
123	58	121	2016	2020	EA888	1984	180	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	4MOTION主動控制	2025-09-16 01:08:47.946058	2025-11-08 23:27:54.793	\N
124	58	122	2020	2025	EA211 EVO	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	48V輕油電	2025-09-16 01:08:47.949041	2025-11-08 23:27:54.793	\N
125	59	123	2018	2023	EA211	1395	130	渦輪增壓	FWD	麥花臣	扭力樑	汽油	-	2025-09-16 01:08:47.952111	2025-11-08 23:27:54.793	\N
126	59	123	2021	2025	EA888	1984	190	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	運動懸吊	2025-09-16 01:08:47.95493	2025-11-08 23:27:54.793	\N
127	60	125	2004	2010	EA188	1896	105	渦輪增壓	FWD	麥花臣	扭力樑	柴油	-	2025-09-16 01:08:47.957981	2025-11-08 23:27:54.793	\N
128	60	126	2010	2015	EA111	1390	140	渦輪增壓	FWD	麥花臣	扭力樑	汽油	-	2025-09-16 01:08:47.962585	2025-11-08 23:27:54.793	\N
129	60	127	2015	2025	EA211	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	ACT汽缸休止	2025-09-16 01:08:47.965417	2025-11-08 23:27:54.793	\N
130	61	128	2017	2025	EA888	1984	190	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	DCC主動懸吊	2025-09-16 01:08:47.968411	2025-11-08 23:27:54.793	\N
131	62	129	2021	2025	APP310	0	204	電動	RWD	-	-	純電	77kWh電池組	2025-09-16 01:08:47.971452	2025-11-08 23:27:54.793	\N
132	62	129	2022	2025	APP550 x2	0	299	電動	AWD	-	-	純電	雙馬達四驅	2025-09-16 01:08:47.975942	2025-11-08 23:27:54.793	\N
133	63	131	2004	2010	EA189	1598	102	渦輪增壓	FWD	麥花臣	葉片彈簧	柴油	-	2025-09-16 01:08:47.97946	2025-11-08 23:27:54.793	\N
134	63	132	2010	2020	EA211	1395	125	渦輪增壓	FWD	麥花臣	複合式懸吊	汽油	-	2025-09-16 01:08:47.982477	2025-11-08 23:27:54.793	\N
135	63	132	2020	2025	EA288 Evo	1968	122	渦輪增壓	FWD	麥花臣	複合式懸吊	柴油	AdBlue系統	2025-09-16 01:08:47.985238	2025-11-08 23:27:54.793	\N
136	64	134	2009	2017	EA111	1598	105	自然進氣	FWD	麥花臣	扭力樑	汽油	-	2025-09-16 01:08:47.988303	2025-11-08 23:27:54.793	\N
137	64	135	2018	2025	EA211	999	115	渦輪增壓	FWD	麥花臣	扭力樑	汽油	1.0三缸引擎	2025-09-16 01:08:47.992713	2025-11-08 23:27:54.793	\N
138	65	136	2022	2025	EA211	999	110	渦輪增壓	FWD	麥花臣	扭力樑	汽油	跨界跑旅設計	2025-09-16 01:08:47.996022	2025-11-08 23:27:54.793	\N
139	66	137	2023	2025	APP310	0	204	電動	RWD	-	-	純電	58kWh電池組	2025-09-16 01:08:47.999579	2025-11-08 23:27:54.793	\N
140	67	138	2019	2025	EA211	999	115	渦輪增壓	FWD	麥花臣	扭力樑	汽油	多功能座椅	2025-09-16 01:08:48.002681	2025-11-08 23:27:54.793	\N
141	68	139	2005	2007	AUA	1390	80	自然進氣	前置前驅	麥花臣	扭力樑	汽油	ESP電子穩定系統	2025-09-16 01:08:48.006815	2025-11-08 23:27:54.793	\N
142	68	140	2007	2014	BZG	1390	75	自然進氣	前置前驅	麥花臣	扭力樑	汽油	電子穩定系統(ESC)	2025-09-16 01:08:48.010459	2025-11-08 23:27:54.793	\N
143	68	140	2011	2015	CBZB	1197	105	渦輪增壓	前置前驅	麥花臣	扭力樑	汽油	Start-Stop引擎啟停	2025-09-16 01:08:48.013293	2025-11-08 23:27:54.793	\N
144	68	142	2022	2025	CHPA	999	110	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	Matrix LED頭燈	2025-09-16 01:08:48.01617	2025-11-08 23:27:54.793	\N
145	69	143	2005	2008	AWL	1598	102	自然進氣	前置前驅	麥花臣	多連桿	汽油	基本安全套件	2025-09-16 01:08:48.019359	2025-11-08 23:27:54.793	\N
146	69	144	2008	2013	CZCA	1798	160	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	渦輪增壓直噴引擎，DSG雙離合器	2025-09-16 01:08:48.023598	2025-11-08 23:27:54.793	\N
147	69	145	2013	2020	CZEA	1395	150	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	ACT可變氣缸技術，DSG變速箱	2025-09-16 01:08:48.027388	2025-11-08 23:27:54.793	\N
148	69	146	2019	2024	DJYA	1498	150	渦輪增壓+輕油電	前置前驅	麥花臣	多連桿	汽油+輕油電	Mild Hybrid 48V系統	2025-09-16 01:08:48.030227	2025-11-08 23:27:54.793	\N
149	69	147	2024	2025	DPCA	1498	150	渦輪增壓+輕油電	前置前驅	麥花臣	多連桿	汽油+輕油電	Superb級內裝升級	2025-09-16 01:08:48.033027	2025-11-08 23:27:54.793	\N
150	69	147	2024	2025	DTU	1984	245	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	性能RS套件，DCC動態底盤控制	2025-09-16 01:08:48.035497	2025-11-08 23:27:54.793	\N
151	70	148	2006	2010	BBZ	1390	80	自然進氣	前置前驅	麥花臣	扭力樑	汽油	MPV多功能空間設計	2025-09-16 01:08:48.040264	2025-11-08 23:27:54.793	\N
152	71	149	2005	2008	BLR	1984	150	自然進氣	前置前驅	麥花臣	多連桿	汽油	旗艦級舒適座椅	2025-09-16 01:08:48.043945	2025-11-08 23:27:54.793	\N
153	71	150	2008	2015	CFGB	1968	170	渦輪增壓柴油	前置前驅	麥花臣	多連桿	柴油	渦輪增壓柴油引擎，DSG雙離合器	2025-09-16 01:08:48.046719	2025-11-08 23:27:54.793	\N
154	71	151	2015	2023	CJZA	1984	280	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	渦輪增壓直噴引擎，DSG雙離合器，四輪轉向系統	2025-09-16 01:08:48.049571	2025-11-08 23:27:54.793	\N
155	71	152	2023	2025	DTF	1984	280	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	豪華L&K版，Matrix LED	2025-09-16 01:08:48.053788	2025-11-08 23:27:54.793	\N
156	72	153	2010	2015	CBZB	1197	105	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	跨界SUV設計，VarioRail行李架	2025-09-16 01:08:48.05738	2025-11-08 23:27:54.793	\N
157	73	154	2012	2019	CWVA	1598	110	自然進氣	前置前驅	麥花臣	扭力樑	汽油	ESP電子穩定系統	2025-09-16 01:08:48.06088	2025-11-08 23:27:54.793	\N
158	74	155	2017	2022	CHHB	1984	180	渦輪增壓	前置四驅	麥花臣	多連桿	汽油	四輪驅動，電子懸吊管理	2025-09-16 01:08:48.064017	2025-11-08 23:27:54.793	\N
159	74	156	2023	2025	DTF	1984	265	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	RS性能版，DCC自適應懸吊	2025-09-16 01:08:48.066773	2025-11-08 23:27:54.793	\N
160	75	157	2018	2022	CZEA	1498	150	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	渦輪增壓引擎，DSG雙離合器	2025-09-16 01:08:48.071512	2025-11-08 23:27:54.793	\N
161	75	158	2022	2025	DPCA	1498	150	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	Simply Clever實用設計	2025-09-16 01:08:48.074207	2025-11-08 23:27:54.793	\N
162	76	159	2019	2025	DKRF	999	115	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	城市小型SUV，IQ.DRIVE輔助	2025-09-16 01:08:48.077685	2025-11-08 23:27:54.793	\N
163	77	160	2019	2022	CZEA	999	115	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	渦輪增壓，DSG雙離合器	2025-09-16 01:08:48.08066	2025-11-08 23:27:54.793	\N
164	77	161	2023	2025	DJYA	1498	150	渦輪增壓+輕油電	前置前驅	麥花臣	多連桿	汽油+輕油電	Mild Hybrid	2025-09-16 01:08:48.08446	2025-11-08 23:27:54.793	\N
165	78	162	2021	2025	電動	0	204	電動	前置前驅	麥花臣	多連桿	純電	77kWh電池，V2L外放電	2025-09-16 01:08:48.087956	2025-11-08 23:27:54.793	\N
166	78	162	2023	2025	電動	0	299	電動	四輪驅動	麥花臣	多連桿	純電	雙馬達RS版，CCS快充	2025-09-16 01:08:48.090899	2025-11-08 23:27:54.793	\N
167	79	164	2005	2006	W11B16A	1598	115	自然吸氣	前輪驅動	麥花臣式	多連桿	汽油	Turbo (S型為渦輪)	2025-09-16 01:08:48.094535	2025-11-08 23:27:54.793	\N
169	79	165	2007	2013	N12B16A	1598	120	自然吸氣	前輪驅動	麥花臣式	多連桿	汽油	TwinPower Turbo (部分年份)	2025-09-16 01:08:48.101137	2025-11-08 23:27:54.793	\N
170	79	165	2007	2013	N14B16A	1598	175	渦輪增壓	前輪驅動	麥花臣式	多連桿	汽油	雙渦輪增壓技術	2025-09-16 01:08:48.10411	2025-11-08 23:27:54.793	\N
171	80	166	2011	2017	N18B16A	1598	240	\N	四輪驅動	多連桿	\N	汽油	\N	2025-09-16 01:08:48.107223	2025-11-08 23:27:54.793	\N
172	79	167	2014	2023	B38B15A	1499	136	渦輪增壓	前輪驅動	麥花臣式	多連桿	汽油	TwinPower Turbo	2025-09-16 01:08:48.110394	2025-11-08 23:27:54.793	\N
173	79	167	2014	2023	B48B20A	1998	192	渦輪增壓	前輪驅動	麥花臣式	多連桿	汽油	動態穩定控制系統	2025-09-16 01:08:48.112964	2025-11-08 23:27:54.793	\N
174	81	168	2015	2023	B48B20A	1998	280	\N	前輪/四輪驅動	多連桿	\N	汽油	分離式尾門設計	2025-09-16 01:08:48.117392	2025-11-08 23:27:54.793	\N
175	82	169	2016	2023	B48B20A	1998	280	\N	前輪驅動	多連桿	\N	汽油	電動軟頂	2025-09-16 01:08:48.120672	2025-11-08 23:27:54.793	\N
176	83	170	2020	2023	電動	\N	184	純電動	前輪驅動	麥花臣式	多連桿	電動	純電車款	2025-09-16 01:08:48.12364	2025-11-08 23:27:54.793	\N
177	84	171	2005	2012	M97.01	3600	345	自然進氣	後置後驅	麥花臣	多連桿	汽油	PASM，PDK雙離合器	2025-09-16 01:08:48.127258	2025-11-08 23:27:54.793	\N
179	84	171	2006	2012	M97.70	3600	480	渦輪增壓	後置四驅	麥花臣	多連桿	汽油	雙渦輪增壓，PASM，PDK	2025-09-16 01:08:48.133704	2025-11-08 23:27:54.793	\N
180	84	173	2012	2019	MA1.02	3700	370	自然進氣	後置後驅	麥花臣	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.13648	2025-11-08 23:27:54.793	\N
182	84	173	2013	2019	MA1.20	3800	475	自然進氣	後置後驅	麥花臣	多連桿	汽油	賽車化懸吊，輕量化設計	2025-09-16 01:08:48.142065	2025-11-08 23:27:54.793	\N
183	84	175	2019	2025	MA2.20	2981	385	雙渦輪增壓	後置後驅	麥花臣	多連桿	汽油	最新PASM，PDK雙離合器	2025-09-16 01:08:48.145256	2025-11-08 23:27:54.793	\N
184	84	175	2020	2025	MA2.20	2981	650	雙渦輪增壓	後置四驅	麥花臣	多連桿	汽油	PDK，PASM，陶瓷碳纖維煞車系統	2025-09-16 01:08:48.149824	2025-11-08 23:27:54.793	\N
185	85	177	2005	2012	M97.02	2687	245	自然進氣	中置後驅	雙叉臂	多連桿	汽油	中置引擎，PASM懸吊	2025-09-16 01:08:48.152967	2025-11-08 23:27:54.793	\N
186	85	178	2012	2016	MA1.10	2981	265	自然進氣	中置後驅	雙叉臂	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.155647	2025-11-08 23:27:54.793	\N
187	86	179	2005	2012	M97.02	2687	245	自然進氣	中置後驅	雙叉臂	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.158925	2025-11-08 23:27:54.793	\N
188	86	180	2012	2016	MA1.10	2981	265	自然進氣	中置後驅	雙叉臂	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.162008	2025-11-08 23:27:54.793	\N
189	87	181	2003	2010	MZ1	3198	250	自然進氣	前置四驅	雙叉臂	多連桿	汽油	PTM四輪驅動系統	2025-09-16 01:08:48.166287	2025-11-08 23:27:54.793	\N
190	87	182	2010	2017	MA1	3596	300	自然進氣	前置四驅	雙叉臂	多連桿	汽油	PASM，PTM	2025-09-16 01:08:48.169168	2025-11-08 23:27:54.793	\N
191	87	183	2017	2025	MA2	2995	340	渦輪增壓	前置四驅	雙叉臂	多連桿	汽油	PASM，PTM，PDK	2025-09-16 01:08:48.172013	2025-11-08 23:27:54.793	\N
192	88	184	2019	2025	MA2	2995	340	渦輪增壓	前置四驅	雙叉臂	多連桿	汽油	PASM，PTM	2025-09-16 01:08:48.17518	2025-11-08 23:27:54.793	\N
193	89	185	2014	2021	EA888	1984	252	渦輪增壓	前置四驅	麥花臣	多連桿	汽油	PASM，PTM	2025-09-16 01:08:48.180095	2025-11-08 23:27:54.793	\N
194	90	186	2009	2016	M48.00	4800	400	自然進氣	前置後驅/四驅	雙叉臂	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.183436	2025-11-08 23:27:54.793	\N
195	90	187	2017	2021	MA2	2894	330	雙渦輪增壓	前置四驅	雙叉臂	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.186242	2025-11-08 23:27:54.793	\N
196	91	188	2016	2020	MA2.20	2981	350	渦輪增壓	中置後驅	雙叉臂	多連桿	汽油	PASM，PDK	2025-09-16 01:08:48.189169	2025-11-08 23:27:54.793	\N
198	92	189	2019	2025	電動馬達	\N	420	電動	四輪驅動	雙叉臂	多連桿	純電	800V電池，PTM，電子懸吊系統	2025-09-16 01:08:48.196759	2025-11-08 23:27:54.793	\N
199	93	190	2004	2008	Duratec-HE	1999	145	自然進氣	FWD	麥花臣	多連桿	汽油	反置式引擎	2025-09-16 01:08:48.200677	2025-11-08 23:27:54.793	\N
200	93	191	2011	2015	Duratorq TDCi	1560	115	渦輪增壓	FWD	麥花臣	多連桿	柴油	DPF系統	2025-09-16 01:08:48.203535	2025-11-08 23:27:54.793	\N
201	93	192	2015	2018	EcoBoost	1499	180	渦輪增壓	FWD	麥花臣	扭力樑	汽油	缸內直噴	2025-09-16 01:08:48.20627	2025-11-08 23:27:54.793	\N
202	93	193	2018	2022	EcoBoost	1499	182	渦輪增壓	FWD	麥花臣	多連桿	汽油	Co-Pilot360	2025-09-16 01:08:48.210662	2025-11-08 23:27:54.793	\N
203	93	194	2022	2025	EcoBoost	1999	280	渦輪增壓	FWD	麥花臣	多連桿	汽油	電子限滑差速器	2025-09-16 01:08:48.214042	2025-11-08 23:27:54.793	\N
204	94	195	2013	2016	EcoBoost	1999	242	渦輪增壓	AWD	麥花臣	多連桿	汽油	智慧型四驅	2025-09-16 01:08:48.217017	2025-11-08 23:27:54.793	\N
205	94	196	2020	2025	EcoBoost	1499	180	渦輪增壓	FWD	麥花臣	多連桿	汽油	輕量化車體	2025-09-16 01:08:48.219798	2025-11-08 23:27:54.793	\N
207	95	197	2007	2014	Duratec-HE	1999	203	渦輪增壓	FWD	麥花臣	多連桿	汽油	歐規底盤	2025-09-16 01:08:48.226931	2025-11-08 23:27:54.793	\N
208	95	198	2015	2022	Atkinson	1999	187	阿特金森循環	FWD	麥花臣	多連桿	油電混合	鋰電池組	2025-09-16 01:08:48.230218	2025-11-08 23:27:54.793	\N
209	95	199	2023	2025	EcoBoost	1999	253	渦輪增壓	FWD	麥花臣	多連桿	汽油	歐洲進口	2025-09-16 01:08:48.233005	2025-11-08 23:27:54.793	\N
210	96	200	2008	2013	Duratec	1596	120	自然進氣	FWD	麥花臣	扭力樑	汽油	歐洲設計	2025-09-16 01:08:48.236061	2025-11-08 23:27:54.793	\N
211	96	201	2014	2022	EcoBoost	999	125	渦輪增壓	FWD	麥花臣	扭力樑	汽油	三缸引擎	2025-09-16 01:08:48.23907	2025-11-08 23:27:54.793	\N
212	97	202	2012	2019	Duratorq	3198	200	渦輪增壓	4WD	雙A臂	葉片彈簧	柴油	電子加力箱	2025-09-16 01:08:48.24382	2025-11-08 23:27:54.793	\N
213	97	203	2019	2025	EcoBlue	1997	213	渦輪增壓	4WD	雙A臂	葉片彈簧	柴油	地形管理系統	2025-09-16 01:08:48.246747	2025-11-08 23:27:54.793	\N
214	98	204	2014	2023	Duratorq	2198	130	渦輪增壓	FWD	麥花臣	葉片彈簧	柴油	商旅設定	2025-09-16 01:08:48.249785	2025-11-08 23:27:54.793	\N
215	99	205	2022	2025	EcoBoost	1499	125	渦輪增壓	FWD	麥花臣	扭力樑	汽油	5+2人座	2025-09-16 01:08:48.252782	2025-11-08 23:27:54.793	\N
216	100	206	2015	2023	EcoBoost	2261	290	渦輪增壓	RWD	麥花臣	多連桿	汽油	運動化懸吊	2025-09-16 01:08:48.255729	2025-11-08 23:27:54.793	\N
217	100	207	2024	2025	Coyote	5038	500	自然進氣	RWD	麥花臣	多連桿	汽油	賽道調校	2025-09-16 01:08:48.261331	2025-11-08 23:27:54.793	\N
218	101	208	2004	2008	Duratec	2261	153	自然進氣	4WD	麥花臣	雙連桿	汽油	適時四驅	2025-09-16 01:08:48.264602	2025-11-08 23:27:54.793	\N
219	102	209	2014	2022	Dragon	1498	112	自然進氣	FWD	麥花臣	扭力樑	汽油	都會SUV	2025-09-16 01:08:48.267654	2025-11-08 23:27:54.793	\N
220	103	210	2022	2025	EcoBoost PHEV	1499	225	渦輪增壓	FWD	麥花臣	多連桿	插電混動	14.4kWh電池	2025-09-16 01:08:48.270664	2025-11-08 23:27:54.793	\N
221	104	211	2022	2025	EcoBoost	1499	182	渦輪增壓	FWD	麥花臣	多連桿	汽油	跨界加高	2025-09-16 01:08:48.275012	2025-11-08 23:27:54.793	\N
222	105	212	2023	2025	EcoBoost	2997	365	渦輪增壓	4WD	雙A臂	多連桿	汽油	後驅平台	2025-09-16 01:08:48.278743	2025-11-08 23:27:54.793	\N
223	106	213	2004	2012	B4204T11	1984	145	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	Drive-E引擎，ESC	2025-09-16 01:08:48.282002	2025-11-08 23:27:54.793	\N
224	106	213	2004	2012	B5254T7	2521	230	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	Turbo高性能版	2025-09-16 01:08:48.284538	2025-11-08 23:27:54.793	\N
225	107	214	2000	2009	B5244S	2435	140	自然進氣	前置前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:48.2879	2025-11-08 23:27:54.793	\N
226	107	215	2010	2018	B4204T27	1969	245	渦輪增壓	前置前驅/四驅	雙叉臂	多連桿	汽油	Drive-E	2025-09-16 01:08:48.291875	2025-11-08 23:27:54.793	\N
227	107	215	2010	2018	B6304T37	2953	304	渦輪增壓	前置四驅	雙叉臂	多連桿	汽油	Polestar	2025-09-16 01:08:48.2947	2025-11-08 23:27:54.793	\N
228	107	216	2019	2025	B4204T43	1969	415	渦輪增壓+機械增壓+電動	四輪驅動	雙叉臂	多連桿	油電混合	Polestar Engineered	2025-09-16 01:08:48.297659	2025-11-08 23:27:54.793	\N
229	107	216	2019	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	前輪驅動/四輪驅動	雙叉臂	多連桿	汽油	48V輕油電系統，Pilot Assist	2025-09-16 01:08:48.300266	2025-11-08 23:27:54.793	\N
230	108	217	2006	2016	B6324S	3192	238	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:48.304772	2025-11-08 23:27:54.793	\N
231	108	217	2006	2016	B6304T	2953	285	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	AWD系統	2025-09-16 01:08:48.30765	2025-11-08 23:27:54.793	\N
232	109	218	2016	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	四輪驅動	雙叉臂	多連桿	汽油	48V輕油電系統，Pilot Assist	2025-09-16 01:08:48.311262	2025-11-08 23:27:54.793	\N
233	110	219	2004	2012	B5244S5	2435	170	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:48.314212	2025-11-08 23:27:54.793	\N
234	111	220	2010	2018	B4204T7	1999	240	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	Drive-E	2025-09-16 01:08:48.317069	2025-11-08 23:27:54.793	\N
235	111	221	2019	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	前輪驅動/四輪驅動	雙叉臂	多連桿	汽油	48V輕油電系統，Pilot Assist	2025-09-16 01:08:48.321259	2025-11-08 23:27:54.793	\N
236	112	222	2000	2007	B5254T2	2521	210	渦輪增壓	前置前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:48.324621	2025-11-08 23:27:54.793	\N
237	113	223	2008	2017	B6304T43	2953	304	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	AWD系統	2025-09-16 01:08:48.328069	2025-11-08 23:27:54.793	\N
238	113	224	2019	2025	B4204T5	1969	197	渦輪增壓+48V輕油電	前輪驅動	雙A臂	多連桿	汽油	48V輕油電系統，Pilot Assist	2025-09-16 01:08:48.330891	2025-11-08 23:27:54.793	\N
239	113	224	2019	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	四輪驅動	雙A臂	多連桿	汽油	48V輕油電系統，Pilot Assist	2025-09-16 01:08:48.333424	2025-11-08 23:27:54.793	\N
240	113	224	2017	2025	B4204T48	1969	400	渦輪增壓+電動	四輪驅動	雙A臂	多連桿	油電混合	插電混合動力，Pilot Assist	2025-09-16 01:08:48.337702	2025-11-08 23:27:54.793	\N
241	114	226	2007	2016	B6324S	3192	238	自然進氣	四輪驅動	麥花臣	多連桿	汽油	AWD系統	2025-09-16 01:08:48.340771	2025-11-08 23:27:54.793	\N
242	115	227	2002	2014	B5254T2	2521	210	渦輪增壓	前置前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:48.344222	2025-11-08 23:27:54.793	\N
243	115	228	2015	2025	B4204T48	1969	400	渦輪增壓+電動	四輪驅動	雙A臂	多連桿	油電混合	插電混合動力，Pilot Assist	2025-09-16 01:08:48.346919	2025-11-08 23:27:54.793	\N
244	116	229	2018	2025	B420T5	1969	197	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	Mild Hybrid	2025-09-16 01:08:48.350991	2025-11-08 23:27:54.793	\N
245	116	229	2021	2025	電動	\N	408	電動	四輪驅動	麥花臣	多連桿	純電	雙電動馬達，78kWh電池	2025-09-16 01:08:48.354238	2025-11-08 23:27:54.793	\N
246	117	231	2006	2013	B5244S4	2435	170	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-16 01:08:48.357323	2025-11-08 23:27:54.793	\N
247	118	232	2006	2013	B5244T7	2521	230	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	硬頂敞篷	2025-09-16 01:08:48.360834	2025-11-08 23:27:54.793	\N
248	119	233	2012	2020	FA20	1998	200	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	水平對臥引擎，輕量化車身，運動化懸吊，TRD套件（部分車型）	2025-09-16 01:08:48.364063	2025-11-08 23:27:54.793	\N
250	119	234	2020	2025	FA24	2362	235	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	改良FA24引擎，增強懸吊系統，安全輔助系統	2025-09-16 01:08:48.371207	2025-11-08 23:27:54.793	\N
251	120	235	2004	2007	1ZZ-FE	1794	132	自然進氣	FWD	麥花臣	扭力桿	汽油	VVT-i	2025-09-16 01:08:48.374128	2025-11-08 23:27:54.793	\N
252	120	236	2008	2013	2ZR-FE	1798	140	自然進氣	FWD	麥花臣	扭力桿	汽油	Dual VVT-i	2025-09-16 01:08:48.377302	2025-11-08 23:27:54.793	\N
253	120	237	2014	2019	2ZR-FE	1798	140	自然進氣	FWD	麥花臣	扭力桿	汽油	Super CVT-i	2025-09-16 01:08:48.380244	2025-11-08 23:27:54.793	\N
254	120	238	2019	2023	2ZR-FXE	1798	122	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	THS II	2025-09-16 01:08:48.384424	2025-11-08 23:27:54.793	\N
255	120	238	2021	2025	M15A-FKS	1490	140	渦輪增壓	FWD	麥花臣	雙A臂	汽油	1.5三缸	2025-09-16 01:08:48.387247	2025-11-08 23:27:54.793	\N
256	121	240	2006	2011	1AZ-FE	1998	147	自然進氣	FWD	麥花臣	雙連桿	汽油	VVT-i	2025-09-16 01:08:48.390346	2025-11-08 23:27:54.793	\N
257	121	241	2012	2017	2AR-FE	2494	181	自然進氣	FWD	麥花臣	雙連桿	汽油	Dual VVT-i	2025-09-16 01:08:48.393575	2025-11-08 23:27:54.793	\N
258	121	242	2018	2023	A25A-FXS	2487	178	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	THS II	2025-09-16 01:08:48.39888	2025-11-08 23:27:54.793	\N
259	121	243	2023	2025	A25A-FXS	2487	222	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	新THS	2025-09-16 01:08:48.402573	2025-11-08 23:27:54.793	\N
260	122	244	2006	2012	2AZ-FE	2362	170	自然進氣	4WD	麥花臣	雙連桿	汽油	VVT-i	2025-09-16 01:08:48.405813	2025-11-08 23:27:54.793	\N
261	122	245	2013	2018	2AR-FE	2494	180	自然進氣	4WD	麥花臣	雙連桿	汽油	Valvematic	2025-09-16 01:08:48.409174	2025-11-08 23:27:54.793	\N
262	122	246	2019	2025	A25A-FKS	2487	207	自然進氣	4WD	麥花臣	雙A臂	汽油	Dynamic Force	2025-09-16 01:08:48.413363	2025-11-08 23:27:54.793	\N
263	122	246	2019	2025	A25A-FXS	2487	222	阿特金森循環	E-Four	麥花臣	雙A臂	油電混合	E-Four四驅	2025-09-16 01:08:48.417162	2025-11-08 23:27:54.793	\N
264	123	247	2006	2014	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	VVT-i	2025-09-16 01:08:48.42098	2025-11-08 23:27:54.793	\N
265	123	248	2014	2020	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	Super CVT-i	2025-09-16 01:08:48.424033	2025-11-08 23:27:54.793	\N
266	123	249	2020	2025	M15A-FKS	1490	107	渦輪增壓	FWD	麥花臣	扭力桿	汽油	1.5三缸	2025-09-16 01:08:48.428035	2025-11-08 23:27:54.793	\N
267	124	250	2003	2007	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	VVT-i	2025-09-16 01:08:48.431546	2025-11-08 23:27:54.793	\N
268	124	251	2008	2013	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	Dual VVT-i	2025-09-16 01:08:48.43442	2025-11-08 23:27:54.793	\N
269	124	252	2014	2023	2NR-FE	1496	107	自然進氣	FWD	麥花臣	扭力桿	汽油	Super CVT-i	2025-09-16 01:08:48.437264	2025-11-08 23:27:54.793	\N
270	124	253	2023	2025	M15A-FXE	1490	116	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	新THS	2025-09-16 01:08:48.440278	2025-11-08 23:27:54.793	\N
271	125	254	2009	2015	2ZR-FXE	1798	136	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	THS II	2025-09-16 01:08:48.445407	2025-11-08 23:27:54.793	\N
272	125	255	2016	2022	2ZR-FXE	1798	122	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	THS III	2025-09-16 01:08:48.448253	2025-11-08 23:27:54.793	\N
273	125	256	2023	2025	A25A-FXS	2487	223	阿特金森循環	FWD	麥花臣	雙A臂	插電混動	13.6kWh電池	2025-09-16 01:08:48.451141	2025-11-08 23:27:54.793	\N
274	126	257	2009	2015	2GR-FE	3456	275	自然進氣	FWD	麥花臣	雙連桿	汽油	Dual VVT-i	2025-09-16 01:08:48.454347	2025-11-08 23:27:54.793	\N
275	126	258	2015	2023	2AR-FXE	2494	152	阿特金森循環	4WD	麥花臣	雙連桿	油電混合	E-Four	2025-09-16 01:08:48.457154	2025-11-08 23:27:54.793	\N
276	126	259	2023	2025	A25A-FXS	2487	190	阿特金森循環	4WD	麥花臣	雙連桿	油電混合	新THS	2025-09-16 01:08:48.462417	2025-11-08 23:27:54.793	\N
277	127	260	2016	2022	2ZR-FE	1798	140	自然進氣	FWD	麥花臣	扭力桿	汽油	Super CVT-i	2025-09-16 01:08:48.465562	2025-11-08 23:27:54.793	\N
278	127	261	2022	2025	M18A-FXE	1798	140	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	新THS	2025-09-16 01:08:48.468393	2025-11-08 23:27:54.793	\N
279	128	262	2020	2025	M20A-FXS	1987	145	阿特金森循環	E-Four	麥花臣	扭力桿	油電混合	E-Four	2025-09-16 01:08:48.471569	2025-11-08 23:27:54.793	\N
280	128	262	2023	2025	M20A-FKS	1987	170	自然進氣	FWD	麥花臣	扭力桿	汽油	2.0 Dynamic Force	2025-09-16 01:08:48.476037	2025-11-08 23:27:54.793	\N
281	129	264	2023	2025	A25A-FXS	2487	234	阿特金森循環	E-Four	麥花臣	多連桿	油電混合	Direct4四驅	2025-09-16 01:08:48.479094	2025-11-08 23:27:54.793	\N
282	130	265	2019	2025	1GD-FTV	2755	204	渦輪增壓	4WD	雙A臂	葉片彈簧	柴油	DPF+SCR	2025-09-16 01:08:48.482061	2025-11-08 23:27:54.793	\N
283	131	266	2019	2025	1GD-FTV	2755	176	渦輪增壓	RWD	麥花臣	葉片彈簧	柴油	9人座設定	2025-09-16 01:08:48.485053	2025-11-08 23:27:54.793	\N
284	132	267	2022	2025	電動	\N	218	電動	AWD	麥花臣	雙A臂	純電	71.4kWh電池	2025-09-16 01:08:48.488182	2025-11-08 23:27:54.793	\N
285	133	268	2017	2023	2ZR-FXE	1798	122	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	THS II	2025-09-16 01:08:48.493108	2025-11-08 23:27:54.793	\N
286	134	269	2023	2025	M15A-FXE	1490	116	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	新THS	2025-09-16 01:08:48.496092	2025-11-08 23:27:54.793	\N
287	135	270	2006	2011	R18A1	1799	140	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	SOHC i-VTEC	2025-09-16 01:08:48.499281	2025-11-08 23:27:54.793	\N
288	135	271	2006	2011	K20Z3	1998	200	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.502146	2025-11-08 23:27:54.793	\N
289	135	272	2012	2016	R18Z1	1798	141	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	SOHC i-VTEC	2025-09-16 01:08:48.507928	2025-11-08 23:27:54.793	\N
290	135	273	2012	2016	K20Z3	1998	155	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.511595	2025-11-08 23:27:54.793	\N
291	135	274	2016	2021	L15B7	1498	174	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	DOHC VTEC Turbo	2025-09-16 01:08:48.514475	2025-11-08 23:27:54.793	\N
292	135	274	2017	2021	K20C1	1996	306	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	DOHC VTEC Turbo	2025-09-16 01:08:48.517302	2025-11-08 23:27:54.793	\N
293	135	276	2022	2025	LFA1	1993	184	阿特金森循環+電動	前置前驅	麥弗遜	多連桿	油電混合	e:HEV油電系統	2025-09-16 01:08:48.521426	2025-11-08 23:27:54.793	\N
294	135	276	2023	2025	K20C1	1996	315	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	DOHC VTEC Turbo	2025-09-16 01:08:48.524869	2025-11-08 23:27:54.793	\N
295	136	278	2003	2008	K24A4	2354	190	自然進氣	前置前驅	雙A臂	多連桿	汽油	DOHC i-VTEC	2025-09-16 01:08:48.528112	2025-11-08 23:27:54.793	\N
296	136	279	2008	2013	K24Z2	2354	180	自然進氣	前置前驅	雙A臂	多連桿	汽油	DOHC i-VTEC	2025-09-16 01:08:48.530762	2025-11-08 23:27:54.793	\N
297	136	280	2008	2013	J35Z2	3471	271	自然進氣	前置前驅	雙A臂	多連桿	汽油	DOHC VTEC V6	2025-09-16 01:08:48.533469	2025-11-08 23:27:54.793	\N
298	136	281	2013	2019	K24W1	2356	188	自然進氣	前置前驅	麥弗遜	多連桿	汽油	DOHC i-VTEC	2025-09-16 01:08:48.537328	2025-11-08 23:27:54.793	\N
299	136	281	2013	2019	J35Y1	3471	276	自然進氣	前置前驅	麥弗遜	多連桿	汽油	DOHC VTEC V6	2025-09-16 01:08:48.540322	2025-11-08 23:27:54.793	\N
300	136	282	2018	2025	L15BE	1498	192	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	DOHC VTEC Turbo	2025-09-16 01:08:48.543646	2025-11-08 23:27:54.793	\N
301	136	282	2018	2025	LFA1	1993	212	阿特金森循環+電動	前置前驅	麥弗遜	多連桿	油電混合	e:HEV油電系統	2025-09-16 01:08:48.546219	2025-11-08 23:27:54.793	\N
302	137	283	2007	2011	K24Z1	2354	170	自然進氣	前置四驅	麥弗遜	多連桿	汽油	Real Time 4WD	2025-09-16 01:08:48.549298	2025-11-08 23:27:54.793	\N
303	137	284	2012	2016	R24A1	2354	190	自然進氣	前置四驅	麥弗遜	多連桿	汽油	Real Time AWD	2025-09-16 01:08:48.553569	2025-11-08 23:27:54.793	\N
304	137	285	2017	2022	L15BE	1498	193	渦輪增壓	前置四驅	麥弗遜	多連桿	汽油	Real Time AWD	2025-09-16 01:08:48.556552	2025-11-08 23:27:54.793	\N
305	137	286	2023	2025	LFA1	1993	204	阿特金森循環+電動	前置四驅	麥弗遜	多連桿	油電混合	e:HEV油電系統	2025-09-16 01:08:48.559631	2025-11-08 23:27:54.793	\N
306	138	287	2008	2014	L15A7	1497	120	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	SOHC i-VTEC	2025-09-16 01:08:48.562862	2025-11-08 23:27:54.793	\N
307	138	288	2014	2020	L15B1	1497	130	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.565644	2025-11-08 23:27:54.793	\N
308	138	289	2020	2025	LFA1	1498	123	阿特金森循環+電動	前置前驅	麥弗遜	扭力梁	油電混合	e:HEV油電系統	2025-09-16 01:08:48.569868	2025-11-08 23:27:54.793	\N
309	139	290	2015	2021	L18A	1799	143	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	SOHC i-VTEC	2025-09-16 01:08:48.572901	2025-11-08 23:27:54.793	\N
310	139	291	2022	2025	L15ZF	1498	131	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.576014	2025-11-08 23:27:54.793	\N
311	139	291	2022	2025	L15C	1498	177	渦輪增壓	前置前驅	麥弗遜	扭力梁	汽油	VTEC Turbo	2025-09-16 01:08:48.578634	2025-11-08 23:27:54.793	\N
312	140	292	2004	2013	K24A	2354	160	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.581856	2025-11-08 23:27:54.793	\N
313	140	293	2014	2020	K24W	2354	175	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.58674	2025-11-08 23:27:54.793	\N
314	140	294	2021	2025	LFA1	1993	215	阿特金森循環+電動	前置前驅	麥弗遜	扭力梁	油電混合	e:HEV油電系統	2025-09-16 01:08:48.589664	2025-11-08 23:27:54.793	\N
315	141	295	2008	2014	L15A7	1497	120	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	SOHC i-VTEC	2025-09-16 01:08:48.593088	2025-11-08 23:27:54.793	\N
316	141	296	2014	2020	L15B	1497	121	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	DOHC i-VTEC	2025-09-16 01:08:48.595929	2025-11-08 23:27:54.793	\N
317	141	297	2020	2025	LFA1	1498	126	阿特金森循環+電動	前置前驅	麥弗遜	扭力梁	油電混合	e:HEV油電系統	2025-09-16 01:08:48.599595	2025-11-08 23:27:54.793	\N
318	142	298	2005	2009	F22C	2157	237	自然進氣	後置後驅	雙A臂	雙A臂	汽油	DOHC VTEC	2025-09-16 01:08:48.602867	2025-11-08 23:27:54.793	\N
319	143	299	2005	2012	J35A	3471	295	自然進氣	前置四驅	雙A臂	多連桿	汽油	SH-AWD	2025-09-16 01:08:48.605752	2025-11-08 23:27:54.793	\N
320	144	300	2005	2008	J35A9	3471	244	自然進氣	前置四驅	麥弗遜	多連桿	汽油	VTM-4 AWD	2025-09-16 01:08:48.60889	2025-11-08 23:27:54.793	\N
321	144	301	2009	2015	J35Z4	3471	250	自然進氣	前置四驅	麥弗遜	多連桿	汽油	VTM-4 AWD	2025-09-16 01:08:48.612051	2025-11-08 23:27:54.793	\N
322	144	302	2016	2022	J35Y6	3471	280	自然進氣	前置四驅	麥弗遜	多連桿	汽油	i-VTM4 AWD	2025-09-16 01:08:48.616132	2025-11-08 23:27:54.793	\N
323	144	303	2023	2025	J35Y7	3471	285	自然進氣	前置四驅	麥弗遜	多連桿	汽油	i-VTM4 AWD	2025-09-16 01:08:48.619176	2025-11-08 23:27:54.793	\N
324	145	304	2005	2011	K24A4	2354	156	自然進氣	前置四驅	麥弗遜	多連桿	汽油	Real Time 4WD	2025-09-16 01:08:48.622187	2025-11-08 23:27:54.793	\N
325	146	305	2003	2006	VQ35DE	3498	280	自然進氣	RWD/4WD	雙A臂	多連桿	汽油	VVEL、主動式轉向系統	2025-09-16 01:08:48.625321	2025-11-08 23:27:54.793	\N
326	147	306	2007	2013	VQ37VHR	3696	330	自然進氣	RWD/4WD	雙A臂	多連桿	汽油	VVEL、主動式轉向系統	2025-09-16 01:08:48.628389	2025-11-08 23:27:54.793	\N
327	148	307	2013	2018	2.0T/3.5L VQ35HR/VQ37VHR	\N	\N	渦輪增壓/自然進氣	RWD/AWD	雙A臂	多連桿	汽油	Direct Adaptive Steering	2025-09-16 01:08:48.632611	2025-11-08 23:27:54.793	\N
328	148	308	2019	2023	V6 3.0T VR30DDTT	2997	\N	雙渦輪增壓	RWD/AWD	雙A臂	多連桿	汽油	VC-Turbo可變壓縮比引擎	2025-09-16 01:08:48.635577	2025-11-08 23:27:54.793	\N
329	149	309	2008	2017	VQ35HR	3498	325	自然進氣	RWD/AWD	雙A臂	多連桿	汽油	全時四驅系統	2025-09-16 01:08:48.638496	2025-11-08 23:27:54.793	\N
330	149	310	2018	2025	VC-Turbo VR30DDTT	2997	268	可變壓縮比渦輪增壓	RWD/AWD	麥花臣	多連桿	汽油	VC-Turbo、ProPILOT駕駛輔助	2025-09-16 01:08:48.641372	2025-11-08 23:27:54.793	\N
331	150	311	2013	2020	VQ35DE	3498	265	自然進氣	FWD/AWD	麥花臣	多連桿	汽油	豪華座艙科技	2025-09-16 01:08:48.644718	2025-11-08 23:27:54.793	\N
332	150	312	2021	2025	VQ35DE	3498	295	自然進氣	FWD/AWD	麥花臣	多連桿	汽油	ProPILOT智能駕駛輔助	2025-09-16 01:08:48.648517	2025-11-08 23:27:54.793	\N
333	151	313	2003	2008	VQ35DE	3498	280	自然進氣	RWD/AWD	雙A臂	多連桿	汽油	主動懸吊系統	2025-09-16 01:08:48.651514	2025-11-08 23:27:54.793	\N
334	152	314	2009	2012	VQ37VHR	3696	325	自然進氣	RWD/AWD	雙A臂	多連桿	汽油	主動懸吊系統	2025-09-16 01:08:48.6544	2025-11-08 23:27:54.793	\N
335	153	315	2009	2013	VQ50VHR	5000	390	自然進氣	RWD/AWD	雙A臂	多連桿	汽油	主動懸吊系統	2025-09-16 01:08:48.65811	2025-11-08 23:27:54.793	\N
336	154	316	2014	2019	VQ37VHR/VR30DDTT	\N	\N	自然進氣/渦輪增壓	RWD/AWD	雙A臂	多連桿	汽油	Direct Adaptive Steering	2025-09-16 01:08:48.66229	2025-11-08 23:27:54.793	\N
337	155	317	2006	2013	4GR-FSE	2499	204	自然進氣	RWD	雙A臂	多連桿	汽油	VVT-i、直噴	2025-09-16 01:08:48.666037	2025-11-08 23:27:54.793	\N
338	155	318	2013	2020	8AR-FTS	2494	245	渦輪增壓	RWD/四驅	雙A臂	多連桿	汽油	渦輪增壓、直噴	2025-09-16 01:08:48.668817	2025-11-08 23:27:54.793	\N
339	156	319	2006	2012	2GR-FE	3456	275	自然進氣	FWD	麥花臣	多連桿	汽油	VVT-i	2025-09-16 01:08:48.671717	2025-11-08 23:27:54.793	\N
340	156	320	2012	2018	2AR-FXE+電動	2494	200	自然進氣＋電動	FWD	麥花臣	多連桿	油電混合	VVT-i、Hybrid Synergy Drive	2025-09-16 01:08:48.674379	2025-11-08 23:27:54.793	\N
341	157	321	2008	2015	2GR-FE	3456	270	自然進氣	四驅	雙A臂	多連桿	汽油	VVT-i	2025-09-16 01:08:48.679299	2025-11-08 23:27:54.793	\N
342	157	322	2015	2022	2GR-FXE+電動	3456	308	自然進氣＋電動	四驅	雙A臂	多連桿	油電混合	混合動力系統	2025-09-16 01:08:48.682129	2025-11-08 23:27:54.793	\N
343	158	323	2006	2017	UR-Series V8	4608	385	自然進氣	RWD	雙A臂	多連桿	汽油	VVT-i、氣缸停用	2025-09-16 01:08:48.684995	2025-11-08 23:27:54.793	\N
344	158	324	2017	2023	2UR-FXE+電動	3456	354	自然進氣＋電動	四驅	雙A臂	多連桿	油電混合	Lexus Multi Stage Hybrid	2025-09-16 01:08:48.68786	2025-11-08 23:27:54.793	\N
345	159	325	2014	2021	2AR-FXE+電動	2494	194	自然進氣＋電動	前驅/四驅	麥花臣	多連桿	油電混合	Hybrid Synergy Drive	2025-09-16 01:08:48.691021	2025-11-08 23:27:54.793	\N
346	159	326	2021	2025	T24A-FTS	2487	279	渦輪增壓	前驅/四驅	麥花臣	多連桿	汽油	渦輪增壓、直噴	2025-09-16 01:08:48.6955	2025-11-08 23:27:54.793	\N
347	160	327	2018	2025	M20A-FKS	1987	171	自然進氣	前驅	麥花臣	多連桿	汽油	VVT-i	2025-09-16 01:08:48.698396	2025-11-08 23:27:54.793	\N
348	160	327	2018	2025	2ZR-FXE+電動	1798	184	自然進氣＋電動	前驅	多連桿	\N	Hybrid Synergy Drive	\N	2025-09-16 01:08:48.700937	2025-11-08 23:27:54.793	\N
349	161	328	2017	2025	2UR-GSE	4969	471	自然進氣	RWD	雙A臂	多連桿	汽油	V8自然進氣	2025-09-16 01:08:48.704049	2025-11-08 23:27:54.793	\N
350	161	328	2017	2025	2UR-GSE+電動	3456	359	自然進氣＋電動	RWD	雙A臂	多連桿	油電混合	多階段混合動力	2025-09-16 01:08:48.706848	2025-11-08 23:27:54.793	\N
351	162	329	2013	2019	Skyactiv-G 2.0	1998	155	自然進氣	FWD	麥花臣	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.711566	2025-11-08 23:27:54.793	\N
352	163	330	2019	2023	Skyactiv-G 2.0	1998	162	自然進氣	FWD/四驅	麥花臣	多連桿	汽油	Skyactiv-X 壓燃引擎	2025-09-16 01:08:48.714445	2025-11-08 23:27:54.793	\N
353	164	331	2012	2018	Skyactiv-G 2.5	2488	190	自然進氣	FWD	雙A臂	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.717369	2025-11-08 23:27:54.793	\N
354	165	332	2018	2023	Skyactiv-G 2.5	2488	194	自然進氣	FWD/四驅	雙A臂	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.720365	2025-11-08 23:27:54.793	\N
355	166	333	2012	2017	Skyactiv-G 2.0	1998	155	自然進氣	四驅	麥花臣	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.72462	2025-11-08 23:27:54.793	\N
356	167	334	2017	2023	Skyactiv-G 2.5	2488	190	自然進氣	四驅	麥花臣	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.728221	2025-11-08 23:27:54.793	\N
357	168	335	2019	2023	Skyactiv-G 2.0	1998	156	自然進氣	四驅	麥花臣	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.731233	2025-11-08 23:27:54.793	\N
358	169	336	2015	2020	Skyactiv-G 2.0	1998	148	自然進氣	四驅	麥花臣	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.734204	2025-11-08 23:27:54.793	\N
359	170	337	2015	2023	Skyactiv-G 2.0	1998	184	自然進氣	RWD	雙A臂	多連桿	汽油	Skyactiv技術	2025-09-16 01:08:48.737041	2025-11-08 23:27:54.793	\N
360	171	338	2005	2011	MR16DE	1598	110	自然進氣	前置前驅	麥花臣	扭力樑	汽油	可變氣門正時CVTC	2025-09-16 01:08:48.741543	2025-11-08 23:27:54.793	\N
361	171	339	2011	2019	MR18DE	1798	131	自然進氣	前置前驅	麥花臣	扭力樑	汽油	Xtronic CVT變速系統	2025-09-16 01:08:48.744795	2025-11-08 23:27:54.793	\N
362	172	340	2013	2019	MRA8DE	1997	144	自然進氣	前置前驅	麥花臣	多連桿	汽油	Xtronic CVT，VVEL技術	2025-09-16 01:08:48.747703	2025-11-08 23:27:54.793	\N
363	173	341	2013	2018	MRA8DE	2495	182	自然進氣	前置前驅	麥花臣	多連桿	汽油	Xtronic CVT，VVEL，智能全輪驅動	2025-09-16 01:08:48.750762	2025-11-08 23:27:54.793	\N
364	174	342	2007	2013	MR20DE	1997	141	自然進氣	前置四驅	麥花臣	多連桿	汽油	ALL MODE 4x4-i 智能四輪驅動	2025-09-16 01:08:48.755096	2025-11-08 23:27:54.793	\N
365	174	343	2013	2021	MR20DD	2488	171	自然進氣	前置四驅	麥花臣	多連桿	汽油	ALL MODE 4x4-i，ProPILOT駕駛輔助	2025-09-16 01:08:48.758961	2025-11-08 23:27:54.793	\N
366	175	344	2010	2019	MR16DDT	1618	190	渦輪增壓	前置前驅/四驅	麥花臣	多連桿	汽油	Turbo增壓引擎，DSC動態穩定控制	2025-09-16 01:08:48.76203	2025-11-08 23:27:54.793	\N
367	176	345	2009	2014	VQ35DE	3498	265	自然進氣	前置四驅	麥花臣	多連桿	汽油	智能全輪驅動系統，VVEL	2025-09-16 01:08:48.76493	2025-11-08 23:27:54.793	\N
368	177	346	2017	2025	HR16DE	1598	120	自然進氣	前置前驅	麥花臣	多連桿	汽油	Xtronic CVT，智能安全輔助系統	2025-09-16 01:08:48.768005	2025-11-08 23:27:54.793	\N
369	178	347	2008	2022	VR38DETT	3799	\N	雙渦輪增壓	四輪驅動	雙叉臂	多連桿	汽油	VR38DETT雙渦輪增壓引擎，ATTESA E-TS四輪驅動，Brembo煞車系統，電子懸吊控制	2025-09-16 01:08:48.772137	2025-11-08 23:27:54.793	\N
370	179	348	2003	2009	VQ35DE	3498	280	自然進氣	後輪驅動	雙叉臂	多連桿	汽油	VQ35DE自然進氣V6引擎，Brembo制動系統（部分車型），多連桿懸吊	2025-09-16 01:08:48.775579	2025-11-08 23:27:54.793	\N
371	180	349	2009	2020	VQ37VHR	3696	328	自然進氣	後輪驅動	雙叉臂	多連桿	汽油	VQ37VHR高轉速自然進氣V6引擎，VVEL，Brembo制動系統，運動化懸吊	2025-09-16 01:08:48.778858	2025-11-08 23:27:54.793	\N
372	181	350	2006	2011	 EJ20	1994	300	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD	2025-09-16 01:08:48.782127	2025-11-08 23:27:54.793	\N
375	182	353	2008	2013	 EJ20	1994	237	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD，渦輪增壓水平對臥引擎	2025-09-16 01:08:48.792184	2025-11-08 23:27:54.793	\N
378	183	356	2005	2009	 EJ20	1994	280	渦輪增壓	四輪驅動	雙叉臂	多連桿	汽油	Symmetrical AWD，渦輪增壓引擎	2025-09-16 01:08:48.800961	2025-11-08 23:27:54.793	\N
380	184	358	2014	2021	 EJ25	2457	305	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD，Driver Controlled Center Differential	2025-09-16 01:08:48.807889	2025-11-08 23:27:54.793	\N
381	185	359	2012	2020	 FA20	1998	200	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	水平對臥引擎，輕量化車身，運動化懸吊	2025-09-16 01:08:48.811234	2025-11-08 23:27:54.793	\N
383	186	361	2004	2011	N52	2996	265	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.703	2025-11-08 23:27:54.793	\N
384	187	362	2005	2012	N46	1995	150	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.714	2025-11-08 23:27:54.793	\N
385	188	363	2007	2010	N54	2979	306	雙渦輪增壓	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.719	2025-11-08 23:27:54.793	\N
386	187	364	2012	2018	B48	1998	184	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.721	2025-11-08 23:27:54.793	\N
387	189	365	2015	2019	B58	2998	326	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.725	2025-11-08 23:27:54.793	\N
388	190	366	2019	2023	B48B20	1998	258	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.728	2025-11-08 23:27:54.793	\N
389	191	367	2019	2023	B58B30	2998	387	渦輪增壓	AWD	雙接頭彈簧柱(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.734	2025-11-08 23:27:54.793	\N
390	192	368	2003	2010	N52	2996	258	自然進氣	RWD	雙A臂	整體式多連桿	汽油	\N	2025-09-30 14:33:57.737	2025-11-08 23:27:54.793	\N
391	193	369	2010	2016	N55	2979	306	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.741	2025-11-08 23:27:54.793	\N
392	194	370	2017	2023	B58	2998	340	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.744	2025-11-08 23:27:54.793	\N
393	195	371	2017	2023	N63	4395	530	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.748	2025-11-08 23:27:54.793	\N
394	196	372	2008	2015	N63	4395	450	雙渦輪增壓	RWD	雙接頭彈簧柱	整體式多連桿	汽油	\N	2025-09-30 14:33:57.751	2025-11-08 23:27:54.793	\N
395	197	373	2015	2022	B58	2998	326	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.754	2025-11-08 23:27:54.793	\N
396	198	374	2016	2022	N74	6592	610	雙渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.757	2025-11-08 23:27:54.793	\N
397	199	375	2010	2017	N55	2979	306	渦輪增壓	AWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.761	2025-11-08 23:27:54.793	\N
398	200	376	2017	2023	B58	2998	360	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.765	2025-11-08 23:27:54.793	\N
399	201	377	2006	2013	N63	4395	408	雙渦輪增壓	AWD	雙A臂	整體式多連桿	汽油	\N	2025-09-30 14:33:57.768	2025-11-08 23:27:54.793	\N
401	202	379	2018	2023	N63	4395	530	雙渦輪增壓	AWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.775	2025-11-08 23:27:54.793	\N
402	203	380	2009	2016	N54	2979	306	雙渦輪增壓	RWD	麥花臣	中央控制臂	汽油	\N	2025-09-30 14:33:57.778	2025-11-08 23:27:54.793	\N
403	204	381	2018	2023	B58	2998	340	渦輪增壓	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.783	2025-11-08 23:27:54.793	\N
406	205	384	2021	2023	電動	\N	523	電動	AWD	雙接頭彈簧柱	多連桿	純電	\N	2025-09-30 14:33:57.792	2025-11-08 23:27:54.793	\N
409	206	387	2020	2023	S58	2993	510	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.803	2025-11-08 23:27:54.793	\N
411	207	389	2017	2023	S63	4395	625	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.809	2025-11-08 23:27:54.793	\N
412	208	390	2019	2023	S58	2993	510	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.813	2025-11-08 23:27:54.793	\N
414	209	392	2019	2023	S63	4395	625	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.819	2025-11-08 23:27:54.793	\N
415	210	393	2020	2023	B48	1998	306	渦輪增壓	AWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.822	2025-11-08 23:27:54.793	\N
416	211	394	2014	2020	B58	2998	326	渦輪增壓	RWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.825	2025-11-08 23:27:54.793	\N
417	212	395	2020	2023	B58B30	2998	387	渦輪增壓	AWD	雙接頭彈簧柱(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.829	2025-11-08 23:27:54.793	\N
418	213	396	2017	2020	B58	2998	340	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.833	2025-11-08 23:27:54.793	\N
419	214	397	2018	2023	N63	4395	530	雙渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.836	2025-11-08 23:27:54.793	\N
420	215	398	2018	2023	B58	2998	360	渦輪增壓	AWD	雙接頭彈簧柱	多連桿	汽油	\N	2025-09-30 14:33:57.839	2025-11-08 23:27:54.793	\N
421	216	399	2018	2023	N63	4395	530	雙渦輪增壓	AWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.843	2025-11-08 23:27:54.793	\N
422	217	400	2021	2023	電動	\N	544	電動	AWD	雙接頭彈簧柱	多連桿	純電	\N	2025-09-30 14:33:57.846	2025-11-08 23:27:54.793	\N
423	218	401	2022	2023	S58	2993	550	雙渦輪增壓	RWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.853	2025-11-08 23:27:54.793	\N
382	39	76	2016	2019	DNUE	1984	190	\N	\N	\N	\N	Petrol	\N	2025-09-24 06:11:44.394	2025-11-08 23:27:54.793	\N
373	181	350	2011	2014	 EJ25	2457	305	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD	2025-09-16 01:08:48.784814	2025-11-08 23:27:54.793	\N
374	181	350	2012	2016	 FB20	1995	156	自然進氣	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD，Lineartronic CVT	2025-09-16 01:08:48.78887	2025-11-08 23:27:54.793	\N
376	182	353	2013	2018	 FB20	1995	150	自然進氣	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD，EyeSight駕駛輔助系統	2025-09-16 01:08:48.795208	2025-11-08 23:27:54.793	\N
377	182	353	2018	2022	 FB20	1995	156	自然進氣	四輪驅動	雙叉臂	雙叉臂	汽油	Symmetrical AWD，EyeSight系統，X-MODE越野模式	2025-09-16 01:08:48.798008	2025-11-08 23:27:54.793	\N
424	219	402	2021	2022	S63	4395	635	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-30 14:33:57.857	2025-11-08 23:27:54.793	\N
425	220	403	2023	2023	S68	4395	748	雙渦輪增壓+PHEV	AWD	雙A臂(主動式)	多連桿(主動式)	汽油	\N	2025-09-30 14:33:57.862	2025-11-08 23:27:54.793	\N
426	221	404	2003	2004	S54	3246	360	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.867	2025-11-08 23:27:54.793	\N
427	222	405	2004	2007	M271	1796	163	機械增壓	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.873	2025-11-08 23:27:54.793	\N
428	223	406	2008	2014	M271	1796	204	渦輪增壓	RWD	三連桿	多連桿	汽油	\N	2025-09-30 14:33:57.877	2025-11-08 23:27:54.793	\N
429	222	407	2015	2021	M274	1991	184	渦輪增壓	RWD	多連桿	多連桿	汽油	\N	2025-09-30 14:33:57.88	2025-11-08 23:27:54.793	\N
430	222	408	2021	2025	M254	1499	204	渦輪增壓	RWD	多連桿	多連桿	汽油	\N	2025-09-30 14:33:57.883	2025-11-08 23:27:54.793	\N
431	224	409	2004	2009	M271	1796	163	機械增壓	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.887	2025-11-08 23:27:54.793	\N
432	225	410	2009	2016	M271	1796	204	渦輪增壓	4MATIC	三連桿	多連桿	汽油	\N	2025-09-30 14:33:57.891	2025-11-08 23:27:54.793	\N
433	226	411	2016	2023	M274	1991	184	渦輪增壓	RWD	多連桿	多連桿	汽油	\N	2025-09-30 14:33:57.895	2025-11-08 23:27:54.793	\N
434	226	412	2023	2025	M254	1999	204	渦輪增壓	RWD	多連桿	多連桿	汽油	\N	2025-09-30 14:33:57.898	2025-11-08 23:27:54.793	\N
435	227	413	2006	2013	M272	3498	272	自然進氣	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.903	2025-11-08 23:27:54.793	\N
436	228	414	2014	2020	M276	2996	367	渦輪增壓	4MATIC	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.907	2025-11-08 23:27:54.793	\N
437	229	415	2021	2025	M256	2999	435	渦輪增壓	4MATIC	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.911	2025-11-08 23:27:54.793	\N
438	230	416	2015	2022	M274	1991	184	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.916	2025-11-08 23:27:54.793	\N
439	231	417	2022	2025	M254	1999	313	渦輪增壓	4MATIC	多連桿	多連桿	插電混動	\N	2025-09-30 14:33:57.92	2025-11-08 23:27:54.793	\N
440	232	418	2015	2019	OM642	2987	258	渦輪增壓	4MATIC	雙A臂	多連桿	柴油	\N	2025-09-30 14:33:57.924	2025-11-08 23:27:54.793	\N
441	233	419	2019	2025	M256	2999	367	渦輪增壓	4MATIC	E-ACTIVE BODY	E-ACTIVE BODY	汽油	\N	2025-09-30 14:33:57.928	2025-11-08 23:27:54.793	\N
442	234	420	2012	2018	M270	1595	122	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:57.933	2025-11-08 23:27:54.793	\N
443	235	421	2018	2025	M282	1332	163	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:57.937	2025-11-08 23:27:54.793	\N
444	236	422	2014	2020	M270	1595	156	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.942	2025-11-08 23:27:54.793	\N
445	237	423	2020	2025	M260	1991	224	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.946	2025-11-08 23:27:54.793	\N
446	238	424	2019	2025	M282	1332	163	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:57.95	2025-11-08 23:27:54.793	\N
447	239	425	2004	2018	M273	5461	388	自然進氣	4MATIC	固定軸	固定軸	汽油	\N	2025-09-30 14:33:57.954	2025-11-08 23:27:54.793	\N
448	240	426	2018	2025	OM656	2925	330	渦輪增壓	4MATIC	雙A臂	固定軸	柴油	\N	2025-09-30 14:33:57.958	2025-11-08 23:27:54.793	\N
449	241	427	2022	2025	電動	\N	292	電動	RWD	四連桿	多連桿	純電	\N	2025-09-30 14:33:57.963	2025-11-08 23:27:54.793	\N
450	242	428	2021	2025	電動	\N	333	電動	RWD	四連桿	多連桿	純電	\N	2025-09-30 14:33:57.967	2025-11-08 23:27:54.793	\N
451	243	429	2015	2023	M178	3982	522	渦輪增壓	RWD	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:57.972	2025-11-08 23:27:54.793	\N
452	244	430	2023	2025	M177	3982	639	渦輪增壓	4MATIC+	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:57.976	2025-11-08 23:27:54.793	\N
453	245	431	2013	2019	M270	1595	156	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.98	2025-11-08 23:27:54.793	\N
454	246	432	2020	2025	M260	1991	306	渦輪增壓	4MATIC	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:57.985	2025-11-08 23:27:54.793	\N
455	247	433	2012	2020	M278	4663	435	渦輪增壓	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.989	2025-11-08 23:27:54.793	\N
456	248	434	2022	2025	M177	3982	476	渦輪增壓	4MATIC+	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:57.993	2025-11-08 23:27:54.793	\N
457	249	435	2004	2008	EA113	1781	163	渦輪增壓	FWD	雙A臂	梯型多連桿	汽油	\N	2025-09-30 14:33:57.999	2025-11-08 23:27:54.793	\N
458	250	436	2006	2008	EA113	1984	200	渦輪增壓	FWD	雙A臂	梯型多連桿	汽油	\N	2025-09-30 14:33:58.003	2025-11-08 23:27:54.793	\N
459	251	437	2008	2015	EA888	1984	180	渦輪增壓	quattro	五連桿	梯型多連桿	汽油	\N	2025-09-30 14:33:58.008	2025-11-08 23:27:54.793	\N
460	252	438	2015	2023	EA888 Gen3	1984	190	渦輪增壓	quattro	五連桿	五連桿	汽油	\N	2025-09-30 14:33:58.012	2025-11-08 23:27:54.793	\N
461	253	439	2023	2025	EA888 Evo4	1984	265	渦輪增壓	quattro	五連桿	五連桿	汽油	\N	2025-09-30 14:33:58.016	2025-11-08 23:27:54.793	\N
462	254	440	2005	2011	BAE	2773	220	自然進氣	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.02	2025-11-08 23:27:54.793	\N
463	255	441	2011	2018	EA288	1968	190	渦輪增壓	quattro	五連桿	梯型多連桿	柴油	\N	2025-09-30 14:33:58.024	2025-11-08 23:27:54.793	\N
464	256	442	2018	2025	EA888 Gen3	1984	245	渦輪增壓	quattro	五連桿	五連桿	汽油	\N	2025-09-30 14:33:58.029	2025-11-08 23:27:54.793	\N
465	257	443	2010	2017	CRE	2995	290	機械增壓	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.033	2025-11-08 23:27:54.793	\N
466	258	444	2017	2025	EA839	2995	340	渦輪增壓	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.037	2025-11-08 23:27:54.793	\N
467	259	445	2006	2014	EA113	1984	200	渦輪增壓	quattro	麥花臣	四連桿	汽油	\N	2025-09-30 14:33:58.04	2025-11-08 23:27:54.793	\N
468	260	446	2014	2023	EA888	1984	310	渦輪增壓	quattro	麥花臣	四連桿	汽油	\N	2025-09-30 14:33:58.042	2025-11-08 23:27:54.793	\N
469	261	447	2009	2017	EA888	1984	180	渦輪增壓	quattro	五連桿	梯型多連桿	汽油	\N	2025-09-30 14:33:58.045	2025-11-08 23:27:54.793	\N
470	262	448	2017	2023	EA888 Gen3	1984	252	渦輪增壓	quattro	五連桿	五連桿	汽油	\N	2025-09-30 14:33:58.048	2025-11-08 23:27:54.793	\N
471	263	449	2020	2025	EA888 + PHEV	1984	367	渦輪增壓	quattro	五連桿	五連桿	插電混動	\N	2025-09-30 14:33:58.052	2025-11-08 23:27:54.793	\N
472	264	450	2006	2015	ASB	2967	233	渦輪增壓	quattro	雙A臂	雙A臂	柴油	\N	2025-09-30 14:33:58.056	2025-11-08 23:27:54.793	\N
473	265	451	2015	2023	EA897	2967	249	渦輪增壓	quattro	雙A臂	雙A臂	柴油	\N	2025-09-30 14:33:58.06	2025-11-08 23:27:54.793	\N
474	266	452	2017	2023	EA888 + PHEV	1984	367	渦輪增壓	quattro	雙A臂	雙A臂	插電混動	\N	2025-09-30 14:33:58.065	2025-11-08 23:27:54.793	\N
475	267	453	2019	2025	電動	\N	408	電動	quattro	雙A臂	多連桿	純電	\N	2025-09-30 14:33:58.069	2025-11-08 23:27:54.793	\N
477	268	455	2013	2018	EA824	3993	560	雙渦輪增壓	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.078	2025-11-08 23:27:54.793	\N
478	268	456	2019	2025	EA825	3996	600	雙渦輪增壓	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.08	2025-11-08 23:27:54.793	\N
479	269	457	2004	2012	EA113	1781	160	渦輪增壓	FWD	麥花臣	四連桿	汽油	\N	2025-09-30 14:33:58.085	2025-11-08 23:27:54.793	\N
480	270	458	2012	2020	EA888	1984	190	渦輪增壓	quattro	麥花臣	四連桿	汽油	\N	2025-09-30 14:33:58.089	2025-11-08 23:27:54.793	\N
481	271	459	2020	2025	EA211 Evo	1498	150	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.093	2025-11-08 23:27:54.793	\N
482	272	460	2011	2018	EA888	1984	170	渦輪增壓	quattro	麥花臣	四連桿	汽油	\N	2025-09-30 14:33:58.098	2025-11-08 23:27:54.793	\N
483	273	461	2018	2025	EA888	1984	230	渦輪增壓	quattro	麥花臣	四連桿	汽油	\N	2025-09-30 14:33:58.101	2025-11-08 23:27:54.793	\N
484	274	462	2007	2015	BHK	4163	420	自然進氣	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.103	2025-11-08 23:27:54.793	\N
485	275	463	2015	2023	EA824	5204	610	自然進氣	quattro	雙A臂	雙A臂	汽油	\N	2025-09-30 14:33:58.106	2025-11-08 23:27:54.793	\N
486	276	464	2020	2025	電動	\N	435	電動	quattro	雙A臂	多連桿	純電	\N	2025-09-30 14:33:58.109	2025-11-08 23:27:54.793	\N
488	278	466	2021	2025	電動	\N	204	電動	RWD	麥花臣	多連桿	純電	\N	2025-09-30 14:33:58.114	2025-11-08 23:27:54.793	\N
489	279	467	2007	2016	EA888	1984	180	渦輪增壓	quattro	五連桿	梯型多連桿	汽油	\N	2025-09-30 14:33:58.119	2025-11-08 23:27:54.793	\N
490	280	468	2016	2023	EA888	1984	249	渦輪增壓	quattro	五連桿	五連桿	汽油	\N	2025-09-30 14:33:58.122	2025-11-08 23:27:54.793	\N
492	281	470	2004	2009	EA111	1595	102	自然進氣	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.131	2025-11-08 23:27:54.793	\N
493	282	471	2006	2009	EA113	1984	200	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.135	2025-11-08 23:27:54.793	\N
494	283	472	2009	2013	EA111	1390	122	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.139	2025-11-08 23:27:54.793	\N
495	282	473	2010	2013	EA888	1984	210	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.141	2025-11-08 23:27:54.793	\N
496	283	474	2013	2020	EA211	1395	125	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.143	2025-11-08 23:27:54.793	\N
497	282	475	2014	2020	EA888	1984	230	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.145	2025-11-08 23:27:54.793	\N
498	284	476	2020	2025	EA211 EVO	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.15	2025-11-08 23:27:54.793	\N
499	282	477	2021	2025	EA888 Evo4	1984	245	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.152	2025-11-08 23:27:54.793	\N
500	285	478	2005	2011	EA189	1968	140	渦輪增壓	FWD	麥花臣	多連桿	柴油	\N	2025-09-30 14:33:58.156	2025-11-08 23:27:54.793	\N
501	286	479	2011	2015	EA888	1798	160	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.159	2025-11-08 23:27:54.793	\N
502	287	480	2015	2023	EA888	1984	190	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.162	2025-11-08 23:27:54.793	\N
503	288	481	2023	2025	EA211 EVO2	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.166	2025-11-08 23:27:54.793	\N
504	289	482	2008	2016	EA888	1984	180	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.169	2025-11-08 23:27:54.793	\N
505	290	483	2016	2020	EA888	1984	180	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.172	2025-11-08 23:27:54.793	\N
506	291	484	2020	2025	EA211 EVO	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.175	2025-11-08 23:27:54.793	\N
507	292	485	2018	2023	EA211	1395	130	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.178	2025-11-08 23:27:54.793	\N
508	293	486	2021	2025	EA888	1984	190	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.183	2025-11-08 23:27:54.793	\N
509	294	487	2004	2010	EA188	1896	105	渦輪增壓	FWD	麥花臣	扭力樑	柴油	\N	2025-09-30 14:33:58.188	2025-11-08 23:27:54.793	\N
510	295	488	2010	2015	EA111	1390	140	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.193	2025-11-08 23:27:54.793	\N
511	296	489	2015	2025	EA211	1498	150	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.197	2025-11-08 23:27:54.793	\N
512	297	490	2017	2025	EA888	1984	190	渦輪增壓	4MOTION	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.201	2025-11-08 23:27:54.793	\N
513	298	491	2004	2010	EA189	1598	102	渦輪增壓	FWD	麥花臣	葉片彈簧	柴油	\N	2025-09-30 14:33:58.205	2025-11-08 23:27:54.793	\N
514	299	492	2010	2020	EA211	1395	125	渦輪增壓	FWD	麥花臣	複合式懸吊	汽油	\N	2025-09-30 14:33:58.21	2025-11-08 23:27:54.793	\N
515	300	493	2020	2025	EA288 Evo	1968	122	渦輪增壓	FWD	麥花臣	複合式懸吊	柴油	\N	2025-09-30 14:33:58.216	2025-11-08 23:27:54.793	\N
516	301	494	2009	2017	EA111	1598	105	自然進氣	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.221	2025-11-08 23:27:54.793	\N
517	302	495	2018	2025	EA211	999	115	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.225	2025-11-08 23:27:54.793	\N
518	303	496	2019	2025	EA211	999	115	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.229	2025-11-08 23:27:54.793	\N
519	304	497	2005	2007	AUA	1390	80	自然進氣	前置前驅	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.234	2025-11-08 23:27:54.793	\N
520	305	498	2007	2014	BZG	1390	75	自然進氣	前置前驅	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.238	2025-11-08 23:27:54.793	\N
521	306	499	2011	2015	CBZB	1197	105	渦輪增壓	前置前驅	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.243	2025-11-08 23:27:54.793	\N
522	307	500	2022	2025	CHPA	999	110	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.246	2025-11-08 23:27:54.793	\N
523	308	501	2005	2008	AWL	1598	102	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.252	2025-11-08 23:27:54.793	\N
524	309	502	2008	2013	CZCA	1798	160	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.256	2025-11-08 23:27:54.793	\N
525	310	503	2013	2020	CZEA	1395	150	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.26	2025-11-08 23:27:54.793	\N
526	311	504	2019	2024	DJYA	1498	150	渦輪增壓+輕油電	前置前驅	麥花臣	多連桿	汽油+輕油電	\N	2025-09-30 14:33:58.264	2025-11-08 23:27:54.793	\N
527	311	505	2024	2025	DPCA	1498	150	渦輪增壓+輕油電	前置前驅	麥花臣	多連桿	汽油+輕油電	\N	2025-09-30 14:33:58.266	2025-11-08 23:27:54.793	\N
528	312	506	2024	2025	DTU	1984	245	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.27	2025-11-08 23:27:54.793	\N
529	313	507	2005	2008	BLR	1984	150	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.273	2025-11-08 23:27:54.793	\N
530	314	508	2008	2015	CFGB	1968	170	渦輪增壓柴油	前置前驅	麥花臣	多連桿	柴油	\N	2025-09-30 14:33:58.277	2025-11-08 23:27:54.793	\N
531	315	509	2015	2023	CJZA	1984	280	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.279	2025-11-08 23:27:54.793	\N
532	316	510	2023	2025	DTF	1984	280	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.283	2025-11-08 23:27:54.793	\N
533	317	511	2010	2015	CBZB	1197	105	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.286	2025-11-08 23:27:54.793	\N
534	318	512	2012	2019	CWVA	1598	110	自然進氣	前置前驅	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.289	2025-11-08 23:27:54.793	\N
535	315	513	2017	2022	CHHB	1984	180	渦輪增壓	前置四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.29	2025-11-08 23:27:54.793	\N
536	319	514	2023	2025	DTF	1984	265	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.293	2025-11-08 23:27:54.793	\N
537	320	515	2018	2022	CZEA	1498	150	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.296	2025-11-08 23:27:54.793	\N
538	320	516	2022	2025	DPCA	1498	150	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.299	2025-11-08 23:27:54.793	\N
539	321	517	2019	2025	DKRF	999	115	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.301	2025-11-08 23:27:54.793	\N
542	322	520	2009	2011	9A1 3.6	3614	345	自然進氣	後置後驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.309	2025-11-08 23:27:54.793	\N
543	322	521	2011	2015	MA1 3.4	3436	350	自然進氣	後置後驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.311	2025-11-08 23:27:54.793	\N
544	322	522	2015	2019	9A2 3.0TT	2981	370	雙渦輪	後置後驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.312	2025-11-08 23:27:54.793	\N
545	322	523	2019	2025	9A2 3.0TT	2981	385	雙渦輪	後置後驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.314	2025-11-08 23:27:54.793	\N
547	85	525	2016	2025	9A2B4 2.0T	1988	300	渦輪	中置後驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.319	2025-11-08 23:27:54.793	\N
549	86	527	2016	2025	9A2B4 2.0T	1988	300	渦輪	中置後驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.323	2025-11-08 23:27:54.793	\N
550	87	528	2010	2017	3.6 V6	3604	300	自然進氣	前置四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.326	2025-11-08 23:27:54.793	\N
551	87	529	2018	2023	EA839 3.0T	2995	340	渦輪	前置四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.328	2025-11-08 23:27:54.793	\N
552	323	530	2023	2025	EA839 3.0T	2995	353	渦輪	前置四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.332	2025-11-08 23:27:54.793	\N
553	89	531	2014	2023	EA888 2.0T	1984	252	渦輪	前置四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.335	2025-11-08 23:27:54.793	\N
554	324	532	2024	2025	Electric	0	408	電動	四驅	麥花臣	多連桿	純電	\N	2025-09-30 14:33:58.339	2025-11-08 23:27:54.793	\N
555	90	533	2010	2016	3.6 V6	3605	300	自然進氣	前置後驅/四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.342	2025-11-08 23:27:54.793	\N
556	90	534	2016	2023	3.0T V6	2995	330	渦輪	前置後驅/四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.344	2025-11-08 23:27:54.793	\N
557	90	535	2023	2025	2.9T V6	2894	353	雙渦輪	前置後驅/四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.346	2025-11-08 23:27:54.793	\N
558	325	536	2020	2025	Electric	0	408	電動	後驅/四驅	雙A臂	多連桿	純電	\N	2025-09-30 14:33:58.35	2025-11-08 23:27:54.793	\N
559	326	537	2007	2013	N12B16A	1598	120	自然吸氣	前輪驅動	麥花臣式	多連桿	汽油	\N	2025-09-30 14:33:58.354	2025-11-08 23:27:54.793	\N
560	327	538	2007	2013	N14B16A	1598	175	渦輪增壓	前輪驅動	麥花臣式	多連桿	汽油	\N	2025-09-30 14:33:58.358	2025-11-08 23:27:54.793	\N
562	326	540	2014	2023	B38B15A	1499	136	渦輪增壓	前輪驅動	麥花臣式	多連桿	汽油	\N	2025-09-30 14:33:58.363	2025-11-08 23:27:54.793	\N
563	327	541	2014	2023	B48B20A	1998	192	渦輪增壓	前輪驅動	麥花臣式	多連桿	汽油	\N	2025-09-30 14:33:58.365	2025-11-08 23:27:54.793	\N
566	328	544	2020	2023	電動	\N	184	純電動	前輪驅動	麥花臣式	多連桿	電動	\N	2025-09-30 14:33:58.373	2025-11-08 23:27:54.793	\N
567	329	545	2004	2008	Duratec-HE	1999	145	自然進氣	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.377	2025-11-08 23:27:54.793	\N
568	330	546	2011	2015	Duratorq TDCi	1560	115	渦輪增壓	FWD	麥花臣	多連桿	柴油	\N	2025-09-30 14:33:58.379	2025-11-08 23:27:54.793	\N
569	331	547	2015	2018	EcoBoost	1499	180	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.383	2025-11-08 23:27:54.793	\N
570	332	548	2018	2022	EcoBoost	1499	182	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.386	2025-11-08 23:27:54.793	\N
571	333	549	2022	2025	EcoBoost	1999	280	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.389	2025-11-08 23:27:54.793	\N
572	334	550	2013	2016	EcoBoost	1999	242	渦輪增壓	AWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.394	2025-11-08 23:27:54.793	\N
573	335	551	2020	2025	EcoBoost	1499	180	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.397	2025-11-08 23:27:54.793	\N
574	336	552	2020	2025	EcoBoost	1999	250	渦輪增壓	AWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.4	2025-11-08 23:27:54.793	\N
575	337	553	2007	2014	Duratec-HE	1999	203	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.403	2025-11-08 23:27:54.793	\N
576	338	554	2015	2022	Atkinson	1999	187	阿特金森循環	FWD	麥花臣	多連桿	油電混合	\N	2025-09-30 14:33:58.405	2025-11-08 23:27:54.793	\N
577	339	555	2023	2025	EcoBoost	1999	253	渦輪增壓	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.408	2025-11-08 23:27:54.793	\N
578	340	556	2008	2013	Duratec	1596	120	自然進氣	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.411	2025-11-08 23:27:54.793	\N
579	341	557	2014	2022	EcoBoost	999	125	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.415	2025-11-08 23:27:54.793	\N
580	342	558	2012	2019	Duratorq	3198	200	渦輪增壓	4WD	雙A臂	葉片彈簧	柴油	\N	2025-09-30 14:33:58.418	2025-11-08 23:27:54.793	\N
581	343	559	2019	2025	EcoBlue	1997	213	渦輪增壓	4WD	雙A臂	葉片彈簧	柴油	\N	2025-09-30 14:33:58.421	2025-11-08 23:27:54.793	\N
584	344	562	2015	2023	EcoBoost	2261	290	渦輪增壓	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.43	2025-11-08 23:27:54.793	\N
585	345	563	2024	2025	Coyote	5038	500	自然進氣	RWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.434	2025-11-08 23:27:54.793	\N
586	346	564	2004	2008	Duratec	2261	153	自然進氣	4WD	麥花臣	雙連桿	汽油	\N	2025-09-30 14:33:58.438	2025-11-08 23:27:54.793	\N
587	347	565	2014	2022	Dragon	1498	112	自然進氣	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.441	2025-11-08 23:27:54.793	\N
588	348	566	2022	2025	EcoBoost PHEV	1499	225	渦輪增壓	FWD	麥花臣	多連桿	插電混動	\N	2025-09-30 14:33:58.445	2025-11-08 23:27:54.793	\N
590	349	568	2023	2025	EcoBoost	1499	160	渦輪增壓	FWD	麥花臣	扭力樑	汽油	\N	2025-09-30 14:33:58.451	2025-11-08 23:27:54.793	\N
592	350	570	2004	2012	B4204T11	1984	145	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.457	2025-11-08 23:27:54.793	\N
593	351	571	2004	2012	B5254T7	2521	230	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.461	2025-11-08 23:27:54.793	\N
594	352	572	2000	2009	B5244S	2435	140	自然進氣	前置前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.465	2025-11-08 23:27:54.793	\N
595	353	573	2010	2018	B4204T27	1969	245	渦輪增壓	前置前驅/四驅	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.469	2025-11-08 23:27:54.793	\N
596	354	574	2010	2018	B6304T37	2953	304	渦輪增壓	前置四驅	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.473	2025-11-08 23:27:54.793	\N
597	355	575	2019	2025	B4204T43	1969	415	渦輪增壓+機械增壓+電動	四輪驅動	雙叉臂	多連桿	油電混合	\N	2025-09-30 14:33:58.476	2025-11-08 23:27:54.793	\N
598	356	576	2019	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	前輪驅動/四輪驅動	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.48	2025-11-08 23:27:54.793	\N
599	357	577	2006	2016	B6324S	3192	238	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.484	2025-11-08 23:27:54.793	\N
600	358	578	2006	2016	B6304T	2953	285	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.487	2025-11-08 23:27:54.793	\N
601	359	579	2016	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	四輪驅動	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.491	2025-11-08 23:27:54.793	\N
602	360	580	2004	2012	B5244S5	2435	170	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.494	2025-11-08 23:27:54.793	\N
603	361	581	2010	2018	B4204T7	1999	240	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.498	2025-11-08 23:27:54.793	\N
604	362	582	2019	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	前輪驅動/四輪驅動	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.501	2025-11-08 23:27:54.793	\N
605	363	583	2000	2007	B5254T2	2521	210	渦輪增壓	前置前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.504	2025-11-08 23:27:54.793	\N
606	364	584	2008	2017	B6304T43	2953	304	渦輪增壓	四輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.507	2025-11-08 23:27:54.793	\N
607	365	585	2019	2025	B4204T5	1969	197	渦輪增壓+48V輕油電	前輪驅動	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.51	2025-11-08 23:27:54.793	\N
608	366	586	2019	2025	B4204T28	1969	250	渦輪增壓+48V輕油電	四輪驅動	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.513	2025-11-08 23:27:54.793	\N
609	367	587	2017	2025	B4204T48	1969	400	渦輪增壓+電動	四輪驅動	雙A臂	多連桿	油電混合	\N	2025-09-30 14:33:58.517	2025-11-08 23:27:54.793	\N
610	368	588	2007	2016	B6324S	3192	238	自然進氣	四輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.52	2025-11-08 23:27:54.793	\N
611	369	589	2002	2014	B5254T2	2521	210	渦輪增壓	前置前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.524	2025-11-08 23:27:54.793	\N
612	370	590	2015	2025	B4204T48	1969	400	渦輪增壓+電動	四輪驅動	雙A臂	多連桿	油電混合	\N	2025-09-30 14:33:58.528	2025-11-08 23:27:54.793	\N
613	371	591	2018	2025	B420T5	1969	197	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.532	2025-11-08 23:27:54.793	\N
614	372	592	2021	2025	電動	\N	408	電動	四輪驅動	麥花臣	多連桿	純電	\N	2025-09-30 14:33:58.535	2025-11-08 23:27:54.793	\N
615	373	593	2006	2013	B5244S4	2435	170	自然進氣	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.539	2025-11-08 23:27:54.793	\N
616	374	594	2006	2013	B5244T7	2521	230	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.543	2025-11-08 23:27:54.793	\N
617	375	595	2019	2021	B58B30	2998	340	渦輪	後輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.547	2025-11-08 23:27:54.793	\N
618	376	596	2022	2025	B58B30	2998	387	渦輪	後輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.55	2025-11-08 23:27:54.793	\N
619	377	597	2021	2025	B48B20	1998	258	渦輪	後輪驅動	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.554	2025-11-08 23:27:54.793	\N
620	378	598	2012	2020	FA20	1998	200	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.557	2025-11-08 23:27:54.793	\N
621	379	599	2012	2020	FA20	1998	200	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.56	2025-11-08 23:27:54.793	\N
622	380	600	2020	2025	FA24	2362	235	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.563	2025-11-08 23:27:54.793	\N
623	381	601	2004	2007	1ZZ-FE	1794	132	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.566	2025-11-08 23:27:54.793	\N
624	382	602	2008	2013	2ZR-FE	1798	140	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.571	2025-11-08 23:27:54.793	\N
625	383	603	2014	2019	2ZR-FE	1798	140	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.575	2025-11-08 23:27:54.793	\N
626	384	604	2019	2023	2ZR-FXE	1798	122	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	\N	2025-09-30 14:33:58.58	2025-11-08 23:27:54.793	\N
627	385	605	2021	2025	M15A-FKS	1490	140	渦輪增壓	FWD	麥花臣	雙A臂	汽油	\N	2025-09-30 14:33:58.583	2025-11-08 23:27:54.793	\N
628	386	606	2006	2011	1AZ-FE	1998	147	自然進氣	FWD	麥花臣	雙連桿	汽油	\N	2025-09-30 14:33:58.586	2025-11-08 23:27:54.793	\N
629	387	607	2012	2017	2AR-FE	2494	181	自然進氣	FWD	麥花臣	雙連桿	汽油	\N	2025-09-30 14:33:58.588	2025-11-08 23:27:54.793	\N
630	388	608	2018	2023	A25A-FXS	2487	178	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	\N	2025-09-30 14:33:58.591	2025-11-08 23:27:54.793	\N
631	389	609	2023	2025	A25A-FXS	2487	222	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	\N	2025-09-30 14:33:58.594	2025-11-08 23:27:54.793	\N
632	390	610	2006	2012	2AZ-FE	2362	170	自然進氣	4WD	麥花臣	雙連桿	汽油	\N	2025-09-30 14:33:58.599	2025-11-08 23:27:54.793	\N
633	391	611	2013	2018	2AR-FE	2494	180	自然進氣	4WD	麥花臣	雙連桿	汽油	\N	2025-09-30 14:33:58.603	2025-11-08 23:27:54.793	\N
634	392	612	2019	2025	A25A-FKS	2487	207	自然進氣	4WD	麥花臣	雙A臂	汽油	\N	2025-09-30 14:33:58.607	2025-11-08 23:27:54.793	\N
635	393	613	2019	2025	A25A-FXS	2487	222	阿特金森循環	E-Four	麥花臣	雙A臂	油電混合	\N	2025-09-30 14:33:58.611	2025-11-08 23:27:54.793	\N
636	394	614	2006	2014	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.615	2025-11-08 23:27:54.793	\N
637	395	615	2014	2020	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.62	2025-11-08 23:27:54.793	\N
638	396	616	2020	2025	M15A-FKS	1490	107	渦輪增壓	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.625	2025-11-08 23:27:54.793	\N
639	397	617	2003	2007	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.629	2025-11-08 23:27:54.793	\N
640	398	618	2008	2013	1NZ-FE	1497	109	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.633	2025-11-08 23:27:54.793	\N
641	399	619	2014	2023	2NR-FE	1496	107	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.636	2025-11-08 23:27:54.793	\N
642	400	620	2023	2025	M15A-FXE	1490	116	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	\N	2025-09-30 14:33:58.638	2025-11-08 23:27:54.793	\N
643	401	621	2009	2015	2ZR-FXE	1798	136	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	\N	2025-09-30 14:33:58.641	2025-11-08 23:27:54.793	\N
644	401	622	2016	2022	2ZR-FXE	1798	122	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	\N	2025-09-30 14:33:58.643	2025-11-08 23:27:54.793	\N
645	402	623	2023	2025	A25A-FXS	2487	223	阿特金森循環	FWD	麥花臣	雙A臂	插電混動	\N	2025-09-30 14:33:58.648	2025-11-08 23:27:54.793	\N
646	403	624	2009	2015	2GR-FE	3456	275	自然進氣	FWD	麥花臣	雙連桿	汽油	\N	2025-09-30 14:33:58.652	2025-11-08 23:27:54.793	\N
647	404	625	2015	2023	2AR-FXE	2494	152	阿特金森循環	4WD	麥花臣	雙連桿	油電混合	\N	2025-09-30 14:33:58.656	2025-11-08 23:27:54.793	\N
648	404	626	2023	2025	A25A-FXS	2487	190	阿特金森循環	4WD	麥花臣	雙連桿	油電混合	\N	2025-09-30 14:33:58.659	2025-11-08 23:27:54.793	\N
649	405	627	2016	2022	2ZR-FE	1798	140	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.663	2025-11-08 23:27:54.793	\N
650	406	628	2022	2025	M18A-FXE	1798	140	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	\N	2025-09-30 14:33:58.668	2025-11-08 23:27:54.793	\N
651	407	629	2020	2025	M20A-FXS	1987	145	阿特金森循環	E-Four	麥花臣	扭力桿	油電混合	\N	2025-09-30 14:33:58.671	2025-11-08 23:27:54.793	\N
652	408	630	2023	2025	M20A-FKS	1987	170	自然進氣	FWD	麥花臣	扭力桿	汽油	\N	2025-09-30 14:33:58.675	2025-11-08 23:27:54.793	\N
653	409	631	2023	2025	A25A-FXS	2487	234	阿特金森循環	E-Four	麥花臣	多連桿	油電混合	\N	2025-09-30 14:33:58.678	2025-11-08 23:27:54.793	\N
654	410	632	2019	2025	1GD-FTV	2755	204	渦輪增壓	4WD	雙A臂	葉片彈簧	柴油	\N	2025-09-30 14:33:58.682	2025-11-08 23:27:54.793	\N
655	411	633	2019	2025	1GD-FTV	2755	176	渦輪增壓	RWD	麥花臣	葉片彈簧	柴油	\N	2025-09-30 14:33:58.686	2025-11-08 23:27:54.793	\N
657	412	635	2017	2023	2ZR-FXE	1798	122	阿特金森循環	FWD	麥花臣	雙A臂	油電混合	\N	2025-09-30 14:33:58.692	2025-11-08 23:27:54.793	\N
658	413	636	2023	2025	M15A-FXE	1490	116	阿特金森循環	FWD	麥花臣	扭力桿	油電混合	\N	2025-09-30 14:33:58.695	2025-11-08 23:27:54.793	\N
659	414	637	2006	2011	R18A1	1799	140	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.701	2025-11-08 23:27:54.793	\N
660	415	638	2006	2011	K20Z3	1998	200	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.704	2025-11-08 23:27:54.793	\N
661	414	639	2012	2016	R18Z1	1798	141	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.706	2025-11-08 23:27:54.793	\N
662	416	640	2012	2016	K20Z3	1998	155	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.709	2025-11-08 23:27:54.793	\N
663	417	641	2016	2021	L15B7	1498	174	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.713	2025-11-08 23:27:54.793	\N
664	418	642	2017	2021	K20C1	1996	306	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.717	2025-11-08 23:27:54.793	\N
665	419	643	2022	2025	LFA1	1993	184	阿特金森循環+電動	前置前驅	麥弗遜	多連桿	油電混合	\N	2025-09-30 14:33:58.72	2025-11-08 23:27:54.793	\N
666	418	644	2023	2025	K20C1	1996	315	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.722	2025-11-08 23:27:54.793	\N
667	420	645	2003	2008	K24A4	2354	190	自然進氣	前置前驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.726	2025-11-08 23:27:54.793	\N
668	420	646	2008	2013	K24Z2	2354	180	自然進氣	前置前驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.728	2025-11-08 23:27:54.793	\N
669	421	647	2008	2013	J35Z2	3471	271	自然進氣	前置前驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.732	2025-11-08 23:27:54.793	\N
670	420	648	2013	2019	K24W1	2356	188	自然進氣	前置前驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.734	2025-11-08 23:27:54.793	\N
671	421	649	2013	2019	J35Y1	3471	276	自然進氣	前置前驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.736	2025-11-08 23:27:54.793	\N
672	422	650	2018	2025	L15BE	1498	192	渦輪增壓	前置前驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.739	2025-11-08 23:27:54.793	\N
673	423	651	2018	2025	LFA1	1993	212	阿特金森循環+電動	前置前驅	麥弗遜	多連桿	油電混合	\N	2025-09-30 14:33:58.743	2025-11-08 23:27:54.793	\N
674	424	652	2007	2011	K24Z1	2354	170	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.746	2025-11-08 23:27:54.793	\N
675	424	653	2012	2016	R24A1	2354	190	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.75	2025-11-08 23:27:54.793	\N
676	425	654	2017	2022	L15BE	1498	193	渦輪增壓	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.753	2025-11-08 23:27:54.793	\N
677	426	655	2023	2025	LFA1	1993	204	阿特金森循環+電動	前置四驅	麥弗遜	多連桿	油電混合	\N	2025-09-30 14:33:58.756	2025-11-08 23:27:54.793	\N
678	427	656	2008	2014	L15A7	1497	120	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.76	2025-11-08 23:27:54.793	\N
679	427	657	2014	2020	L15B1	1497	130	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.762	2025-11-08 23:27:54.793	\N
680	428	658	2020	2025	LFA1	1498	123	阿特金森循環+電動	前置前驅	麥弗遜	扭力梁	油電混合	\N	2025-09-30 14:33:58.766	2025-11-08 23:27:54.793	\N
681	429	659	2015	2021	L18A	1799	143	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.768	2025-11-08 23:27:54.793	\N
682	430	660	2022	2025	L15ZF	1498	131	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.771	2025-11-08 23:27:54.793	\N
683	431	661	2022	2025	L15C	1498	177	渦輪增壓	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.774	2025-11-08 23:27:54.793	\N
684	432	662	2004	2013	K24A	2354	160	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.776	2025-11-08 23:27:54.793	\N
685	432	663	2014	2020	K24W	2354	175	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.777	2025-11-08 23:27:54.793	\N
686	433	664	2021	2025	LFA1	1993	215	阿特金森循環+電動	前置前驅	麥弗遜	扭力梁	油電混合	\N	2025-09-30 14:33:58.781	2025-11-08 23:27:54.793	\N
687	434	665	2008	2014	L15A7	1497	120	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.784	2025-11-08 23:27:54.793	\N
688	434	666	2014	2020	L15B	1497	121	自然進氣	前置前驅	麥弗遜	扭力梁	汽油	\N	2025-09-30 14:33:58.786	2025-11-08 23:27:54.793	\N
689	435	667	2020	2025	LFA1	1498	126	阿特金森循環+電動	前置前驅	麥弗遜	扭力梁	油電混合	\N	2025-09-30 14:33:58.789	2025-11-08 23:27:54.793	\N
691	436	669	2005	2012	J35A	3471	295	自然進氣	前置四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.796	2025-11-08 23:27:54.793	\N
692	437	670	2005	2008	J35A9	3471	244	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.8	2025-11-08 23:27:54.793	\N
693	437	671	2009	2015	J35Z4	3471	250	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.802	2025-11-08 23:27:54.793	\N
694	437	672	2016	2022	J35Y6	3471	280	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.804	2025-11-08 23:27:54.793	\N
695	437	673	2023	2025	J35Y7	3471	285	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.805	2025-11-08 23:27:54.793	\N
696	438	674	2005	2011	K24A4	2354	156	自然進氣	前置四驅	麥弗遜	多連桿	汽油	\N	2025-09-30 14:33:58.809	2025-11-08 23:27:54.793	\N
709	439	687	2006	2013	4GR-FSE	2499	204	自然進氣	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.848	2025-11-08 23:27:54.793	\N
710	440	688	2013	2020	8AR-FTS	2494	245	渦輪增壓	RWD/四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.851	2025-11-08 23:27:54.793	\N
711	441	689	2006	2012	2GR-FE	3456	275	自然進氣	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.855	2025-11-08 23:27:54.793	\N
712	442	690	2012	2018	2AR-FXE+電動	2494	200	自然進氣＋電動	FWD	麥花臣	多連桿	油電混合	\N	2025-09-30 14:33:58.859	2025-11-08 23:27:54.793	\N
713	443	691	2008	2015	2GR-FE	3456	270	自然進氣	四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.863	2025-11-08 23:27:54.793	\N
714	444	692	2015	2022	2GR-FXE+電動	3456	308	自然進氣＋電動	四驅	雙A臂	多連桿	油電混合	\N	2025-09-30 14:33:58.867	2025-11-08 23:27:54.793	\N
715	445	693	2006	2017	UR-Series V8	4608	385	自然進氣	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.87	2025-11-08 23:27:54.793	\N
716	446	694	2017	2023	2UR-FXE+電動	3456	354	自然進氣＋電動	四驅	雙A臂	多連桿	油電混合	\N	2025-09-30 14:33:58.874	2025-11-08 23:27:54.793	\N
717	447	695	2014	2021	2AR-FXE+電動	2494	194	自然進氣＋電動	前驅/四驅	麥花臣	多連桿	油電混合	\N	2025-09-30 14:33:58.877	2025-11-08 23:27:54.793	\N
718	448	696	2021	2025	T24A-FTS	2487	279	渦輪增壓	前驅/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.881	2025-11-08 23:27:54.793	\N
719	449	697	2018	2025	M20A-FKS	1987	171	自然進氣	前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.884	2025-11-08 23:27:54.793	\N
720	450	698	2018	2025	2ZR-FXE+電動	1798	184	自然進氣＋電動	前驅	多連桿	\N	Hybrid Synergy Drive	\N	2025-09-30 14:33:58.888	2025-11-08 23:27:54.793	\N
721	451	699	2017	2025	2UR-GSE	4969	471	自然進氣	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.891	2025-11-08 23:27:54.793	\N
722	452	700	2017	2025	2UR-GSE+電動	3456	359	自然進氣＋電動	RWD	雙A臂	多連桿	油電混合	\N	2025-09-30 14:33:58.895	2025-11-08 23:27:54.793	\N
723	453	701	2013	2019	Skyactiv-G 2.0	1998	155	自然進氣	FWD	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.9	2025-11-08 23:27:54.793	\N
724	453	702	2019	2023	Skyactiv-G 2.0	1998	162	自然進氣	FWD/四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.902	2025-11-08 23:27:54.793	\N
725	454	703	2012	2018	Skyactiv-G 2.5	2488	190	自然進氣	FWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.905	2025-11-08 23:27:54.793	\N
726	454	704	2018	2023	Skyactiv-G 2.5	2488	194	自然進氣	FWD/四驅	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.907	2025-11-08 23:27:54.793	\N
727	455	705	2012	2017	Skyactiv-G 2.0	1998	155	自然進氣	四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.911	2025-11-08 23:27:54.793	\N
728	455	706	2017	2023	Skyactiv-G 2.5	2488	190	自然進氣	四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.912	2025-11-08 23:27:54.793	\N
729	456	707	2019	2023	Skyactiv-G 2.0	1998	156	自然進氣	四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.917	2025-11-08 23:27:54.793	\N
730	457	708	2015	2020	Skyactiv-G 2.0	1998	148	自然進氣	四驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.92	2025-11-08 23:27:54.793	\N
731	458	709	2015	2023	Skyactiv-G 2.0	1998	184	自然進氣	RWD	雙A臂	多連桿	汽油	\N	2025-09-30 14:33:58.923	2025-11-08 23:27:54.793	\N
744	459	722	2006	2011	EJ20	1994	300	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.962	2025-11-08 23:27:54.793	\N
746	460	724	2012	2016	FB20	1995	156	自然進氣	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.967	2025-11-08 23:27:54.793	\N
747	461	725	2008	2013	EJ20	1994	237	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.971	2025-11-08 23:27:54.793	\N
748	462	726	2013	2018	FB20	1995	150	自然進氣	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.974	2025-11-08 23:27:54.793	\N
749	463	727	2018	2022	FB20	1995	156	自然進氣	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.978	2025-11-08 23:27:54.793	\N
750	464	728	2005	2009	EJ20	1994	280	渦輪增壓	四輪驅動	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.981	2025-11-08 23:27:54.793	\N
751	465	729	2009	2014	EJ25	2457	170	自然進氣	四輪驅動	雙叉臂	多連桿	汽油	\N	2025-09-30 14:33:58.984	2025-11-08 23:27:54.793	\N
753	466	731	2012	2020	FA20	1998	200	自然進氣	後輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.989	2025-11-08 23:27:54.793	\N
756	282	732	2018	2020	EA888	\N	\N	\N	\N	\N	\N	gasoline	\N	2025-11-08 17:53:32.173	2025-11-08 17:53:32.173	GTI 2.0T
757	56	733	2013	2017	EA211	\N	\N	\N	\N	\N	\N	gasoline	\N	2025-11-08 17:53:32.215	2025-11-08 17:53:32.215	Golf 1.4 TSI
758	467	734	2017	2020	DAZA	\N	\N	\N	\N	\N	\N	gasoline	\N	2025-11-08 17:53:32.231	2025-11-08 17:53:32.231	RS3 2.5T
759	468	735	2016	2019	B48	\N	\N	\N	\N	\N	\N	gasoline	\N	2025-11-08 17:53:32.242	2025-11-08 17:53:32.242	330i
760	469	736	2019	2020	B58	\N	\N	\N	\N	\N	\N	gasoline	\N	2025-11-08 17:53:32.25	2025-11-08 17:53:32.25	3.0T
548	86	180	2013	2016	9A1 2.7	2706	275	自然進氣	中置後驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.322	2025-11-08 23:27:54.793	\N
379	183	356	2009	2014	 EJ25	2457	170	自然進氣	四輪驅動	雙叉臂	多連桿	汽油	Symmetrical AWD，EyeSight系統	2025-09-16 01:08:48.804767	2025-11-08 23:27:54.793	\N
27	11	24	2020	2023	S58	2993	510	雙渦輪增壓	AWD	雙A臂(M款)	多連桿(M款)	汽油	\N	2025-09-16 01:08:47.623164	2025-11-08 23:27:54.793	\N
86	42	83	2014	2023	EA888	1984	310	渦輪增壓	quattro	麥花臣	四連桿	汽油	虛擬座艙	2025-09-16 01:08:47.820432	2025-11-08 23:27:54.793	\N
92	44	88	2017	2023	EA888 + PHEV	1984	367	渦輪增壓	quattro	雙A臂	雙A臂	插電混動	quattro四驅	2025-09-16 01:08:47.839932	2025-11-08 23:27:54.793	\N
91	44	88	2015	2023	EA897	2967	249	渦輪增壓	quattro	雙A臂	雙A臂	柴油	48V輕油電	2025-09-16 01:08:47.836632	2025-11-08 23:27:54.793	\N
98	48	95	2012	2020	EA888	1984	190	渦輪增壓	quattro	麥花臣	四連桿	汽油	全數位儀表	2025-09-16 01:08:47.859569	2025-11-08 23:27:54.793	\N
99	48	95	2020	2025	EA211 Evo	1498	150	渦輪增壓	FWD	麥花臣	扭力樑	汽油	MMI觸控系統	2025-09-16 01:08:47.862418	2025-11-08 23:27:54.793	\N
546	85	178	2012	2016	9A1 2.7	2706	265	自然進氣	中置後驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.317	2025-11-08 23:27:54.793	\N
541	320	516	2023	2025	DJYA	1498	150	渦輪增壓+輕油電	前置前驅	麥花臣	多連桿	汽油+輕油電	\N	2025-09-30 14:33:58.305	2025-11-08 23:27:54.793	\N
540	321	517	2019	2022	CZEA	999	115	渦輪增壓	前置前驅	麥花臣	多連桿	汽油	\N	2025-09-30 14:33:58.303	2025-11-08 23:27:54.793	\N
745	459	722	2011	2014	EJ25	2457	305	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.964	2025-11-08 23:27:54.793	\N
752	459	722	2014	2021	EJ25	2457	305	渦輪增壓	四輪驅動	雙叉臂	雙叉臂	汽油	\N	2025-09-30 14:33:58.986	2025-11-08 23:27:54.793	\N
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 55, true);


--
-- Name: garage_query_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.garage_query_logs_id_seq', 1, false);


--
-- Name: garages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.garages_id_seq', 1, false);


--
-- Name: generations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.generations_id_seq', 736, true);


--
-- Name: makes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.makes_id_seq', 16, true);


--
-- Name: models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.models_id_seq', 469, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: part_compatibilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.part_compatibilities_id_seq', 1, true);


--
-- Name: parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parts_id_seq', 2, true);


--
-- Name: parts_on_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parts_on_categories_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.vehicle_variants_id_seq', 760, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: garage_query_logs garage_query_logs_garage_id_query_type_reset_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garage_query_logs
    ADD CONSTRAINT garage_query_logs_garage_id_query_type_reset_date_key UNIQUE (garage_id, query_type, reset_date);


--
-- Name: garage_query_logs garage_query_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garage_query_logs
    ADD CONSTRAINT garage_query_logs_pkey PRIMARY KEY (id);


--
-- Name: garages garages_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garages
    ADD CONSTRAINT garages_name_key UNIQUE (name);


--
-- Name: garages garages_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garages
    ADD CONSTRAINT garages_phone_key UNIQUE (phone);


--
-- Name: garages garages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garages
    ADD CONSTRAINT garages_pkey PRIMARY KEY (id);


--
-- Name: garages garages_tax_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garages
    ADD CONSTRAINT garages_tax_id_key UNIQUE (tax_id);


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
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


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
-- Name: parts_on_categories parts_on_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts_on_categories
    ADD CONSTRAINT parts_on_categories_pkey PRIMARY KEY (id);


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
-- Name: vehicle_variants vehicle_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_variants
    ADD CONSTRAINT vehicle_variants_pkey PRIMARY KEY (id);


--
-- Name: categories_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX categories_is_active_idx ON public.categories USING btree (is_active);


--
-- Name: categories_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX categories_parent_id_idx ON public.categories USING btree (parent_id);


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
-- Name: idx_poc_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_poc_category_id ON public.parts_on_categories USING btree (category_id);


--
-- Name: idx_poc_part_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_poc_part_id ON public.parts_on_categories USING btree (part_id);


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
-- Name: parts_on_categories_part_id_category_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX parts_on_categories_part_id_category_id_key ON public.parts_on_categories USING btree (part_id, category_id);


--
-- Name: vehicle_variants_model_id_engine_code_year_from_year_to_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX vehicle_variants_model_id_engine_code_year_from_year_to_key ON public.vehicle_variants USING btree (model_id, engine_code, year_from, year_to);


--
-- Name: parts update_parts_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_parts_timestamp BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: garage_query_logs garage_query_logs_garage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garage_query_logs
    ADD CONSTRAINT garage_query_logs_garage_id_fkey FOREIGN KEY (garage_id) REFERENCES public.garages(id) ON DELETE CASCADE;


--
-- Name: garages garages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.garages
    ADD CONSTRAINT garages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: orders orders_garage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_garage_id_fkey FOREIGN KEY (garage_id) REFERENCES public.garages(id) ON DELETE CASCADE;


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
-- Name: parts_on_categories parts_on_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts_on_categories
    ADD CONSTRAINT parts_on_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: parts_on_categories parts_on_categories_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parts_on_categories
    ADD CONSTRAINT parts_on_categories_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON UPDATE CASCADE ON DELETE CASCADE;


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

\unrestrict 72pM5fMnCU3Qf7Oa5LtAxpmxeRujW8D0RouZK0nRAp0NksWHRSC4q5XKIthHRkH

