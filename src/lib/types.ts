export type Role = "mester" | "admin" | "both";
export type ProjectStatus =
  | "kladde"
  | "afventer_godkendelse"
  | "godkendt"
  | "publiceret"
  | "skjult";
export type Category = "facade" | "loft" | "vaeg" | "badevaerelse" | "andet";
export type ImageType = "foer" | "under" | "efter";

export type SessionUser = {
  id: string;
  firma_id: string;
  email: string;
  name: string;
  roles: string[];
};

export type Firm = {
  id: string;
  name: string;
  global_prisjustering_procent: number;
  created_at: string;
};

export type PriceAdjustmentLog = {
  id: string;
  firma_id: string;
  procent: number;
  created_at: string;
};

export type UserRow = {
  id: string;
  firma_id: string;
  email: string;
  password_hash: string;
  name: string;
  roles: string;
};

export type Project = {
  id: string;
  firma_id: string;
  title: string;
  category: Category;
  note: string | null;
  status: ProjectStatus;
  price_from: number | null;
  price_to: number | null;
  scope: string | null;
  year: number | null;
  may_show_public: number;
  show_price_on_site: number;
  reject_note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type ProjectImage = {
  id: string;
  project_id: string;
  type: ImageType;
  path: string;
  width: number | null;
  height: number | null;
  created_by: string;
  created_at: string;
};
