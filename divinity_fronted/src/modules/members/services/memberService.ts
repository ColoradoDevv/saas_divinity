import { api } from '@/shared/api/api';
import type {
  CreateCustomFieldData,
  CreateMemberData,
  CustomField,
  FieldConfig,
  Member,
  MembersListResponse,
  UpdateCustomFieldData,
  UpdateMemberData,
} from '../types';

export const memberService = {
  async getMembers(page = 1, search = '', status = ''): Promise<MembersListResponse> {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const response = await api.get(`/members/?${params.toString()}`);
    return response.data;
  },

  async getMember(id: number): Promise<Member> {
    const response = await api.get(`/members/${id}/`);
    return response.data;
  },

  async createMember(data: CreateMemberData): Promise<Member> {
    const response = await api.post('/members/', data);
    return response.data;
  },

  async updateMember(id: number, data: UpdateMemberData): Promise<Member> {
    const response = await api.patch(`/members/${id}/`, data);
    return response.data;
  },

  async deactivateMember(id: number): Promise<void> {
    await api.delete(`/members/${id}/`);
  },

  async getFieldConfig(): Promise<FieldConfig[]> {
    const response = await api.get('/members/field-config/');
    return response.data;
  },

  async updateFieldConfigBulk(configs: FieldConfig[]): Promise<FieldConfig[]> {
    const response = await api.post('/members/field-config/bulk/', configs);
    return response.data;
  },

  async getCustomFields(): Promise<CustomField[]> {
    const response = await api.get('/members/custom-fields/');
    return response.data;
  },

  async createCustomField(data: CreateCustomFieldData): Promise<CustomField> {
    const response = await api.post('/members/custom-fields/', data);
    return response.data;
  },

  async updateCustomField(id: number, data: UpdateCustomFieldData): Promise<CustomField> {
    const response = await api.patch(`/members/custom-fields/${id}/`, data);
    return response.data;
  },

  async deleteCustomField(id: number): Promise<void> {
    await api.delete(`/members/custom-fields/${id}/`);
  },
};
