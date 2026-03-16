from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionAll, kCGNullWindowID

# Get ALL windows (not just on-screen)
windows = CGWindowListCopyWindowInfo(kCGWindowListOptionAll, kCGNullWindowID)
for w in windows:
    owner = str(w.get('kCGWindowOwnerName', ''))
    name = str(w.get('kCGWindowName', ''))
    bounds = w.get('kCGWindowBounds', {})
    b = dict(bounds)
    layer = w.get('kCGWindowLayer', 0)
    print(owner + " | " + name + " | layer=" + str(layer) + " | " + str(b))
