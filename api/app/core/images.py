import io

from PIL import Image, ImageOps

_MAGIC_BYTES: dict[str, tuple[bytes, ...]] = {
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "webp": (b"RIFF",),  # combined with the WEBP marker check below
}

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def sniff_image_type(data: bytes) -> str | None:
    """Identify real image type from magic bytes only — never trust filename or client content-type."""
    if data.startswith(_MAGIC_BYTES["jpeg"][0]):
        return "jpeg"
    if data.startswith(_MAGIC_BYTES["png"][0]):
        return "png"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "webp"
    return None


def process_profile_picture(data: bytes) -> tuple[bytes, bytes]:
    """Strip EXIF, bake in orientation, and produce (512x512, 128x128) JPEG bytes."""
    image = Image.open(io.BytesIO(data))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    large = ImageOps.fit(image, (512, 512), Image.LANCZOS)
    small = ImageOps.fit(image, (128, 128), Image.LANCZOS)

    return _to_jpeg_bytes(large), _to_jpeg_bytes(small)


def _to_jpeg_bytes(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return buf.getvalue()
