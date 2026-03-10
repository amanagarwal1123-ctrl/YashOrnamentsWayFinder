"""
Tutorial PDF generator for Yash Ornaments WayFinder.
Produces a bilingual (English + Hindi) PDF guide with embedded screenshots.
"""
import io
import os
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
    Table, TableStyle, PageBreak, KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Hindi-capable fonts
_FONT = '/usr/share/fonts/truetype/freefont/FreeSans.ttf'
_FONT_BOLD = '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'
pdfmetrics.registerFont(TTFont('FreeSans', _FONT))
pdfmetrics.registerFont(TTFont('FreeSansBold', _FONT_BOLD))

ASSETS = Path(__file__).parent / 'media' / 'tutorial_assets'

BRAND = HexColor('#C8A24A')
DARK = HexColor('#1a1a1a')
LIGHT_BG = HexColor('#FAFAF5')
MUTED = HexColor('#666666')

# ── Styles ──
def _styles():
    return {
        'title': ParagraphStyle('Title', fontName='FreeSansBold', fontSize=22, leading=28, textColor=DARK, spaceAfter=4),
        'subtitle': ParagraphStyle('Sub', fontName='FreeSans', fontSize=12, leading=16, textColor=MUTED, spaceAfter=14),
        'h1': ParagraphStyle('H1', fontName='FreeSansBold', fontSize=16, leading=22, textColor=DARK, spaceBefore=18, spaceAfter=6),
        'h2': ParagraphStyle('H2', fontName='FreeSansBold', fontSize=13, leading=18, textColor=HexColor('#333'), spaceBefore=12, spaceAfter=4),
        'body': ParagraphStyle('Body', fontName='FreeSans', fontSize=10, leading=15, textColor=DARK, spaceAfter=6),
        'body_hi': ParagraphStyle('BodyHi', fontName='FreeSans', fontSize=10, leading=16, textColor=HexColor('#444'), spaceAfter=6),
        'bullet': ParagraphStyle('Bullet', fontName='FreeSans', fontSize=10, leading=14, textColor=DARK, leftIndent=16, spaceAfter=3, bulletIndent=4),
        'note': ParagraphStyle('Note', fontName='FreeSans', fontSize=9, leading=13, textColor=HexColor('#8B6914'), backColor=HexColor('#FFF8E1'), borderPadding=6, spaceAfter=8),
        'caption': ParagraphStyle('Cap', fontName='FreeSans', fontSize=8, leading=11, textColor=MUTED, alignment=1, spaceAfter=10),
        'footer': ParagraphStyle('Foot', fontName='FreeSans', fontSize=7, leading=10, textColor=MUTED, alignment=1),
    }


def _img(name, width=160*mm):
    """Return an RLImage if the file exists, else a placeholder paragraph."""
    p = ASSETS / name
    if p.exists():
        return RLImage(str(p), width=width, height=width * 0.625, kind='proportional')
    return Paragraph(f'[Screenshot: {name}]', _styles()['caption'])


def _section(s, en_title, hi_title):
    """Bilingual section heading."""
    return Paragraph(f'{en_title} / {hi_title}', s['h1'])


def _bilingual(s, en, hi):
    """Return a list of [english paragraph, hindi paragraph]."""
    return [Paragraph(en, s['body']), Paragraph(hi, s['body_hi'])]


