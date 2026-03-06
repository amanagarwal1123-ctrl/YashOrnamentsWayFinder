"""
Watermark utilities for Yash Ornaments WayFinder.
Applies diagonal repeating text watermarks to images.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from pathlib import Path
import io

MEDIA_DIR = Path(__file__).parent / "media"
ORIGINALS_DIR = MEDIA_DIR / "originals"
WATERMARKED_DIR = MEDIA_DIR / "watermarked"

# Ensure directories exist
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
WATERMARKED_DIR.mkdir(parents=True, exist_ok=True)


def get_branding_config(db_config=None):
    """Get branding configuration. Falls back to defaults."""
    defaults = {
        'watermark_text': 'YASH ORNAMENTS',
        'watermark_opacity': 0.20,  # 15-25% range
        'watermark_font_size': 36,
        'watermark_rotation': -30,  # degrees
        'watermark_spacing': 200,  # px between repetitions
        'watermark_color': (255, 255, 255),  # white
    }
    if db_config:
        defaults.update({k: v for k, v in db_config.items() if v is not None})
    return defaults


def apply_watermark_to_image(
    input_path: str,
    output_path: str,
    watermark_text: str = "YASH ORNAMENTS",
    opacity: float = 0.20,
    font_size: int = 36,
    rotation: int = -30,
    spacing: int = 200,
    color: tuple = (255, 255, 255),
) -> str:
    """
    Apply diagonal repeating watermark to an image.
    Returns the output path.
    """
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size

        # Create watermark layer
        watermark_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(watermark_layer)

        # Try to use a reasonable font
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

        # Calculate text dimensions
        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Create a larger canvas for rotation to cover entire image
        diagonal = int(math.sqrt(width**2 + height**2))
        txt_layer = Image.new("RGBA", (diagonal * 2, diagonal * 2), (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)

        # Alpha value from opacity
        alpha = int(255 * opacity)
        text_color = (*color, alpha)

        # Draw repeating text across the large canvas
        y = 0
        row = 0
        while y < diagonal * 2:
            x = -text_width + (row % 2) * (spacing // 2)  # offset alternating rows
            while x < diagonal * 2:
                txt_draw.text((x, y), watermark_text, fill=text_color, font=font)
                x += text_width + spacing
            y += text_height + spacing
            row += 1

        # Rotate the text layer
        txt_layer = txt_layer.rotate(rotation, expand=False, resample=Image.BICUBIC)

        # Crop to match original image size, centered
        cx = txt_layer.width // 2
        cy = txt_layer.height // 2
        crop_box = (cx - width // 2, cy - height // 2, cx + width // 2, cy + height // 2)
        txt_layer = txt_layer.crop(crop_box)

        # Ensure same size
        if txt_layer.size != img.size:
            txt_layer = txt_layer.resize(img.size, Image.LANCZOS)

        # Composite
        watermarked = Image.alpha_composite(img, txt_layer)

        # Convert to RGB for saving as JPEG
        if output_path.lower().endswith(('.jpg', '.jpeg')):
            watermarked = watermarked.convert("RGB")

        watermarked.save(output_path, quality=90)
        return output_path

    except Exception as e:
        print(f"Watermark error: {e}")
        # If watermarking fails, copy original
        import shutil
        shutil.copy2(input_path, output_path)
        return output_path


def apply_watermark_to_bytes(
    image_bytes: bytes,
    filename: str,
    watermark_text: str = "YASH ORNAMENTS",
    opacity: float = 0.20,
    font_size: int = 36,
    rotation: int = -30,
    spacing: int = 200,
    color: tuple = (255, 255, 255),
) -> tuple:
    """
    Apply watermark to image bytes. Returns (watermarked_bytes, content_type).
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        width, height = img.size

        # Create watermark layer
        watermark_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(watermark_layer)

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        diagonal = int(math.sqrt(width**2 + height**2))
        txt_layer = Image.new("RGBA", (diagonal * 2, diagonal * 2), (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)

        alpha = int(255 * opacity)
        text_color = (*color, alpha)

        y = 0
        row = 0
        while y < diagonal * 2:
            x = -text_width + (row % 2) * (spacing // 2)
            while x < diagonal * 2:
                txt_draw.text((x, y), watermark_text, fill=text_color, font=font)
                x += text_width + spacing
            y += text_height + spacing
            row += 1

        txt_layer = txt_layer.rotate(rotation, expand=False, resample=Image.BICUBIC)

        cx = txt_layer.width // 2
        cy = txt_layer.height // 2
        crop_box = (cx - width // 2, cy - height // 2, cx + width // 2, cy + height // 2)
        txt_layer = txt_layer.crop(crop_box)

        if txt_layer.size != img.size:
            txt_layer = txt_layer.resize(img.size, Image.LANCZOS)

        watermarked = Image.alpha_composite(img, txt_layer)

        output = io.BytesIO()
        ext = filename.lower().split('.')[-1] if '.' in filename else 'png'
        if ext in ('jpg', 'jpeg'):
            watermarked = watermarked.convert("RGB")
            watermarked.save(output, format="JPEG", quality=90)
            content_type = "image/jpeg"
        else:
            watermarked.save(output, format="PNG")
            content_type = "image/png"

        output.seek(0)
        return output.getvalue(), content_type

    except Exception as e:
        print(f"Watermark bytes error: {e}")
        return image_bytes, "application/octet-stream"


def generate_placeholder_watermarked(
    width: int = 600,
    height: int = 400,
    label: str = "Checkpoint",
    watermark_text: str = "YASH ORNAMENTS",
    opacity: float = 0.20,
) -> bytes:
    """Generate a placeholder checkpoint image with watermark applied."""
    # Create placeholder
    img = Image.new("RGBA", (width, height), (240, 235, 220, 255))
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except (OSError, IOError):
        font = ImageFont.load_default()
        small_font = font

    # Draw placeholder content
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(200, 195, 180), width=2)
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((width - tw) // 2, (height - th) // 2 - 10), label, fill=(120, 115, 100), font=font)
    draw.text(((width - 100) // 2, (height + th) // 2 + 10), "Placeholder", fill=(160, 155, 140), font=small_font)

    # Apply watermark
    try:
        wm_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except (OSError, IOError):
        wm_font = font

    diagonal = int(math.sqrt(width**2 + height**2))
    txt_layer = Image.new("RGBA", (diagonal * 2, diagonal * 2), (0, 0, 0, 0))
    txt_draw = ImageDraw.Draw(txt_layer)

    alpha = int(255 * opacity)
    bbox2 = txt_draw.textbbox((0, 0), watermark_text, font=wm_font)
    tw2 = bbox2[2] - bbox2[0]
    th2 = bbox2[3] - bbox2[1]

    y = 0
    row = 0
    while y < diagonal * 2:
        x = -tw2 + (row % 2) * 100
        while x < diagonal * 2:
            txt_draw.text((x, y), watermark_text, fill=(255, 255, 255, alpha), font=wm_font)
            x += tw2 + 160
        y += th2 + 160
        row += 1

    txt_layer = txt_layer.rotate(-30, expand=False, resample=Image.BICUBIC)
    cx = txt_layer.width // 2
    cy = txt_layer.height // 2
    txt_layer = txt_layer.crop((cx - width // 2, cy - height // 2, cx + width // 2, cy + height // 2))
    if txt_layer.size != img.size:
        txt_layer = txt_layer.resize(img.size, Image.LANCZOS)

    result = Image.alpha_composite(img, txt_layer)
    result = result.convert("RGB")

    output = io.BytesIO()
    result.save(output, format="JPEG", quality=85)
    output.seek(0)
    return output.getvalue()
