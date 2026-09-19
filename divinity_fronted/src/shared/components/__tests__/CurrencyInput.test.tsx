import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useOrgStore } from '@/app/store/org';
import { CurrencyInput } from '../CurrencyInput';

/** Wrapper controlado — para que cada tecla simulada se refleje en el value real, como en el uso real. */
const ControlledCurrencyInput = () => {
  const [value, setValue] = useState('');
  return <CurrencyInput value={value} onChange={setValue} />;
};

const resetOrgStore = () => useOrgStore.setState({ organization: null });

describe('CurrencyInput', () => {
  beforeEach(resetOrgStore);
  afterEach(resetOrgStore);

  it('defaults to COP grouping (thousands dot, no decimals) with no org set', () => {
    render(<CurrencyInput value="1234567" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('1.234.567');
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('uses the current organization currency when no explicit currency prop is given', () => {
    useOrgStore.setState({ organization: { currency: 'USD' } as never });
    render(<CurrencyInput value="1234567.5" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('1.234.567,5');
    expect(screen.getByText('US$')).toBeInTheDocument();
  });

  it('an explicit currency prop overrides the organization currency', () => {
    useOrgStore.setState({ organization: { currency: 'USD' } as never });
    render(<CurrencyInput value="1234567" onChange={() => {}} currency="COP" />);
    expect(screen.getByRole('textbox')).toHaveValue('1.234.567');
  });

  it('shows the raw value while focused, and the grouped value once blurred', async () => {
    const user = userEvent.setup();
    render(<CurrencyInput value="1234567" onChange={() => {}} />);
    const input = screen.getByRole('textbox');

    expect(input).toHaveValue('1.234.567');
    await user.click(input);
    expect(input).toHaveValue('1234567');
    await user.tab();
    expect(input).toHaveValue('1.234.567');
  });

  it('strips non-digit characters and collapses extra dots as the user types', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, 'a1b2.c3.4');

    expect(input).toHaveValue('12.34');
  });

  it('renders an empty field for an empty value instead of "0" or "NaN"', () => {
    render(<CurrencyInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});
