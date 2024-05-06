try:
    import cupy
    # cupy.cuda.set_allocator(None)
    cupy.cuda.set_allocator(cupy.cuda.MemoryPool().malloc)
except ImportError:
    cupy = None
finally:
    cp = cupy
