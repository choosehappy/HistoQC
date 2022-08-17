from histoqc.image_core.BaseImage import BaseImage


class PILImage(BaseImage):
    ...

    @property
    def resource_handle(self):
        return self['pil_handle']

    def init_resource(self, *args, **kwargs):
        raise NotImplementedError

    @classmethod
    def build(cls, fname, fname_outdir, params):
        return cls(fname, fname_outdir, params)

    def __init__(self, fname, fname_outdir, params):
        super().__init__(fname, fname_outdir, params)
        ...
