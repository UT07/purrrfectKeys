"""
Sends mouse click events to macOS screen using CGEvent (no Accessibility needed).
Usage: python3 click.py X Y
"""
import sys
from Quartz import (
    CGEventCreateMouseEvent, CGEventPost,
    kCGEventMouseMoved, kCGEventLeftMouseDown, kCGEventLeftMouseUp,
    kCGMouseButtonLeft, kCGHIDEventTap, CGPointMake
)
import time

def click(x, y):
    pos = CGPointMake(x, y)
    # Move mouse to position
    move = CGEventCreateMouseEvent(None, kCGEventMouseMoved, pos, kCGMouseButtonLeft)
    CGEventPost(kCGHIDEventTap, move)
    time.sleep(0.05)
    # Mouse down
    down = CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, pos, kCGMouseButtonLeft)
    CGEventPost(kCGHIDEventTap, down)
    time.sleep(0.1)
    # Mouse up
    up = CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, pos, kCGMouseButtonLeft)
    CGEventPost(kCGHIDEventTap, up)
    time.sleep(0.3)
    print(f"Clicked at ({x}, {y})")

if __name__ == "__main__":
    x = float(sys.argv[1])
    y = float(sys.argv[2])
    click(x, y)