def build_tutorial_pdf() -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=15*mm, leftMargin=18*mm, rightMargin=18*mm)
    s = _styles()
    story = []

    # ══════ COVER ══════
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph('Yash Ornaments WayFinder', s['title']))
    story.append(Paragraph('Complete App Tutorial / \u0938\u0902\u092A\u0942\u0930\u094D\u0923 \u0910\u092A \u091F\u094D\u092F\u0942\u091F\u094B\u0930\u093F\u092F\u0932', s['subtitle']))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        'This guide explains every feature of the Yash Ornaments WayFinder app '
        'in simple language (like explaining to a 5-year-old!). '
        'It covers what the app does, how different users work with it, '
        'how to add routes, upload photos, and test for bugs.',
        s['body']))
    story.append(Paragraph(
        '\u092F\u0939 \u0917\u093E\u0907\u0921 \u092F\u0936 \u0911\u0930\u094D\u0928\u093E\u092E\u0947\u0902\u091F\u094D\u0938 \u0935\u0947\u092B\u093E\u0907\u0902\u0921\u0930 \u0910\u092A \u0915\u0940 \u0939\u0930 \u0938\u0941\u0935\u093F\u0927\u093E \u0906\u0938\u093E\u0928 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u0938\u092E\u091D\u093E\u0924\u0940 \u0939\u0948\u0964 '
        '\u0907\u0938\u092E\u0947\u0902 \u092C\u0924\u093E\u092F\u093E \u0917\u092F\u093E \u0939\u0948 \u0915\u093F \u0910\u092A \u0915\u094D\u092F\u093E \u0915\u0930\u0924\u093E \u0939\u0948, \u0930\u0942\u091F \u0915\u0948\u0938\u0947 \u092C\u0928\u093E\u090F\u0902, \u092B\u094B\u091F\u094B \u0915\u0948\u0938\u0947 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902, \u0914\u0930 \u092C\u0917 \u0915\u0948\u0938\u0947 \u091F\u0947\u0938\u094D\u091F \u0915\u0930\u0947\u0902\u0964',
        s['body_hi']))
    story.append(Spacer(1, 8*mm))
    story.append(_img('07_schematic_map.png', width=140*mm))
    story.append(Paragraph('The Schematic Route Map / \u0938\u094D\u0915\u0940\u092E\u0948\u091F\u093F\u0915 \u0930\u0942\u091F \u092E\u0948\u092A', s['caption']))
    story.append(PageBreak())

    # ══════ TABLE OF CONTENTS ══════
    story.append(Paragraph('Table of Contents / \u0935\u093F\u0937\u092F-\u0938\u0942\u091A\u0940', s['h1']))
    toc_items = [
        '1. What is this App? / \u092F\u0939 \u0910\u092A \u0915\u094D\u092F\u093E \u0939\u0948?',
        '2. User Roles / \u092F\u0942\u091C\u093C\u0930 \u092D\u0942\u092E\u093F\u0915\u093E\u090F\u0902',
        '3. How to Login / \u0932\u0949\u0917\u093F\u0928 \u0915\u0948\u0938\u0947 \u0915\u0930\u0947\u0902',
        '4. Admin Dashboard / \u090F\u0921\u092E\u093F\u0928 \u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921',
        '5. Adding Routes / \u0930\u0942\u091F \u0915\u0948\u0938\u0947 \u091C\u094B\u0921\u093C\u0947\u0902',
        '6. Adding Checkpoints / \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u0915\u0948\u0938\u0947 \u091C\u094B\u0921\u093C\u0947\u0902',
        '7. Uploading Photos & Videos / \u092B\u094B\u091F\u094B/\u0935\u0940\u0921\u093F\u092F\u094B \u0905\u092A\u0932\u094B\u0921',
        '8. Media Library / \u092E\u0940\u0921\u093F\u092F\u093E \u0932\u093E\u0907\u092C\u094D\u0930\u0947\u0930\u0940',
        '9. Schematic Map / \u0938\u094D\u0915\u0940\u092E\u0948\u091F\u093F\u0915 \u092E\u0948\u092A',
        '10. Customer Flow / \u0917\u094D\u0930\u093E\u0939\u0915 \u092A\u094D\u0930\u0935\u093E\u0939',
        '11. Testing for Bugs / \u092C\u0917 \u091F\u0947\u0938\u094D\u091F\u093F\u0902\u0917',
        '12. Quick Reference / \u0924\u094D\u0935\u0930\u093F\u0924 \u0938\u0902\u0926\u0930\u094D\u092D',
    ]
    for item in toc_items:
        story.append(Paragraph(item, s['bullet']))
    story.append(PageBreak())

    # ══════ 1. WHAT IS THIS APP ══════
    story.append(_section(s, '1. What is this App?', '\u092F\u0939 \u0910\u092A \u0915\u094D\u092F\u093E \u0939\u0948?'))
    story += _bilingual(s,
        'Imagine you are visiting a jewellery shop in Chandni Chowk, Delhi. '
        'The lanes are narrow, crowded, and confusing. This app is like a friendly guide '
        'that holds your hand and says "turn left here", "go straight", "look for the blue shop" '
        'until you reach Yash Ornaments on the 5th floor of Yash Complex.',
        '\u0938\u094B\u091A\u093F\u090F \u0906\u092A \u091A\u093E\u0901\u0926\u0928\u0940 \u091A\u094C\u0915, \u0926\u093F\u0932\u094D\u0932\u0940 \u092E\u0947\u0902 \u090F\u0915 \u091C\u094D\u0935\u0947\u0932\u0930\u0940 \u0926\u0941\u0915\u093E\u0928 \u091C\u093E \u0930\u0939\u0947 \u0939\u0948\u0902\u0964 '
        '\u0917\u0932\u093F\u092F\u093E\u0901 \u0924\u0902\u0917, \u092D\u0940\u0921\u093C \u0914\u0930 \u0909\u0932\u091D\u0928 \u092D\u0930\u0940 \u0939\u0948\u0902\u0964 \u092F\u0939 \u0910\u092A \u090F\u0915 \u0926\u094B\u0938\u094D\u0924 \u0915\u0940 \u0924\u0930\u0939 \u0939\u0948 '
        '\u091C\u094B \u0906\u092A\u0915\u093E \u0939\u093E\u0925 \u092A\u0915\u0921\u093C\u0924\u093E \u0939\u0948 \u0914\u0930 \u0915\u0939\u0924\u093E \u0939\u0948 "\u092F\u0939\u093E\u0901 \u092C\u093E\u090F\u0901 \u092E\u0941\u0921\u093C\u094B", "\u0938\u0940\u0927\u0947 \u091C\u093E\u0913", '
        '"\u0928\u0940\u0932\u0940 \u0926\u0941\u0915\u093E\u0928 \u0926\u0947\u0916\u094B" \u2014 \u091C\u092C \u0924\u0915 \u0906\u092A \u092F\u0936 \u0915\u0949\u092E\u094D\u092A\u094D\u0932\u0947\u0915\u094D\u0938 \u0915\u0940 5\u0935\u0940\u0902 \u092E\u0902\u091C\u093C\u093F\u0932 \u092A\u0930 \u092F\u0936 \u0911\u0930\u094D\u0928\u093E\u092E\u0947\u0902\u091F\u094D\u0938 \u0928\u0939\u0940\u0902 \u092A\u0939\u0941\u0901\u091A \u091C\u093E\u0924\u0947\u0964')
    story.append(_img('09_landing.png', width=120*mm))
    story.append(Paragraph('The app landing page / \u0910\u092A \u0915\u093E \u0932\u0948\u0902\u0921\u093F\u0902\u0917 \u092A\u0947\u091C', s['caption']))

    story.append(Paragraph('<b>Key features / \u092E\u0941\u0916\u094D\u092F \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0901:</b>', s['body']))
    features = [
        ('6 origin routes', '6 \u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u0930\u093E\u0938\u094D\u0924\u0947', 'Metro, Red Fort, Omaxe, Gurudwara, Town Hall, Building Entrance'),
        ('Step-by-step guidance', '\u0915\u0926\u092E-\u0926\u0930-\u0915\u0926\u092E \u092E\u093E\u0930\u094D\u0917\u0926\u0930\u094D\u0936\u0928', 'Photos, videos, arrows at each checkpoint'),
        ('Schematic map', '\u0938\u094D\u0915\u0940\u092E\u0948\u091F\u093F\u0915 \u092E\u0948\u092A', 'See all routes on a metro-style map'),
        ('Help system', '\u0938\u0939\u093E\u092F\u0924\u093E \u092A\u094D\u0930\u0923\u093E\u0932\u0940', 'Request callback or share location'),
        ('Admin CMS', '\u090F\u0921\u092E\u093F\u0928 \u0938\u0940\u090F\u092E\u090F\u0938', 'Full route/checkpoint management'),
    ]
    for en, hi, detail in features:
        story.append(Paragraph(f'  * <b>{en}</b> / {hi} \u2014 {detail}', s['bullet']))
    story.append(PageBreak())

    # ══════ 2. USER ROLES ══════
    story.append(_section(s, '2. User Roles', '\u092F\u0942\u091C\u093C\u0930 \u092D\u0942\u092E\u093F\u0915\u093E\u090F\u0902'))
    story += _bilingual(s,
        'Think of it like a school. There is the Principal (Admin), the Teacher (Trainer), '
        'and the Helper (Helpdesk). Each person can do different things.',
        '\u0907\u0938\u0947 \u090F\u0915 \u0938\u094D\u0915\u0942\u0932 \u0915\u0940 \u0924\u0930\u0939 \u0938\u092E\u091D\u093F\u090F\u0964 \u092A\u094D\u0930\u093F\u0902\u0938\u093F\u092A\u0932 (\u090F\u0921\u092E\u093F\u0928), \u091F\u0940\u091A\u0930 (\u091F\u094D\u0930\u0947\u0928\u0930) \u0914\u0930 \u0939\u0947\u0932\u094D\u092A\u0930 (\u0939\u0947\u0932\u094D\u092A\u0921\u0947\u0938\u094D\u0915)\u0964')

    role_data = [
        ['Role / \u092D\u0942\u092E\u093F\u0915\u093E', 'Can Do / \u0915\u094D\u092F\u093E \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902', 'Cannot Do / \u0915\u094D\u092F\u093E \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u0924\u0947'],
        ['Admin\n\u090F\u0921\u092E\u093F\u0928', 'Everything!\nRoutes, users, media, settings,\ndelete, publish, analytics', '-'],
        ['Trainer\n\u091F\u094D\u0930\u0947\u0928\u0930', 'Create/edit routes & checkpoints\nUpload photos & videos\nImport/export routes', 'Cannot delete routes\nCannot delete media\nCannot manage users'],
        ['Helpdesk\n\u0939\u0947\u0932\u094D\u092A\u0921\u0947\u0938\u094D\u0915', 'View helpdesk cases\nHandle callbacks\nGuide lost customers', 'Cannot access admin panel\nCannot change routes\nCannot upload media'],
    ]
    t = Table(role_data, colWidths=[35*mm, 65*mm, 60*mm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'FreeSansBold'),
        ('FONTNAME', (0, 1), (-1, -1), 'FreeSans'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('LEADING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 0), (-1, 0), BRAND),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#ddd')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ══════ 3. HOW TO LOGIN ══════
    story.append(_section(s, '3. How to Login', '\u0932\u0949\u0917\u093F\u0928 \u0915\u0948\u0938\u0947 \u0915\u0930\u0947\u0902'))
    story += _bilingual(s,
        'Go to the website and click "Staff Login" at the bottom. '
        'Enter your username and OTP (one-time password). '
        'For testing, use username "admin" and OTP "admin123".',
        '\u0935\u0947\u092C\u0938\u093E\u0907\u091F \u092A\u0930 \u091C\u093E\u090F\u0902 \u0914\u0930 \u0928\u0940\u091A\u0947 "Staff Login" \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902\u0964 '
        '\u0905\u092A\u0928\u093E \u092F\u0942\u091C\u0930\u0928\u0947\u092E \u0914\u0930 OTP \u0921\u093E\u0932\u0947\u0902\u0964 '
        '\u091F\u0947\u0938\u094D\u091F \u0915\u0947 \u0932\u093F\u090F: username "admin", OTP "admin123"\u0964')
    story.append(_img('01_login.png', width=120*mm))
    story.append(Paragraph('Login page / \u0932\u0949\u0917\u093F\u0928 \u092A\u0947\u091C', s['caption']))

    cred_data = [
        ['Username', 'OTP', 'Role / \u092D\u0942\u092E\u093F\u0915\u093E'],
        ['admin', 'admin123', 'Admin (\u092A\u0942\u0930\u093E \u090F\u0915\u094D\u0938\u0947\u0938)'],
        ['trainer1', 'admin123', 'Trainer (\u0930\u0942\u091F \u092C\u0928\u093E\u0928\u0947 \u0935\u093E\u0932\u093E)'],
        ['helpdesk1', 'admin123', 'Helpdesk (\u0938\u0939\u093E\u092F\u0924\u093E)'],
    ]
    t2 = Table(cred_data, colWidths=[40*mm, 35*mm, 80*mm])
    t2.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'FreeSansBold'), ('FONTNAME', (0, 1), (-1, -1), 'FreeSans'),
        ('FONTSIZE', (0, 0), (-1, -1), 9), ('BACKGROUND', (0, 0), (-1, 0), BRAND), ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#ddd')), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t2)
    story.append(PageBreak())

    # ══════ 4. ADMIN DASHBOARD ══════
    story.append(_section(s, '4. Admin Dashboard', '\u090F\u0921\u092E\u093F\u0928 \u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921'))
    story += _bilingual(s,
        'After logging in as Admin, you see the Dashboard. It shows: '
        'active sessions (how many people are navigating right now), '
        'completed journeys, pending help requests, and callback requests. '
        'The sidebar on the left lets you go to Routes, Sessions, Users, Media, etc.',
        '\u090F\u0921\u092E\u093F\u0928 \u0932\u0949\u0917\u093F\u0928 \u0915\u0947 \u092C\u093E\u0926 \u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921 \u0926\u093F\u0916\u0924\u093E \u0939\u0948\u0964 '
        '\u092F\u0939\u093E\u0901 \u0926\u093F\u0916\u0924\u093E \u0939\u0948: \u0915\u093F\u0924\u0928\u0947 \u0932\u094B\u0917 \u0905\u092D\u0940 \u0928\u0947\u0935\u093F\u0917\u0947\u091F \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902, \u0915\u093F\u0924\u0928\u0947 \u092A\u0939\u0941\u0901\u091A \u0917\u090F, '
        '\u0915\u093F\u0924\u0928\u0940 \u092E\u0926\u0926 \u092E\u093E\u0901\u0917\u0940 \u0917\u0908\u0964 \u092C\u093E\u090F\u0902 \u0938\u093E\u0907\u0921\u092C\u093E\u0930 \u0938\u0947 Routes, Sessions, Users, Media \u092A\u0930 \u091C\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964')
    story.append(_img('02_admin_dashboard.png', width=155*mm))
    story.append(Paragraph('Admin Dashboard / \u090F\u0921\u092E\u093F\u0928 \u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921', s['caption']))
    story.append(PageBreak())

    # ══════ 5. ADDING ROUTES ══════
    story.append(_section(s, '5. Adding Routes', '\u0930\u0942\u091F \u0915\u0948\u0938\u0947 \u091C\u094B\u0921\u093C\u0947\u0902'))
    story += _bilingual(s,
        'A Route is a path from a starting point (like Metro Station) to the destination (Yash Complex). '
        'Think of it as drawing a line on a map from Point A to Point B with stops along the way.',
        '\u090F\u0915 \u0930\u0942\u091F \u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u092C\u093F\u0902\u0926\u0941 (\u091C\u0948\u0938\u0947 \u092E\u0947\u091F\u094D\u0930\u094B \u0938\u094D\u091F\u0947\u0936\u0928) \u0938\u0947 \u092E\u0902\u091C\u093F\u0932 (\u092F\u0936 \u0915\u0949\u092E\u094D\u092A\u094D\u0932\u0947\u0915\u094D\u0938) \u0924\u0915 \u0915\u093E \u0930\u093E\u0938\u094D\u0924\u093E \u0939\u0948\u0964')

    steps = [
        ('Click "New Route" button (top right)', '"New Route" \u092C\u091F\u0928 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902 (\u090A\u092A\u0930 \u0926\u093E\u090F\u0902)'),
        ('Fill in: Route Name, Description, Start Type, Difficulty', '\u092D\u0930\u0947\u0902: \u0930\u0942\u091F \u0928\u093E\u092E, \u0935\u093F\u0935\u0930\u0923, \u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u092A\u094D\u0930\u0915\u093E\u0930, \u0915\u0920\u093F\u0928\u093E\u0908'),
        ('Choose Status: "draft" (hidden) or "published" (visible to customers)', '\u0938\u094D\u091F\u0947\u091F\u0938 \u091A\u0941\u0928\u0947\u0902: "draft" (\u091B\u093F\u092A\u093E \u0939\u0941\u0906) \u092F\u093E "published" (\u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B \u0926\u093F\u0916\u0947)'),
        ('Click "Create Route"', '"Create Route" \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902'),
    ]
    for i, (en, hi) in enumerate(steps, 1):
        story.append(Paragraph(f'  <b>Step {i}:</b> {en}', s['bullet']))
        story.append(Paragraph(f'  <b>\u0915\u0926\u092E {i}:</b> {hi}', s['bullet']))
    story.append(_img('04_create_route.png', width=120*mm))
    story.append(Paragraph('Create Route dialog / \u0930\u0942\u091F \u092C\u0928\u093E\u0928\u0947 \u0915\u0940 \u0935\u093F\u0902\u0921\u094B', s['caption']))

    story.append(Paragraph('<b>Other route actions / \u0905\u0928\u094D\u092F \u0930\u0942\u091F \u0915\u094D\u0930\u093F\u092F\u093E\u090F\u0902:</b>', s['body']))
    for en, hi in [
        ('Edit: Change name, description, status anytime', '\u0938\u0902\u092A\u093E\u0926\u093F\u0924: \u0928\u093E\u092E, \u0935\u093F\u0935\u0930\u0923, \u0938\u094D\u091F\u0947\u091F\u0938 \u0915\u092D\u0940 \u092D\u0940 \u092C\u0926\u0932\u0947\u0902'),
        ('Publish/Unpublish: Show or hide from customers', '\u092A\u094D\u0930\u0915\u093E\u0936\u093F\u0924/\u0905\u092A\u094D\u0930\u0915\u093E\u0936\u093F\u0924: \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0938\u0947 \u0926\u093F\u0916\u093E\u090F\u0902 \u092F\u093E \u091B\u0941\u092A\u093E\u090F\u0902'),
        ('Duplicate: Make a copy of the route', '\u0928\u0915\u0932: \u0930\u0942\u091F \u0915\u0940 \u0915\u0949\u092A\u0940 \u092C\u0928\u093E\u090F\u0902'),
        ('Export JSON: Download route data as a file', 'JSON \u0928\u093F\u0930\u094D\u092F\u093E\u0924: \u0930\u0942\u091F \u0921\u0947\u091F\u093E \u092B\u093E\u0907\u0932 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902'),
        ('Import JSON: Upload a route from a file', 'JSON \u0906\u092F\u093E\u0924: \u092B\u093E\u0907\u0932 \u0938\u0947 \u0930\u0942\u091F \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902'),
        ('Delete: Remove permanently (Admin only!)', '\u0939\u091F\u093E\u090F\u0902: \u0938\u094D\u0925\u093E\u092F\u0940 \u0930\u0942\u092A \u0938\u0947 \u0939\u091F\u093E\u090F\u0902 (\u0915\u0947\u0935\u0932 \u090F\u0921\u092E\u093F\u0928!)'),
    ]:
        story.append(Paragraph(f'  * {en} / {hi}', s['bullet']))
    story.append(PageBreak())

    # ══════ 6. ADDING CHECKPOINTS ══════
    story.append(_section(s, '6. Adding Checkpoints', '\u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u0915\u0948\u0938\u0947 \u091C\u094B\u0921\u093C\u0947\u0902'))
    story += _bilingual(s,
        'A Checkpoint is like a bus stop on a route. It tells the customer: '
        '"you are here, now do this". Each checkpoint has a name, direction, photo, and instructions.',
        '\u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u090F\u0915 \u092C\u0938 \u0938\u094D\u091F\u0949\u092A \u0915\u0940 \u0924\u0930\u0939 \u0939\u0948\u0964 \u092F\u0939 \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u094B \u092C\u0924\u093E\u0924\u093E \u0939\u0948: '
        '"\u0906\u092A \u092F\u0939\u093E\u0901 \u0939\u0948\u0902, \u0905\u092C \u092F\u0939 \u0915\u0930\u0947\u0902"\u0964')
    story.append(_img('03_routes_cms.png', width=155*mm))
    story.append(Paragraph('Routes CMS with checkpoints / \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0915\u0947 \u0938\u093E\u0925 \u0930\u0942\u091F\u094D\u0938 CMS', s['caption']))

    story.append(Paragraph('<b>To add a checkpoint / \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u091C\u094B\u0921\u093C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F:</b>', s['body']))
    for i, (en, hi) in enumerate([
        ('Select a route on the left', '\u092C\u093E\u090F\u0902 \u0930\u0942\u091F \u091A\u0941\u0928\u0947\u0902'),
        ('Click "Add Checkpoint" button', '"Add Checkpoint" \u092C\u091F\u0928 \u0926\u092C\u093E\u090F\u0902'),
        ('Fill in: Name, Short Instruction, Direction, Risk Level', '\u092D\u0930\u0947\u0902: \u0928\u093E\u092E, \u091B\u094B\u091F\u093E \u0928\u093F\u0930\u094D\u0926\u0947\u0936, \u0926\u093F\u0936\u093E, \u091C\u094B\u0916\u093F\u092E \u0938\u094D\u0924\u0930'),
        ('Upload photo in "Photo & Video" tab', '"Photo & Video" \u091F\u0948\u092C \u092E\u0947\u0902 \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902'),
        ('Click "Add Checkpoint" to save', '"Add Checkpoint" \u0926\u092C\u093E\u0915\u0930 \u0938\u0947\u0935 \u0915\u0930\u0947\u0902'),
    ], 1):
        story.append(Paragraph(f'  <b>{i}.</b> {en} / {hi}', s['bullet']))
    story.append(Spacer(1, 4*mm))
    story.append(_img('05_add_checkpoint.png', width=130*mm))
    story.append(Paragraph('Add Checkpoint dialog / \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u091C\u094B\u0921\u093C\u0928\u0947 \u0915\u0940 \u0935\u093F\u0902\u0921\u094B', s['caption']))

    story.append(Paragraph(
        '<b>Drag to reorder / \u0915\u094D\u0930\u092E \u092C\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0916\u0940\u0902\u091A\u0947\u0902:</b> '
        'Grab the 6-dot handle on the left of each checkpoint and drag up or down. '
        'The new order is saved automatically. / '
        '\u0939\u0930 \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u0915\u0947 \u092C\u093E\u090F\u0902 6-\u0921\u0949\u091F \u0939\u0948\u0902\u0921\u0932 \u092A\u0915\u0921\u093C\u0947\u0902 \u0914\u0930 \u090A\u092A\u0930-\u0928\u0940\u091A\u0947 \u0916\u0940\u0902\u091A\u0947\u0902\u0964 \u0928\u092F\u093E \u0915\u094D\u0930\u092E \u0905\u092A\u0928\u0947 \u0906\u092A \u0938\u0947\u0935 \u0939\u094B\u0924\u093E \u0939\u0948\u0964',
        s['note']))
    story.append(PageBreak())

    # ══════ 7. UPLOADING PHOTOS/VIDEOS ══════
    story.append(_section(s, '7. Uploading Photos & Videos', '\u092B\u094B\u091F\u094B/\u0935\u0940\u0921\u093F\u092F\u094B \u0905\u092A\u0932\u094B\u0921'))
    story += _bilingual(s,
        'You can upload photos and videos in TWO ways: '
        '(1) Inside the checkpoint editor (Photo & Video tab), or '
        '(2) From the Media Library page.',
        '\u0906\u092A \u0926\u094B \u0924\u0930\u0940\u0915\u0947 \u0938\u0947 \u092B\u094B\u091F\u094B/\u0935\u0940\u0921\u093F\u092F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902: '
        '(1) \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u090F\u0921\u093F\u091F\u0930 \u092E\u0947\u0902, \u092F\u093E '
        '(2) \u092E\u0940\u0921\u093F\u092F\u093E \u0932\u093E\u0907\u092C\u094D\u0930\u0947\u0930\u0940 \u092A\u0947\u091C \u0938\u0947\u0964')
    for en, hi in [
        ('Supported: JPG, PNG, WebP, MP4, MOV', '\u0938\u092E\u0930\u094D\u0925\u093F\u0924: JPG, PNG, WebP, MP4, MOV'),
        ('Max size: 50 MB per file', '\u0905\u0927\u093F\u0915\u0924\u092E: 50 MB \u092A\u094D\u0930\u0924\u093F \u092B\u093E\u0907\u0932'),
        ('Watermark is auto-applied to images!', '\u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u0924\u0938\u094D\u0935\u0940\u0930\u094B\u0902 \u092A\u0930 \u0905\u092A\u0928\u0947 \u0906\u092A \u0932\u0917 \u091C\u093E\u0924\u093E \u0939\u0948!'),
        ('Drag & drop multiple files at once', '\u090F\u0915 \u0938\u093E\u0925 \u0915\u0908 \u092B\u093E\u0907\u0932\u0947\u0902 \u0916\u0940\u0902\u091A\u0915\u0930 \u091B\u094B\u0921\u093C\u0947\u0902'),
    ]:
        story.append(Paragraph(f'  * {en} / {hi}', s['bullet']))
    story.append(PageBreak())

    # ══════ 8. MEDIA LIBRARY ══════
    story.append(_section(s, '8. Media Library', '\u092E\u0940\u0921\u093F\u092F\u093E \u0932\u093E\u0907\u092C\u094D\u0930\u0947\u0930\u0940'))
    story += _bilingual(s,
        'Go to "Media" in the sidebar. Here you can see ALL uploaded files. '
        'You can search by filename, filter by type (image, video, arrow map) '
        'and filter by route. Switch between grid and list views.',
        '\u0938\u093E\u0907\u0921\u092C\u093E\u0930 \u092E\u0947\u0902 "Media" \u092A\u0930 \u091C\u093E\u090F\u0902\u0964 \u092F\u0939\u093E\u0901 \u0938\u092D\u0940 \u0905\u092A\u0932\u094B\u0921 \u092B\u093E\u0907\u0932\u0947\u0902 \u0926\u093F\u0916\u0924\u0940 \u0939\u0948\u0902\u0964 '
        '\u0928\u093E\u092E \u0938\u0947 \u0916\u094B\u091C\u0947\u0902, \u092A\u094D\u0930\u0915\u093E\u0930 \u0938\u0947 \u092B\u093F\u0932\u094D\u091F\u0930 \u0915\u0930\u0947\u0902, \u0930\u0942\u091F \u0938\u0947 \u092B\u093F\u0932\u094D\u091F\u0930 \u0915\u0930\u0947\u0902\u0964')
    story.append(_img('06_media_library.png', width=155*mm))
    story.append(Paragraph('Media Library / \u092E\u0940\u0921\u093F\u092F\u093E \u0932\u093E\u0907\u092C\u094D\u0930\u0947\u0930\u0940', s['caption']))
    story.append(PageBreak())

    # ══════ 9. SCHEMATIC MAP ══════
    story.append(_section(s, '9. Schematic Map', '\u0938\u094D\u0915\u0940\u092E\u0948\u091F\u093F\u0915 \u092E\u0948\u092A'))
    story += _bilingual(s,
        'The Schematic Map shows ALL routes at once, like a metro map. '
        'Each colored line is a different starting point. '
        'All lines end at the same destination: Yash Complex, 5th Floor. '
        'Customers can switch routes using the dropdown or legend buttons.',
        '\u0938\u094D\u0915\u0940\u092E\u0948\u091F\u093F\u0915 \u092E\u0948\u092A \u0938\u092D\u0940 \u0930\u093E\u0938\u094D\u0924\u0947 \u090F\u0915 \u0938\u093E\u0925 \u0926\u093F\u0916\u093E\u0924\u093E \u0939\u0948, \u092E\u0947\u091F\u094D\u0930\u094B \u092E\u0948\u092A \u0915\u0940 \u0924\u0930\u0939\u0964 '
        '\u0939\u0930 \u0930\u0902\u0917\u0940\u0928 \u0932\u093E\u0907\u0928 \u090F\u0915 \u0905\u0932\u0917 \u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u092C\u093F\u0902\u0926\u0941 \u0939\u0948\u0964 '
        '\u0938\u092D\u0940 \u0932\u093E\u0907\u0928\u0947\u0902 \u090F\u0915 \u0939\u0940 \u092E\u0902\u091C\u093F\u0932 \u092A\u0930 \u0916\u0924\u094D\u092E \u0939\u094B\u0924\u0940 \u0939\u0948\u0902: \u092F\u0936 \u0915\u0949\u092E\u094D\u092A\u094D\u0932\u0947\u0915\u094D\u0938, 5\u0935\u0940\u0902 \u092E\u0902\u091C\u093F\u0932\u0964')
    story.append(_img('07_schematic_map.png', width=140*mm))
    story.append(Paragraph('Map view / \u092E\u0948\u092A \u0935\u094D\u092F\u0942', s['caption']))
    story.append(_img('08_list_view.png', width=120*mm))
    story.append(Paragraph('List view fallback / \u0938\u0942\u091A\u0940 \u0935\u094D\u092F\u0942', s['caption']))
    story.append(PageBreak())

    # ══════ 10. CUSTOMER FLOW ══════
    story.append(_section(s, '10. Customer Flow', '\u0917\u094D\u0930\u093E\u0939\u0915 \u092A\u094D\u0930\u0935\u093E\u0939'))
    story += _bilingual(s,
        'This is what the customer sees. They scan a QR code, enter their name and phone, '
        'pick a route (e.g. "From Metro Gate 5"), then follow checkpoints one by one '
        'until they arrive at the destination.',
        '\u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u094D\u092F\u093E \u0926\u0947\u0916\u0924\u093E \u0939\u0948: QR \u0915\u094B\u0921 \u0938\u094D\u0915\u0948\u0928 \u0915\u0930\u0947\u0902, \u0928\u093E\u092E \u0914\u0930 \u092B\u094B\u0928 \u0921\u093E\u0932\u0947\u0902, '
        '\u0930\u093E\u0938\u094D\u0924\u093E \u091A\u0941\u0928\u0947\u0902, \u092B\u093F\u0930 \u090F\u0915-\u090F\u0915 \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u092B\u0949\u0932\u094B \u0915\u0930\u0947\u0902\u0964')
    story.append(Spacer(1, 3*mm))
    flow_steps = [
        ('1. Scan QR code / QR \u0915\u094B\u0921 \u0938\u094D\u0915\u0948\u0928 \u0915\u0930\u0947\u0902', 'Customer gets a QR code sticker or digital invite'),
        ('2. Enter name & phone / \u0928\u093E\u092E \u0914\u0930 \u092B\u094B\u0928 \u0921\u093E\u0932\u0947\u0902', 'For helpdesk to contact if needed'),
        ('3. Choose route / \u0930\u093E\u0938\u094D\u0924\u093E \u091A\u0941\u0928\u0947\u0902', 'Select starting point (Metro, Red Fort, etc.)'),
        ('4. Follow checkpoints / \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u092B\u0949\u0932\u094B \u0915\u0930\u0947\u0902', 'See photo, instruction, direction arrow at each step'),
        ('5. Arrive! / \u092A\u0939\u0941\u0901\u091A \u0917\u090F!', 'Yash Complex, 5th Floor'),
    ]
    for title, detail in flow_steps:
        story.append(Paragraph(f'  <b>{title}</b> \u2014 {detail}', s['bullet']))
    story.append(PageBreak())

    # ══════ 11. TESTING FOR BUGS ══════
    story.append(_section(s, '11. Testing for Bugs', '\u092C\u0917 \u091F\u0947\u0938\u094D\u091F\u093F\u0902\u0917'))
    story += _bilingual(s,
        'Testing means checking if everything works correctly. '
        'Here is a simple checklist anyone can follow:',
        '\u091F\u0947\u0938\u094D\u091F\u093F\u0902\u0917 \u0915\u093E \u092E\u0924\u0932\u092C \u0939\u0948 \u091C\u093E\u0901\u091A\u0928\u093E \u0915\u093F \u0938\u092C \u0915\u0941\u091B \u0938\u0939\u0940 \u0915\u093E\u092E \u0915\u0930 \u0930\u0939\u093E \u0939\u0948\u0964 '
        '\u092F\u0939\u093E\u0901 \u090F\u0915 \u0938\u0930\u0932 \u091A\u0947\u0915\u0932\u093F\u0938\u094D\u091F \u0939\u0948:')
    story.append(Spacer(1, 3*mm))

    test_items = [
        ('Login Test', '\u0932\u0949\u0917\u093F\u0928 \u091F\u0947\u0938\u094D\u091F',
         'Login as admin, trainer1, helpdesk1. Each should see their own page.',
         '\u0924\u0940\u0928\u094B\u0902 \u092F\u0942\u091C\u0930 \u0938\u0947 \u0932\u0949\u0917\u093F\u0928 \u0915\u0930\u0947\u0902\u0964 \u0939\u0930 \u090F\u0915 \u0915\u094B \u0905\u092A\u0928\u093E \u092A\u0947\u091C \u0926\u093F\u0916\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964'),
        ('Route CRUD Test', '\u0930\u0942\u091F CRUD \u091F\u0947\u0938\u094D\u091F',
         'Create a test route, add checkpoints, publish it, check if it appears in customer view, then unpublish and delete.',
         '\u091F\u0947\u0938\u094D\u091F \u0930\u0942\u091F \u092C\u0928\u093E\u090F\u0902, \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u091C\u094B\u0921\u093C\u0947\u0902, \u092A\u094D\u0930\u0915\u093E\u0936\u093F\u0924 \u0915\u0930\u0947\u0902, \u0917\u094D\u0930\u093E\u0939\u0915 \u0935\u094D\u092F\u0942 \u092E\u0947\u0902 \u0926\u0947\u0916\u0947\u0902\u0964'),
        ('Photo Upload Test', '\u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u091F\u0947\u0938\u094D\u091F',
         'Upload a photo to a checkpoint. Check watermark is applied. Try uploading a .exe file (should fail!).',
         '\u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u092A\u0930 \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902\u0964 \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u091C\u093E\u0901\u091A\u0947\u0902\u0964 .exe \u092B\u093E\u0907\u0932 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902 (\u092B\u0947\u0932 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F!)\u0964'),
        ('Customer Journey Test', '\u0917\u094D\u0930\u093E\u0939\u0915 \u092F\u093E\u0924\u094D\u0930\u093E \u091F\u0947\u0938\u094D\u091F',
         'Open landing page, use code "AJPL-DEFAULT", pick a route, follow all checkpoints to arrival.',
         '\u0932\u0948\u0902\u0921\u093F\u0902\u0917 \u092A\u0947\u091C \u0916\u094B\u0932\u0947\u0902, "AJPL-DEFAULT" \u0915\u094B\u0921 \u0921\u093E\u0932\u0947\u0902, \u0930\u093E\u0938\u094D\u0924\u093E \u091A\u0941\u0928\u0947\u0902, \u0938\u092D\u0940 \u091A\u0947\u0915\u092A\u0949\u0907\u0902\u091F \u092B\u0949\u0932\u094B \u0915\u0930\u0947\u0902\u0964'),
        ('Schematic Map Test', '\u0938\u094D\u0915\u0940\u092E\u0948\u091F\u093F\u0915 \u092E\u0948\u092A \u091F\u0947\u0938\u094D\u091F',
         'Open /schematic, switch between all 5 routes, toggle map/list view.',
         '/schematic \u0916\u094B\u0932\u0947\u0902, \u0938\u092D\u0940 5 \u0930\u093E\u0938\u094D\u0924\u0947 \u092C\u0926\u0932\u0947\u0902, \u092E\u0948\u092A/\u0932\u093F\u0938\u094D\u091F \u0935\u094D\u092F\u0942 \u091F\u0949\u0917\u0932 \u0915\u0930\u0947\u0902\u0964'),
        ('Permission Test', '\u0905\u0928\u0941\u092E\u0924\u093F \u091F\u0947\u0938\u094D\u091F',
         'Login as trainer1: can you create routes? YES. Can you delete routes? NO (good!). Login as helpdesk1: can you see admin routes page? NO (good!).',
         'trainer1 \u0938\u0947 \u0932\u0949\u0917\u093F\u0928: \u0930\u0942\u091F \u092C\u0928\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902? \u0939\u093E\u0901\u0964 \u0939\u091F\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902? \u0928\u0939\u0940\u0902 (\u0938\u0939\u0940!)\u0964'),
    ]
    for en_title, hi_title, en_body, hi_body in test_items:
        story.append(Paragraph(f'<b>{en_title} / {hi_title}</b>', s['h2']))
        story.append(Paragraph(en_body, s['body']))
        story.append(Paragraph(hi_body, s['body_hi']))
    story.append(PageBreak())

    # ══════ 12. QUICK REFERENCE ══════
    story.append(_section(s, '12. Quick Reference Card', '\u0924\u094D\u0935\u0930\u093F\u0924 \u0938\u0902\u0926\u0930\u094D\u092D \u0915\u093E\u0930\u094D\u0921'))
    ref = [
        ['Action / \u0915\u094D\u0930\u093F\u092F\u093E', 'How / \u0915\u0948\u0938\u0947', 'Who / \u0915\u094C\u0928'],
        ['Create Route', 'Routes > New Route', 'Admin, Trainer'],
        ['Publish Route', 'Route menu > Publish', 'Admin, Trainer'],
        ['Delete Route', 'Route menu > Delete', 'Admin ONLY'],
        ['Add Checkpoint', 'Select route > Add Checkpoint', 'Admin, Trainer'],
        ['Reorder Checkpoints', 'Drag 6-dot handle up/down', 'Admin, Trainer'],
        ['Upload Photo', 'Checkpoint editor > Photo tab', 'Admin, Trainer'],
        ['Media Library', 'Sidebar > Media', 'Admin, Trainer'],
        ['Delete Media', 'Media > hover > delete icon', 'Admin ONLY'],
        ['View Map', '/schematic (public)', 'Everyone'],
        ['Customer Start', 'Scan QR or enter code', 'Customer'],
        ['Download Tutorial', 'Admin > sidebar > Tutorial', 'Admin'],
    ]
    t3 = Table(ref, colWidths=[45*mm, 60*mm, 40*mm])
    t3.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'FreeSansBold'), ('FONTNAME', (0, 1), (-1, -1), 'FreeSans'),
        ('FONTSIZE', (0, 0), (-1, -1), 8), ('LEADING', (0, 0), (-1, -1), 11),
        ('BACKGROUND', (0, 0), (-1, 0), BRAND), ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#ddd')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#FAFAF5')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t3)
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(
        'For help, contact the system admin or refer to this tutorial. / '
        '\u0938\u0939\u093E\u092F\u0924\u093E \u0915\u0947 \u0932\u093F\u090F \u0938\u093F\u0938\u094D\u091F\u092E \u090F\u0921\u092E\u093F\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902 \u092F\u093E \u092F\u0939 \u091F\u094D\u092F\u0942\u091F\u094B\u0930\u093F\u092F\u0932 \u0926\u0947\u0916\u0947\u0902\u0964',
        s['body']))
    story.append(Spacer(1, 15*mm))
    story.append(Paragraph('Yash Ornaments WayFinder \u2014 v2.1', s['footer']))

    doc.build(story)
    return buf.getvalue()
