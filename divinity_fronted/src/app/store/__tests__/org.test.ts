import { beforeEach, describe, expect, it } from 'vitest';
import { applyMembership, applyOrgColor, useOrgStore } from '../org';
import type { MembershipResponse } from '@/modules/auth/types/auth';

const org = {
  id: 1, name: 'Org', slug: 'org', plan: 'pro', enabled_modules: ['workers'],
  is_active: true, onboarding_completed: true, primary_color: '#FF0000', logo_url: '',
};

const membership: MembershipResponse = {
  role: 'admin', organization: org, allowed_modules: null, position: null,
};

beforeEach(() => {
  useOrgStore.setState({ organization: null, role: null, allowedModules: null, position: null });
  document.documentElement.style.removeProperty('--color-primary');
});

describe('initial state', () => {
  it('all values are null', () => {
    const s = useOrgStore.getState();
    expect(s.organization).toBeNull();
    expect(s.role).toBeNull();
    expect(s.allowedModules).toBeNull();
    expect(s.position).toBeNull();
  });
});

describe('setOrganization', () => {
  it('sets org, role, allowedModules, and position', () => {
    useOrgStore.getState().setOrganization(org, 'admin', ['workers'], 'Barbero');
    const s = useOrgStore.getState();
    expect(s.organization).toEqual(org);
    expect(s.role).toBe('admin');
    expect(s.allowedModules).toEqual(['workers']);
    expect(s.position).toBe('Barbero');
  });

  it('optional args default to null', () => {
    useOrgStore.getState().setOrganization(org, 'manager');
    const s = useOrgStore.getState();
    expect(s.allowedModules).toBeNull();
    expect(s.position).toBeNull();
  });
});

describe('clearOrganization', () => {
  it('resets all to null', () => {
    useOrgStore.getState().setOrganization(org, 'admin', ['workers'], 'Dev');
    useOrgStore.getState().clearOrganization();
    const s = useOrgStore.getState();
    expect(s.organization).toBeNull();
    expect(s.role).toBeNull();
    expect(s.allowedModules).toBeNull();
    expect(s.position).toBeNull();
  });
});

const HEX = /^#[0-9a-f]{6}$/i;

describe('applyOrgColor', () => {
  it('derives and sets the whole primary family for a valid lowercase hex', () => {
    applyOrgColor('#ff0000', false);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color-primary')).toMatch(HEX);
    expect(style.getPropertyValue('--color-on-primary')).toMatch(HEX);
    expect(style.getPropertyValue('--color-primary-container')).toMatch(HEX);
    expect(style.getPropertyValue('--color-on-primary-container')).toMatch(HEX);
  });

  it('is case-insensitive and produces the same result for uppercase hex', () => {
    applyOrgColor('#ff0000', false);
    const fromLower = document.documentElement.style.getPropertyValue('--color-primary');
    applyOrgColor('#FF0000', false);
    const fromUpper = document.documentElement.style.getPropertyValue('--color-primary');
    expect(fromUpper).toBe(fromLower);
  });

  it('removes css variable for undefined', () => {
    document.documentElement.style.setProperty('--color-primary', '#aabbcc');
    applyOrgColor(undefined);
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });

  it('removes css variable for invalid hex', () => {
    document.documentElement.style.setProperty('--color-primary', '#aabbcc');
    applyOrgColor('not-a-color');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });

  it('removes css variable for short hex', () => {
    applyOrgColor('#FFF');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });
});

describe('applyMembership', () => {
  it('sets organization and applies color with valid membership', () => {
    applyMembership(membership);
    const s = useOrgStore.getState();
    expect(s.organization?.id).toBe(1);
    expect(s.role).toBe('admin');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toMatch(HEX);
  });

  it('passes allowed_modules correctly', () => {
    const staffMembership: MembershipResponse = {
      ...membership, role: 'staff', allowed_modules: ['workers'],
    };
    applyMembership(staffMembership);
    expect(useOrgStore.getState().allowedModules).toEqual(['workers']);
  });

  it('passes null allowed_modules for admin', () => {
    applyMembership(membership);
    expect(useOrgStore.getState().allowedModules).toBeNull();
  });

  it('clears org and removes color when membership is null', () => {
    applyMembership(membership);
    applyMembership(null);
    const s = useOrgStore.getState();
    expect(s.organization).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });
});
