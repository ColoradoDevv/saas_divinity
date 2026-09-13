from datetime import date

import pytest

from domain.billing.duration import add_duration


class TestAddDuration:
    def test_days(self):
        assert add_duration(date(2026, 1, 1), 10, 'day') == date(2026, 1, 11)

    def test_weeks(self):
        assert add_duration(date(2026, 1, 1), 2, 'week') == date(2026, 1, 15)

    def test_months_simple(self):
        assert add_duration(date(2026, 1, 15), 1, 'month') == date(2026, 2, 15)

    def test_months_clamps_to_shorter_month(self):
        # 31 de enero + 1 mes -> 28 de febrero (2026 no es bisiesto)
        assert add_duration(date(2026, 1, 31), 1, 'month') == date(2026, 2, 28)

    def test_months_crosses_year_boundary(self):
        assert add_duration(date(2026, 12, 15), 1, 'month') == date(2027, 1, 15)

    def test_years(self):
        assert add_duration(date(2026, 3, 10), 1, 'year') == date(2027, 3, 10)

    def test_leap_year_day_clamped(self):
        # 29 de febrero de un bisiesto + 1 año -> 28 de febrero (no bisiesto)
        assert add_duration(date(2028, 2, 29), 1, 'year') == date(2029, 2, 28)

    def test_invalid_unit_raises(self):
        with pytest.raises(ValueError):
            add_duration(date(2026, 1, 1), 1, 'fortnight')
