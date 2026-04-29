-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(50) PRIMARY KEY,
  company_name  VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  address       TEXT,
  tax_code      VARCHAR(20),
  source        ENUM('zalo','email','referral','facebook','other') DEFAULT 'other',
  note          TEXT,
  created_by    VARCHAR(50),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id                VARCHAR(50) PRIMARY KEY,
  quote_number      VARCHAR(50) UNIQUE NOT NULL,
  customer_id       VARCHAR(50) NOT NULL,
  project_name      VARCHAR(500) NOT NULL,
  quantity_desc     VARCHAR(255),
  
  -- Financials
  subtotal          DECIMAL(18,2) DEFAULT 0,
  discount_percent  DECIMAL(5,2) DEFAULT 0,
  discount_amount   DECIMAL(18,2) DEFAULT 0,
  vat_percent       DECIMAL(5,2) DEFAULT 10,
  vat_amount        DECIMAL(18,2) DEFAULT 0,
  total_amount      DECIMAL(18,2) DEFAULT 0,
  
  -- Internal Cost (hidden from sales)
  internal_cost     DECIMAL(18,2) DEFAULT 0,
  margin_percent    DECIMAL(5,2) DEFAULT 0,
  
  -- Terms
  payment_terms     ENUM('50_50','30_70','100_advance','cod') DEFAULT '50_50',
  delivery_days     INT DEFAULT 30,
  valid_until       DATE,
  note              TEXT,
  
  -- Status
  status            ENUM('DRAFT','PENDING_APPROVAL','SENT','APPROVED','REJECTED','EXPIRED','CONVERTED') DEFAULT 'DRAFT',
  
  -- Metadata
  created_by        VARCHAR(50),
  approved_by       VARCHAR(50),
  approved_at       TIMESTAMP NULL,
  sent_at           TIMESTAMP NULL,
  converted_at      TIMESTAMP NULL,
  project_id        VARCHAR(50) NULL,
  
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
  id              VARCHAR(50) PRIMARY KEY,
  quotation_id    VARCHAR(50) NOT NULL,
  
  -- Grouping
  group_name      VARCHAR(100),
  group_order     INT DEFAULT 0,
  
  -- Item details
  item_order      INT DEFAULT 0,
  description     TEXT NOT NULL,
  item_type       ENUM('labor','material','outsource','service','delivery') NOT NULL,
  
  quantity        DECIMAL(10,2) DEFAULT 1,
  unit            VARCHAR(50),
  unit_price      DECIMAL(18,2) DEFAULT 0,
  total_price     DECIMAL(18,2) DEFAULT 0,
  
  category_id     VARCHAR(50) NULL,
  
  note            TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

-- Quotation Activities Table
CREATE TABLE IF NOT EXISTS quotation_activities (
  id              VARCHAR(50) PRIMARY KEY,
  quotation_id    VARCHAR(50) NOT NULL,
  user_id         VARCHAR(50),
  action          ENUM('created','updated','submitted','sent','approved','rejected','converted','viewed'),
  description     TEXT,
  metadata        JSON NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);
