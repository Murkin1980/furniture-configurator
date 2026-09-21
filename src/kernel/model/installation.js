/**
 * Vertical kitchen model (CP-12) - the ONE kernel-owned place for the
 * installation parameters and Z-elevation derivation.
 *
 * Canonical inputs (project-level, authored):
 *
 *   installation: { plinthHeight: 100, worktopThickness: 38 }
 *
 * Derived (never stored twice):
 *
 *   base/tall cabinet: bottomZ = plinthHeight, topZ = bottomZ + height
 *   wall cabinet:      bottomZ = parameters.mountHeight (explicit anchor),
 *                      topZ = bottomZ + height
 *   worktop top (base run): plinthHeight + cabinet height + worktopThickness
 *
 * SVG / Three.js / GLB / checklist / preview must all read these derived
 * numbers from the bundle - no consumer may re-derive the formula.
 */

export const DEFAULT_INSTALLATION = Object.freeze({
  plinthHeight: 100,
  worktopThickness: 38,
});

/** Merge authored installation over kernel defaults (single source). */
export function normalizeInstallation(definition) {
  const a = definition.installation ?? {};
  return {
    plinthHeight: a.plinthHeight ?? DEFAULT_INSTALLATION.plinthHeight,
    worktopThickness: a.worktopThickness ?? DEFAULT_INSTALLATION.worktopThickness,
  };
}

/** True when the installation parameters are usable numbers. */
export function installationValid(inst) {
  return (
    Number.isFinite(inst.plinthHeight) && inst.plinthHeight >= 0 &&
    Number.isFinite(inst.worktopThickness) && inst.worktopThickness >= 0
  );
}

/**
 * Derived Z elevation of a placed module.
 * @returns {{bottomZ:number, topZ:number}|null} null = missing/invalid anchor
 */
export function moduleElevation(installation, module) {
  const H = module.height;
  if (!Number.isFinite(H) || H <= 0) return null;
  if (module.type === 'wall-cabinet') {
    const mount = module.parameters?.mountHeight;
    if (!Number.isFinite(mount) || mount < 0) return null;
    return { bottomZ: mount, topZ: mount + H };
  }
  if (module.type === 'base-cabinet' || module.type === 'tall-cabinet') {
    const bottomZ = installation.plinthHeight;
    return { bottomZ, topZ: bottomZ + H };
  }
  return { bottomZ: 0, topZ: H };
}

/** Derived worktop top elevation for a base cabinet. */
export const worktopTopZ = (installation, module) =>
  installation.plinthHeight + module.height + installation.worktopThickness;
