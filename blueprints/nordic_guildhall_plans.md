# ARCHITECTURAL BLUEPRINT — Nightforge Nordic Timber & Stone Guildhall

- **Blueprint ID:** `nordic_guildhall`
- **World Origin:** `(-8, 4, 4)`
- **World Bounding Box:** `[-8, 4, 4] -> [14, 23, 26]`
- **Envelope Dimensions:** `23 (X) x 20 (Y) x 23 (Z)` blocks
- **Total Non-Air Blocks:** `2517`
- **Symmetry Centerline:** `dx = 11` (`X = 3`)

**Legend:** `#` Spruce Timber Column/Beam | `M` Stone Masonry | `W` Cream Plaster (`white_terracotta`) | `+` Spruce Plank Floor | `S` Stairs/Roof Slope | `=` Slab | `G` Glass Pane | `D` Oak Door | `*` Lantern/Campfire | `@` Persistent Hedge Leaves | `o` Fence/Wall | `f` Furnishings

---

## 1. Ground Floor Plan (`dy = 2` Wall & Doorway Cut)

```text
   X: 01234567890123456789012
Z=00: .......................
Z=01: .......................
Z=02: ...#MMMM#MMMMM#MMMM#...
Z=03: .@.M...........ffffM.@.
Z=04: .@.M..............fM.@.
Z=05: .@.M..............fM.@.
Z=06: .@.M...............M.@.
Z=07: .@.#.......o.......#.@.
Z=08: .@.M.....S.o.S....MMM@.
Z=09: .@.M.SS..S.o.S...f*MM@.
Z=10: .@.M.SS....o......MMM@.
Z=11: .@.#...............#.@.
Z=12: .@.M...............M.@.
Z=13: .@.M...............M.@.
Z=14: .@.M...............M.@.
Z=15: .@.M.....#MDM#.....M.@.
Z=16: .@.#MMMM#M...M#MMMM#.@.
Z=17: .@.....o=.....=o.....@.
Z=18: .@@@@@@@.......@@@@@@@.
Z=19: .......................
Z=20: ..@@@@@@.......@@@@@@..
Z=21: .......o.......o.......
Z=22: .......................
```

## 2. Upper Loft & Balcony Floor Plan (`dy = 7` Wall, Balcony & Library Cut)

```text
   X: 01234567890123456789012
Z=00: .......................
Z=01: .......................
Z=02: ...#WWWW#WWWWW#WWWW#...
Z=03: ...W.....ff..fff...W...
Z=04: ...Wo......f.......W...
Z=05: ...W..............oW...
Z=06: ...W...o...........W...
Z=07: ...#...o...........#...
Z=08: ...W...o...........WM..
Z=09: ...W...o...o.......WM..
Z=10: ...W...o...........WM..
Z=11: ...#...o...........#...
Z=12: ...W.oo............W...
Z=13: ...W....o.....o.ff.W...
Z=14: ...Wo...#WWDWW#.fffW...
Z=15: ...W....W.....W....W...
Z=16: ..f#WWWW#ooooo#WWWW#f..
Z=17: .....SS.........SS.....
Z=18: .......................
Z=19: .......................
Z=20: .......................
Z=21: .......................
Z=22: .......................
```

## 3. Front Elevation (South Facade Looking North)

```text
Y=19: ...........M...........
Y=18: ..........SMS..........
Y=17: .........SSWSS.....M...
Y=16: ........SSWWWSS....M...
Y=15: .......SS#####SS...MM..
Y=14: ......SSWWWGWWWSS..MM..
Y=13: .....SSWWDGGGDWWSS.MM..
Y=12: ....SSWWWDGGGDWWWSSMM..
Y=11: ...SSWWWWWWWWWWWWWSSM..
Y=10: ..SS###############SS..
Y=09: ...#DGGD#S*W*S#DGGD#M..
Y=08: ..o#DGGD#WGDGW#DGGD#o..
Y=07: ..f#WSSW#ooooo#WSSW#f..
Y=06: ..f#################f..
Y=05: ...#################M..
Y=04: ...#MGG*#M*M*M#*GGM#M..
Y=03: ...#MGGo#MGDGM#oGGM#M..
Y=02: .@@@@@@o=MMDMM=o@@@@@@.
Y=01: .@@@@@@MMSSSSSMM@@@@@@.
Y=00: ,,,,,,,,MMMMMMM,,,,,,,,
```

## 4. East Side Elevation (Showing Cross-Bays & Masonry Chimney)

```text
Y=19: .M===============M.....
Y=18: .SSSSSSSSSSSSSSSSS.....
Y=17: .SSSSSSSM*MSSSSSSS.....
Y=16: .SSSSSSSSMSSSSSSSS.....
Y=15: .SSSSSSSSMSSSSSSSS.....
Y=14: .SSSSSSSSMSSSSSSSS.....
Y=13: .SSSSSSSMMMSSSSSSS.....
Y=12: .SSSSSSSMMMSSSSSSS.....
Y=11: .SSSSSSSMMMSSSSSSS.....
Y=10: .SSSSSSSMMMSSSSSSS.....
Y=09: ..#WGGW#MMM#WGGW#D.....
Y=08: ..#WGGW#MMM#WGGWoD.....
Y=07: ..#WWWW#MMM#WWWWfS.....
Y=06: ..######MMM#####f......
Y=05: ..######MMM######......
Y=04: ..#MGGM#MMM#MGGM#*...*.
Y=03: ..#MGGM#MMM#MGGM#o...o.
Y=02: ..#@@@@@@@@@@@@@@@@.@o.
Y=01: ..M@@@@@@@@@@@@@@@@f@M.
Y=00: ,,,,,,,,,,,,,,,,,,,,,,,
```

