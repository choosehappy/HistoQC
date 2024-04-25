"""
For python >=3.8, the behavior of import dlls in Windows is changed. add_dll_directory is added to os and must be
manually called to include the path(s) of binaries. (in previous versions, extending the PATH variable is enough)
"""
import os
if hasattr(os, "add_dll_directory"):
    # specify your own openslide binary locations
    with os.add_dll_directory(os.path.join(os.getcwd(), 'bin')):
        # noinspection PyUnresolvedReferences
        import openslide
else:
    # os.environ['PATH'] = 'C:\\research\\openslide\\bin' + ';' + os.environ['PATH']
    # #can either specify openslide bin path in PATH, or add it dynamically
    # noinspection PyUnresolvedReferences
    import openslide

