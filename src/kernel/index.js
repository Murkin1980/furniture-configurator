/**
 * CP-01 parametric furniture kernel - public surface.
 *
 * Everything a consumer (test, debug preview, future product code) needs comes
 * from here. The flow is one-way:
 *
 *   canonical project -> buildProject() -> { view | BOM | validation }
 */

export * from './geometry/vec2.js';
export * from './geometry/intersect.js';
export * from './geometry/wall.js';

export * from './room/room.js';

export * from './furniture/cabinet.js';
export * from './furniture/moduleGeometry.js';

export * from './placement/placement.js';
export * from './bom/bom.js';
export * from './validation/validate.js';
export * from './validation/checklist.js';

export * from './model/project.js';
export * from './model/runs.js';
export * from './model/editor.js';
export * from './model/history.js';
export * from './model/drop.js';
export * from './model/roomedit.js';
export * from './model/openings.js';
export * from './placement/operations.js';

export * from './view/planSvg.js';
export * from './view/isoSvg.js';
export * from './view/scene3d.js';
export * from './view/glb.js';
export * from './view/cuttingPdf.js';
