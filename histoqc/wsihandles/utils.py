from PIL import Image
from PIL.Image import Image as PILImage
from typing import Union, Iterable


def hex_to_rgb(hex_color: str):
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]

    if len(hex_color) != 6:
        raise ValueError(f"Invalid hex triplets. Length: {len(hex_color)}")

    rgb_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    return rgb_color


def _validate_numerics(data: Iterable[float]):
    if not isinstance(data, Iterable):
        return False
    return all([isinstance(x, float) for x in data])


def validate_color(background_color: Union[str, Iterable[float], float]):
    # if str -> assume a hex triplet
    if isinstance(background_color, str):
        return hex_to_rgb(background_color)
    # must be numeric, or sequence of numeric
    if isinstance(background_color, float):
        return background_color
    assert _validate_numerics(background_color), (f"background color must be a hex triplet string, a number,"
                                                  f" or a sequence of numbers")
    return tuple(x for x in background_color)


def rgba2rgb_pil(img: PILImage, background_color) -> PILImage:
    thumb = Image.new("RGB", img.size, validate_color(background_color))
    thumb.paste(img, None, img)
    return thumb
