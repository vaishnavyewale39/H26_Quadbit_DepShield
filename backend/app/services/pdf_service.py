import os
import io
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.schemas.models import RepoAnalysis, RepoComparison

# Exact Color Hunt Palette (#092635, #1B4242, #5C8374, #9EC8B9)
TEXT_DARK = colors.HexColor("#092635")
TEAL_DARK = colors.HexColor("#1B4242")
TEAL_ACCENT = colors.HexColor("#5C8374")
MINT_PRIMARY = colors.HexColor("#9EC8B9")
MINT_LIGHT = colors.HexColor("#F0F7F4")
BORDER_TEAL = colors.HexColor("#A8CCC1")
WHITE = colors.HexColor("#FFFFFF")

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add accurate running headers and 'Page X of Y' footers.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(TEAL_DARK)
            self.drawString(54, 11 * inch - 36, "DepShield — Dependency Resilience Assessment")
            self.setFont("Helvetica", 8)
            self.setFillColor(TEAL_ACCENT)
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "AI Dependency Resilience Platform")
            self.setStrokeColor(BORDER_TEAL)
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Bottom Footer (all pages)
        self.setStrokeColor(BORDER_TEAL)
        self.setLineWidth(0.5)
        self.line(54, 45, 8.5 * inch - 54, 45)

        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_DARK)
        self.drawString(54, 32, "DepShield — Automated Dependency Resilience Assessment Report")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)
        self.restoreState()


