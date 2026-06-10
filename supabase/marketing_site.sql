-- Page content CMS
CREATE TABLE IF NOT EXISTS page_content (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  page text NOT NULL,
  key text NOT NULL,
  value text,
  sort_order int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, key)
);

-- FAQ
CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contact settings (single row)
CREATE TABLE IF NOT EXISTS contact_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone text DEFAULT '',
  email text DEFAULT '',
  hours text DEFAULT 'ימים א''–ה'', 09:00–18:00',
  updated_at timestamptz DEFAULT now()
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  phone text,
  email text,
  subject text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
