from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionOnScreenOnly, kCGNullWindowID

windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
for w in windows:
    owner = str(w.get('kCGWindowOwnerName', ''))
    name = str(w.get('kCGWindowName', ''))
    bounds = w.get('kCGWindowBounds', {})
    b = dict(bounds)
    print(owner + " | " + name + " | " + str(b))
