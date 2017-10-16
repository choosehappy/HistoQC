from distutils.util import strtobool

def getBasicStats(s,params):
    print "\tgetBasicStats"
    osh=s["os_handle"]
    s.addToPrintList("type",osh.properties["openslide.vendor"])
    s.addToPrintList("levels", osh.properties["openslide.level-count"])
    s.addToPrintList("height", osh.properties["openslide.level[0].height"])
    s.addToPrintList("width", osh.properties["openslide.level[0].width"])
    s.addToPrintList("mpp-x", osh.properties["openslide.mpp-x"])
    s.addToPrintList("mpp-y", osh.properties["openslide.mpp-y"])
    s.addToPrintList("comment", osh.properties["openslide.comment"])
    return

def getMag(s,params):
    print "\tgetMag"
    osh = s["os_handle"]
    mag = osh.properties["openslide.objective-power"]
    if(mag is None or strtobool(params.get("confirm",False))): #TODO: Don't know what previous call returns when not available....
        #do DL work here
        print "Unknown magnification for file, need to implement: " + s["filename"]
    s.addToPrintList("Magnification", mag)
    return