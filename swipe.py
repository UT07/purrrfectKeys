"""Swipe gesture on simulator screen using CGEvent."""
import sys, time
from Quartz import (
    CGEventCreateMouseEvent, CGEventPost,
    kCGEventMouseMoved, kCGEventLeftMouseDown, kCGEventLeftMouseUp,
    kCGMouseButtonLeft, kCGHIDEventTap, CGPointMake
)

SCALE_X = 393.0 / 1206.0
SCALE_Y = 852.0 / 2622.0
WIN_X, WIN_Y = 0, 85
BEZ_X, BEZ_Y = 27, 22

def img_to_screen(ix, iy):
    return WIN_X + BEZ_X + ix * SCALE_X, WIN_Y + BEZ_Y + iy * SCALE_Y

def swipe(from_ix, from_iy, to_ix, to_iy, steps=20, label=""):
    sx0, sy0 = img_to_screen(from_ix, from_iy)
    sx1, sy1 = img_to_screen(to_ix, to_iy)
    # Mouse down at start
    p0 = CGPointMake(sx0, sy0)
    CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventMouseMoved, p0, kCGMouseButtonLeft))
    time.sleep(0.05)
    CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, p0, kCGMouseButtonLeft))
    time.sleep(0.05)
    # Drag smoothly
    for i in range(1, steps + 1):
        t = i / steps
        px = sx0 + (sx1 - sx0) * t
        py = sy0 + (sy1 - sy0) * t
        from Quartz import kCGEventLeftMouseDragged
        CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventLeftMouseDragged, CGPointMake(px, py), kCGMouseButtonLeft))
        time.sleep(0.015)
    # Mouse up at end
    p1 = CGPointMake(sx1, sy1)
    CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, p1, kCGMouseButtonLeft))
    time.sleep(0.6)
    print(f"Swiped {label}: ({from_ix},{from_iy}) -> ({to_ix},{to_iy})")

if __name__ == "__main__":
    # Usage: python3 swipe.py FROM_X FROM_Y TO_X TO_Y [label]
    fx, fy, tx, ty = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
    label = sys.argv[5] if len(sys.argv) > 5 else ""
    swipe(fx, fy, tx, ty, label=label)
