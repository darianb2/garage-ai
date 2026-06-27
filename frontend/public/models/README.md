# Car models (.glb)

Drop real 3D car models here as **GLB** files (binary glTF — a single web-standard file).

## How to add one

1. Put the file here, e.g. `frontend/public/models/toyota-supra-a80-mk4.glb`
2. Register it in `frontend/src/lib/models.js`:
   ```js
   "toyota-supra-a80-mk4": { url: "/models/toyota-supra-a80-mk4.glb" },
   ```
3. Open that car's 3D Model tab. The placeholder hint (top-left of the viewer)
   tells you the exact slug it expects, so the filename and registry key match.
4. If it's the wrong size or facing the wrong way, tune the registry entry:
   ```js
   "...": { url: "...", scale: 1.5, rotation: [0, Math.PI / 2, 0], position: [0, 0, 0] },
   ```

A car with no registry entry just shows the procedural placeholder — nothing breaks.

## Sourcing

- Free: Sketchfab (filter Downloadable + a Creative Commons license) or Poly Pizza.
  CC-BY models require crediting the author.
- Paid: Sketchfab Store, TurboSquid, CGTrader.

## Keep them web-light

Aim for a few MB per model, not 50-100MB, or the page will be slow. Compress with
`gltf-transform` or `gltfpack` (Draco / meshopt). Ask and this can be run for you.

Note: files here are NOT committed by default if large — keep an eye on repo size.