class PDFService:
    def generate_resilience_report(self, analysis: RepoAnalysis, comparison: RepoComparison) -> Path:
        pdf_filename = f"DepShield_Report_{analysis.analysis_id}.pdf"
        output_path = settings.REPORT_DIR / pdf_filename

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()

        # Custom Typography matching clean sans-serif Roboto style
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=TEAL_DARK,
            spaceAfter=3
        )

        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            textColor=TEAL_ACCENT,
            spaceAfter=12
        )

        h1_style = ParagraphStyle(
            'Heading1_Custom',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=TEAL_DARK,
            spaceBefore=10,
            spaceAfter=5,
            keepWithNext=True
        )

        h2_style = ParagraphStyle(
            'Heading2_Custom',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=TEAL_ACCENT,
            spaceBefore=8,
            spaceAfter=3,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'Body_Custom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=TEXT_DARK,
            spaceAfter=5
        )

        callout_style = ParagraphStyle(
            'Callout_Custom',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=11.5,
            textColor=TEXT_DARK
        )

        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10.5,
            textColor=WHITE
        )

        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=10,
            textColor=TEXT_DARK
        )

        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7.5,
            leading=10,
            textColor=TEXT_DARK
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("DepShield", title_style))
        story.append(Paragraph("AI Dependency Resilience Engine — Before vs After Repository Assessment", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=TEAL_DARK, spaceAfter=10))

        # Metadata Block Table
        meta_data = [
            [
                Paragraph("<b>Repository:</b>", table_cell_bold),
                Paragraph(analysis.repo_url, table_cell_style),
                Paragraph("<b>Audit Date:</b>", table_cell_bold),
                Paragraph(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), table_cell_style)
            ],
            [
                Paragraph("<b>Commit Hash:</b>", table_cell_bold),
                Paragraph(f"<code>{analysis.commit_hash[:10]}</code> ({analysis.branch})", table_cell_style),
                Paragraph("<b>Ecosystem:</b>", table_cell_bold),
                Paragraph(analysis.ecosystem.capitalize(), table_cell_style)
            ],
            [
                Paragraph("<b>Manifests Discovered:</b>", table_cell_bold),
                Paragraph(", ".join(analysis.discovered_manifests) or "None", table_cell_style),
                Paragraph("<b>Total Packages:</b>", table_cell_bold),
                Paragraph(str(analysis.total_dependencies), table_cell_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.2 * inch, 2.2 * inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), MINT_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # 2. Executive Summary
        story.append(Paragraph("1. Executive Summary", h1_style))
        clean_gemma_summary = comparison.gemma_summary.replace("### ", "").replace("**", "")
        for p_text in clean_gemma_summary.split("\n\n"):
            if p_text.strip():
                story.append(Paragraph(p_text.strip(), body_style))
        story.append(Spacer(1, 8))

        # 3. Before vs After Comparison Table
        story.append(Paragraph("2. Before vs Proposed After Comparison Table", h1_style))
        story.append(Paragraph("Empirical metrics comparing original repository baseline against proposed resilient configuration:", body_style))

        cmp_headers = [
            Paragraph("Metric", table_header_style),
            Paragraph("Before State", table_header_style),
            Paragraph("Proposed After", table_header_style),
            Paragraph("Net Change", table_header_style),
            Paragraph("Evaluation Methodology", table_header_style)
        ]
        cmp_rows = [cmp_headers]
        for m in comparison.metrics:
            cmp_rows.append([
                Paragraph(m.metric, table_cell_bold),
                Paragraph(m.before, table_cell_style),
                Paragraph(m.after, table_cell_style),
                Paragraph(f"<b>{m.change}</b>", table_cell_style),
                Paragraph(m.explanation, table_cell_style)
            ])

        cmp_table = Table(cmp_rows, colWidths=[1.5 * inch, 1.2 * inch, 1.3 * inch, 1.0 * inch, 2.0 * inch])
        cmp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), TEAL_DARK),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, MINT_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))
        story.append(cmp_table)
        story.append(Spacer(1, 12))

        # 4. Dependency Inventory & Risk Findings
        story.append(Paragraph("3. Audited Dependency Inventory & Identified Risks", h1_style))
        inv_headers = [
            Paragraph("Package Name", table_header_style),
            Paragraph("Declared Spec", table_header_style),
            Paragraph("Imports", table_header_style),
            Paragraph("Risk Tier", table_header_style),
            Paragraph("Primary Finding & Evidence", table_header_style)
        ]
        inv_rows = [inv_headers]
        for dep in analysis.dependencies[:15]:
            findings_summary = dep.risk_findings[0].title if dep.risk_findings else "Clean - passed baseline checks."
            inv_rows.append([
                Paragraph(f"<b>{dep.name}</b>", table_cell_bold),
                Paragraph(dep.declared_version, table_cell_style),
                Paragraph(str(dep.usage_count), table_cell_style),
                Paragraph(dep.risk_level.upper(), table_cell_bold),
                Paragraph(findings_summary, table_cell_style)
            ])

        inv_table = Table(inv_rows, colWidths=[1.5 * inch, 1.1 * inch, 0.7 * inch, 1.1 * inch, 2.6 * inch])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), TEAL_ACCENT),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, MINT_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))
        story.append(inv_table)
        story.append(Spacer(1, 12))

        # 5. Migration Candidates & Verification
        story.append(Paragraph("4. Proposed Modernization Candidates & Verification Results", h1_style))
        if comparison.candidates:
            for cand in comparison.candidates:
                cand_table_data = [
                    [
                        Paragraph(f"<b>Candidate:</b> {cand.package_name} &rarr; {cand.proposed_replacement}", table_cell_bold),
                        Paragraph(f"<b>Status:</b> {cand.status}", table_cell_bold)
                    ],
                    [
                        Paragraph(f"<b>Concern:</b> {cand.identified_concern}", table_cell_style),
                        Paragraph(f"<b>Usage Sites:</b> {cand.usage_count} import sites discovered", table_cell_style)
                    ],
                    [
                        Paragraph(f"<b>Baseline Check:</b> {cand.baseline_check_result}", table_cell_style),
                        Paragraph(f"<b>Sandbox Test:</b> {cand.replacement_check_result}", table_cell_style)
                    ],
                    [
                        Paragraph(f"<b>Manifest Diff:</b><br/><code>{cand.required_manifest_change.replace(chr(10), '<br/>')}</code>", table_cell_style),
                        Paragraph(f"<b>Compatibility:</b> {cand.compatibility_gap}", table_cell_style)
                    ]
                ]
                cand_t = Table(cand_table_data, colWidths=[3.5 * inch, 3.5 * inch])
                cand_t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), MINT_LIGHT),
                    ('BOX', (0, 0), (-1, -1), 0.5, TEAL_ACCENT),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_TEAL),
                    ('TOPPADDING', (0, 0), (-1, -1), 3.5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
                ]))
                story.append(KeepTogether([cand_t, Spacer(1, 6)]))
        else:
            story.append(Paragraph("No critical dependency replacements required. Repository dependencies satisfy baseline resilience standards.", body_style))

        story.append(Spacer(1, 12))

        # 6. Governance & Limitations Notice
        story.append(Paragraph("5. Governance & Limitations Notice", h1_style))
        disclaimer_text = (
            "<b>Notice Regarding Recommendations:</b> All replacement recommendations and documentation enhancements "
            "are generated using repository evidence. Recommendations labeled 'Proposed' have been checked for "
            "manifest syntax and isolated import compatibility. Human review and continuous integration test suite runs are required "
            "prior to production deployment. DepShield does not alter upstream repositories automatically."
        )
        disc_table = Table([[Paragraph(disclaimer_text, callout_style)]], colWidths=[7.0 * inch])
        disc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), MINT_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, TEAL_ACCENT),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(disc_table)

        # Build document with custom canvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return output_path

pdf_service = PDFService()
