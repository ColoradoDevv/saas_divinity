export type MemberStatus = 'active' | 'inactive' | 'suspended';
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface Member {
  id: number;
  organization_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  created_by_id: number | null;
  standard_fields: Record<string, string>;
  custom_fields: Record<string, string>;
}

export interface FieldConfig {
  field_name: string;
  is_enabled: boolean;
  is_required: boolean;
  label: string;
}

export interface CustomField {
  id: number;
  name: string;
  label: string;
  field_type: FieldType;
  options: string[] | null;
  is_required: boolean;
  is_enabled: boolean;
  order: number;
}

export interface MembersListResponse {
  count: number;
  page: number;
  results: Member[];
}

export interface CreateMemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  standard_fields?: Record<string, string>;
  custom_fields?: Record<string, string>;
}

export type UpdateMemberData = Partial<CreateMemberData>;

export interface CreateCustomFieldData {
  name: string;
  label: string;
  field_type: FieldType;
  options?: string[] | null;
  is_required?: boolean;
  is_enabled?: boolean;
  order?: number;
}

export type UpdateCustomFieldData = Partial<Omit<CreateCustomFieldData, 'name'>>;
