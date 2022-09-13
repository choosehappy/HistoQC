import os
if hasattr(os, "add_dll_directory"):
    with os.add_dll_directory(os.path.join(os.getcwd(), 'bin')):
        import openslide
else:
    import openslide