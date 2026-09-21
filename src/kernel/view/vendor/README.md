# Vendored Three.js

`three.module.min.js` — Three.js r160, ESM build, vendored so the derived 3D debug view
(`kernel-3d.html`) works with **no runtime CDN dependency** (sandbox egress to CDNs is blocked;
the npm registry is not, which is how this file was obtained).

- source: https://www.npmjs.com/package/three (npm pack three@0.160.0, `build/three.module.min.js`)
- version: 0.160.0
- sha256: `3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6`
- license: MIT (see https://github.com/mrdoob/three.js/blob/r160/LICENSE)

The kernel itself (`src/kernel/**` except this vendor file) remains dependency-free; tests never
import three. To refresh: `npm pack three@<ver>` and replace the file, updating this note.
