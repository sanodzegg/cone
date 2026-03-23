# Converting to .icns (macOS App Icon)

This folder contains your PNG files already renamed to the exact format that macOS `iconutil` expects.

## What is .icns?
.icns is the macOS icon format used for app icons in the Dock, Finder, and app bundles. It packages multiple sizes into a single file.

## Requirements
- macOS only (iconutil is a built-in macOS CLI tool, no install needed)

## Steps

1. Rename this folder from "icns" to "icon.iconset"
   The folder name must end in .iconset — this is required by iconutil.

2. Open Terminal and run:
   iconutil -c icns icon.iconset

3. This will generate icon.icns in the same directory.

## How the @2x files work
macOS uses a 1x/2x system for HiDPI (Retina) displays. The @2x file is simply the next size up, renamed:

   icon_16x16.png      → 16px  (standard display)
   icon_16x16@2x.png   → 32px file renamed  (Retina display)
   icon_32x32.png      → 32px
   icon_32x32@2x.png   → 64px file renamed
   icon_128x128.png    → 128px
   icon_128x128@2x.png → 256px file renamed
   icon_256x256.png    → 256px
   icon_256x256@2x.png → 512px file renamed
   icon_512x512.png    → 512px
   icon_512x512@2x.png → 1024px file renamed

All files in this folder are already named correctly — no renaming needed.

## Full example
   mv icns icon.iconset
   iconutil -c icns icon.iconset
   # Done! icon.icns is now in the current folder.
