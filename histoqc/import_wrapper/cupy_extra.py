from __future__ import annotations

try:
    import cupy
    # cupy.cuda.set_allocator(None)
except ImportError:
    cupy = None
finally:
    cp = cupy


def cupy_installed() -> bool:
    try:
        import cupy
        return True
    except ImportError:
        return False
