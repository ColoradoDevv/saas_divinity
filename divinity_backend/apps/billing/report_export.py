"""
Arma los archivos descargables (Excel/PDF) del reporte completo de Reportes:
histórico diario + ingresos por mes + estado de membresías + asistencia por
día de semana. Un solo lugar para no duplicar el armado de tablas entre los
dos formatos — los datos ya vienen agregados desde apps/billing/views.py y
apps/attendance/views.py, acá solo se presentan.
"""

from io import BytesIO

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

_STATUS_LABELS = [
    ('active', 'Activas'),
    ('expired', 'Vencidas'),
    ('frozen', 'Congeladas'),
    ('cancelled', 'Canceladas'),
]


def build_xlsx_report(*, org_name, currency, date_from, date_to,
                       daily_stats, revenue_by_month, membership_status, weekday_breakdown) -> bytes:
    wb = Workbook()

    ws = wb.active
    ws.title = 'Diario'
    ws.append(['Fecha', f'Ingresos ({currency})', 'Check-ins', 'Miembros nuevos'])
    for row in daily_stats:
        ws.append([row['date'].isoformat(), float(row['revenue']), row['checkins'], row['new_members']])

    ws_month = wb.create_sheet('Ingresos por mes')
    ws_month.append(['Mes', f'Total ({currency})'])
    for row in revenue_by_month:
        ws_month.append([row['month'], float(row['total'])])

    ws_status = wb.create_sheet('Estado de membresías')
    ws_status.append(['Estado', 'Cantidad'])
    for key, label in _STATUS_LABELS:
        ws_status.append([label, membership_status.get(key, 0)])

    ws_weekday = wb.create_sheet('Asistencia por día')
    ws_weekday.append(['Día', 'Check-ins'])
    for row in weekday_breakdown:
        ws_weekday.append([row['label'], row['count']])

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def build_pdf_report(*, org_name, currency, date_from, date_to,
                      daily_stats, revenue_by_month, membership_status, weekday_breakdown) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(f'Reporte — {org_name}', styles['Title']),
        Paragraph(f'Del {date_from.isoformat()} al {date_to.isoformat()}', styles['Normal']),
        Spacer(1, 12),
    ]

    def add_table(title, header, rows):
        elements.append(Paragraph(title, styles['Heading2']))
        table = Table([header] + rows, hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8E8E8')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 16))

    add_table(
        'Histórico diario',
        ['Fecha', f'Ingresos ({currency})', 'Check-ins', 'Miembros nuevos'],
        [[r['date'].isoformat(), f"{r['revenue']:.2f}", str(r['checkins']), str(r['new_members'])] for r in daily_stats],
    )
    add_table(
        'Ingresos por mes',
        ['Mes', f'Total ({currency})'],
        [[r['month'], r['total']] for r in revenue_by_month],
    )
    add_table(
        'Estado de membresías',
        ['Estado', 'Cantidad'],
        [[label, str(membership_status.get(key, 0))] for key, label in _STATUS_LABELS],
    )
    add_table(
        'Asistencia por día de la semana',
        ['Día', 'Check-ins'],
        [[r['label'], str(r['count'])] for r in weekday_breakdown],
    )

    doc.build(elements)
    return buffer.getvalue()
