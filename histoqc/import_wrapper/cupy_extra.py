try:
    import cupy
except ImportError:
    cupy = None
finally:
    cp = cupy
