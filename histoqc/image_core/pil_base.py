from histoqc.image_core.BaseImage import BaseImage


class PILImage(BaseImage):
    ...

    def _init_resource(self, fname, params):
        #
        self["os_handle"] = OpenSlide(fname)
        # self["image_base_size"] = self["os_handle"].dimensions
        # self["base_mag"] = getMag(self, params)
        # self.addToPrintList("base_mag", self["base_mag"])
        ...

    @classmethod
    def build(cls, fname, fname_outdir, params):
        return cls(fname, fname_outdir, params)

    def __init__(self, fname, fname_outdir, params):
        super().__init__(fname, fname_outdir, params)
        ...
