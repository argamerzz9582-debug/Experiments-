"""Joint table for the paper-cut boy.

Every number is the **visible** silhouette size in world units (y up, feet at 0),
not the size of the painted rect. Chibi proportions follow
papercraft-re/boy/renders/character-sheet.png: head+hair is roughly half the
figure, and the whole cast stands on a stick running down to y = -1.40.
"""
# ---- sizes (visible) -------------------------------------------------------
HEAD_W, HEAD_H   = 0.86, 0.98       # the big chibi head
HAIR_W, HAIR_H   = 0.96, 0.72       # a hair bigger than the skull, sits behind
HAT_W,  HAT_H    = 0.80, 0.40
FACE_W, FACE_H   = 0.58, 0.52       # the face overlay, ~half the head
BODY_W          = 0.50              # coat / tunic / robe body width
ARM_W,  ARM_H   = 0.145, 0.56
LEG_W,  LEG_H   = 0.130, 0.40
SHOE_W, SHOE_H  = 0.22, 0.17
STICK_W, STICK_H = 0.045, 2.60

# ---- vertical stack -------------------------------------------------------
FEET_BOT   = 0.06
LEG_BOT    = 0.18
BODY_BOT   = 0.48
HEAD_BOT   = 1.02
FACE_CY    = 1.28
HAT_BOT    = 1.86
HAIR_BOT   = 1.42
ARM_BOT    = 0.60
STICK_BOT  = -1.40

# body heights, per garment
COAT_H, TUNIC_H, ROBE_H = 0.62, 0.58, 0.72

# ---- draw order (z; bigger = nearer the camera) ---------------------------
# head < hair < face: the fringe has to sit in front of the skull, and the
# face overlay in front of the fringe, exactly like the original cut-outs.
# arms ride in FRONT of the coat, otherwise the garment simply hides them
Z_STICK, Z_BACK, Z_BODY, Z_CLOTH, Z_HEAD, Z_HAIR, Z_FACE, Z_ARM, Z_DET = \
    -0.030, -0.022, -0.008, 0.004, 0.012, 0.020, 0.030, 0.034, 0.040
