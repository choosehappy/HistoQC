try:
    import dask_cuda
except ImportError:
    dask_cuda = None


def dask_cuda_installed() -> bool:
    try:
        import dask_cuda
        return True
    except ImportError:
        return False
