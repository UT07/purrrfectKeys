"""
Tap on iOS Simulator using macOS CGEvent.

Screenshot size: 1206x2622 (iPhone 17 Pro @3x)
Simulator window: X=0, Y=85, W=447, H=897 (macOS logical coords)
Device logical: 393x852 pt, bezel: 27px left, 22px top

Mapping from actual screenshot pixel (1206x2622) to screen logical coord:
  sx = 27 + img_x * (393/1206)
  sy = 85 + 22 + img_y * (852/2622)

Pass ACTUAL image pixel coords (multiply displayed coords by 1.31 first).
"""
import sys, time
from Quartz import (
    CGEventCreateMouseEvent, CGEventPost,
    kCGEventMouseMoved, kCGEventLeftMouseDown, kCGEventLeftMouseUp,
    kCGMouseButtonLeft, kCGHIDEventTap, CGPointMake
)

# Correct scale: actual screenshot is 1206x2622
SCALE_X = 393.0 / 1206.0   # 0.3259
SCALE_Y = 852.0 / 2622.0   # 0.3250
WIN_X   = 0
WIN_Y   = 85
BEZ_X   = 27
BEZ_Y   = 22

def img_to_screen(img_x, img_y):
    sx = WIN_X + BEZ_X + img_x * SCALE_X
    sy = WIN_Y + BEZ_Y + img_y * SCALE_Y
    return sx, sy

def tap(sx, sy, label=""):
    pos = CGPointMake(sx, sy)
    CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventMouseMoved, pos, kCGMouseButtonLeft))
    time.sleep(0.05)
    CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, pos, kCGMouseButtonLeft))
    time.sleep(0.12)
    CGEventPost(kCGHIDEventTap, CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, pos, kCGMouseButtonLeft))
    time.sleep(0.5)
    print(f"Tapped '{label}' at screen ({sx:.1f}, {sy:.1f})")

def tap_img(img_x, img_y, label=""):
    sx, sy = img_to_screen(img_x, img_y)
    tap(sx, sy, label)

if __name__ == "__main__":
    # Usage: python3 tap.py IMG_X IMG_Y [label]
    # IMG_X/Y are actual screenshot pixel coords (1206x2622 space)
    img_x = float(sys.argv[1])
    img_y = float(sys.argv[2])
    label = sys.argv[3] if len(sys.argv) > 3 else ""
    tap_img(img_x, img_y, label)