## 5. Top-Down Roof & Courtyard Plan

```text
   X: 01234567890123456789012
Z=00: ,,,,,,,,,,,,,,,,,,,,,,,
Z=01: ,,SSSSSSSSSMSSSSSSSSS,,
Z=02: ,,SSSSSSSSS=SSSSSSSSS,,
Z=03: ,@SSSSSSSSS=SSSSSSSSS@,
Z=04: ,@SSSSSSSSS=SSSSSSSSS@,
Z=05: ,@SSSSSSSSS=SSSSSSSSS@,
Z=06: ,@SSSSSSSSS=SSSSSSSSS@,
Z=07: ,@SSSSSSSSS=SSSSSSSSS@,
Z=08: ,@SSSSSSSSS=SSSSSSSMM@,
Z=09: ,@SSSSSSSSS=SSSSSSS*M@,
Z=10: ,@SSSSSSSSS=SSSSSSSMM@,
Z=11: ,@SSSSSSSSS=SSSSSSSSS@,
Z=12: ,@SSSSSSSSS=SSSSSSSSS@,
Z=13: ,@SSSSSSSSS=SSSSSSSSS@,
Z=14: ,@SSSSSSSSS=SSSSSSSSS@,
Z=15: ,@SSSSSSSSS=SSSSSSSSS@,
Z=16: ,@SSSSSSSSS=SSSSSSSSS@,
Z=17: ,@SSSSSSSSSMSSSSSSSSS@,
Z=18: ,@@@@@@@MMMMMMM@@@@@@@,
Z=19: ,,,,f,f,MMMMMMM,f,f,,,,
Z=20: ,,@@@@@@MMMMMMM@@@@@@,,
Z=21: ,,MMMMM*MMMMMMM*MMMMM,,
Z=22: ,,,,,,,,MMMMMMM,,,,,,,,
```

---

## 6. Staged Construction Execution Plan

| Stage ID | Total Voxels | Bulk Cuboids (`>=6`) | Bulk Blocks | Precision Blocks |
|---|---:|---:|---:|---:|
| `01_site_pad` | 529 | 9 | 473 | 56 |
| `02_foundation` | 264 | 8 | 225 | 39 |
| `03_structural_frame` | 250 | 24 | 200 | 50 |
| `04_exterior_walls` | 374 | 9 | 81 | 293 |
| `05_floors_and_stairs` | 209 | 7 | 183 | 26 |
| `06_roof_system` | 575 | 37 | 489 | 86 |
| `07_windows_and_doors` | 114 | 3 | 18 | 96 |
| `08_interior_fitout` | 70 | 0 | 0 | 70 |
| `09_landscaping_and_lighting` | 132 | 6 | 112 | 20 |

---

## 7. Material Quantity Estimate (Bill of Materials)

| Block ID | Exact Quantity | Survival Stacks (64) |
|---|---:|---:|
| `stone_bricks` | 492 | 8 |
| `spruce_planks` | 337 | 6 |
| `dark_oak_stairs` | 264 | 5 |
| `grass_block` | 220 | 4 |
| `dark_oak_planks` | 205 | 4 |
| `white_terracotta` | 182 | 3 |
| `stripped_spruce_log` | 166 | 3 |
| `spruce_log` | 154 | 3 |
| `oak_leaves` | 112 | 2 |
| `glass_pane` | 94 | 2 |
| `stone_brick_stairs` | 79 | 2 |
| `spruce_fence` | 33 | 1 |
| `lantern` | 25 | 1 |
| `mossy_stone_bricks` | 24 | 1 |
| `spruce_stairs` | 24 | 1 |
| `cracked_stone_bricks` | 17 | 1 |
| `stone_brick_slab` | 17 | 1 |
| `andesite` | 13 | 1 |
| `spruce_trapdoor` | 12 | 1 |
| `bookshelf` | 8 | 1 |
| `cobblestone` | 4 | 1 |
| `blue_wool` | 4 | 1 |
| `oak_door` | 4 | 1 |
| `brown_carpet` | 4 | 1 |
| `barrel` | 3 | 1 |
| `campfire` | 2 | 1 |
| `stone_brick_wall` | 2 | 1 |
| `furnace` | 2 | 1 |
| `white_wool` | 2 | 1 |
| `red_wool` | 2 | 1 |
| `poppy` | 2 | 1 |
| `dandelion` | 2 | 1 |
| `iron_bars` | 1 | 1 |
| `crafting_table` | 1 | 1 |
| `cauldron` | 1 | 1 |
| `chest` | 1 | 1 |
| `lectern` | 1 | 1 |
| `cartography_table` | 1 | 1 |
