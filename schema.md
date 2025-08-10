-- Table: instructors
CREATE TABLE instructors (
  id UUID PRIMARY KEY,
  name TEXT,
  bio TEXT,
  profile_picture_url TEXT
);

-- Table: class_schedules
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id),
  weekday TEXT,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP
);

-- Table: classes
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  date DATE,
  start_time TIME,
  end_time TIME,
  instructor_id UUID REFERENCES instructors(id),
  location TEXT,
  waitlist_enabled BOOLEAN,
  created_at TIMESTAMP,
  name TEXT,
  is_cancelled BOOLEAN
);

-- Table: static_bikes
CREATE TABLE static_bikes (
  id SERIAL PRIMARY KEY,
  number INTEGER
);

-- Table: bikes
CREATE TABLE bikes (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  static_bike_id INTEGER REFERENCES static_bikes(id)
);

-- Table: packages
CREATE TABLE packages (
  id UUID PRIMARY KEY,
  name TEXT,
  price NUMERIC,
  class_credits INTEGER,
  expiration_days INTEGER,
  created_at TIMESTAMP,
  contifico_product_id TEXT -- id de producto en Contífico (opcional)
);

-- Table: users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMP,
  cedula VARCHAR,
  address TEXT,
  birthday DATE
);

-- Table: purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  package_id UUID REFERENCES packages(id),
  credits_remaining INTEGER,
  purchase_date TIMESTAMP,
  expiration_date TIMESTAMP,
  transaction_id TEXT,
  authorization_code TEXT
);

-- Table: reservations
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP,
  status TEXT,
  from_purchase_id UUID REFERENCES purchases(id)
);

-- Table: reservation_bikes
CREATE TABLE reservation_bikes (
  id UUID PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id),
  bike_id UUID REFERENCES bikes(id)
);

-- Table: invoices (para facturación Contífico)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id),
  user_id UUID REFERENCES users(id),
  package_id UUID REFERENCES packages(id),
  package_name TEXT,
  package_price NUMERIC,
  quantity INTEGER,
  iva_percentage NUMERIC, -- 0.12 por ejemplo
  subtotal NUMERIC,
  iva_amount NUMERIC,
  total NUMERIC,
  status TEXT, -- Draft | Draft-Incomplete | Sent
  contifico_id TEXT,
  contifico_error TEXT,
  document_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_cedula TEXT,
  missing_fields JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
