# Graphics audit

The baseline has an ACES render path, a separate high-quality preset with sky and screen-space bloom, environment lighting, building detail batches, instanced vegetation, traffic models and vehicle GLBs.

| Finding | Visible or runtime effect | Upgrade focus |
| --- | --- | --- |
| Uniform asphalt and pavement colors | Large smooth surfaces obscure the distinction between the driving surface and pedestrian space | World-scale surface detail and pavement edges |
| Facade templates repeat heavily | Rows of shops and procedural infill read as uniform masses | More varied storefronts, materials, trim and architectural accents |
| Inconsistent winding and lighting on facade details | Faces can shade incorrectly or vanish with back-face culling | Validate geometry winding and surface normals |
| High-resolution shadow and post-processing passes | Increased GPU work, especially at high display pixel ratios | Bound render resolution and preserve a lighter preset |
| Frequent sky environment updates | Environment-map rendering can compete with frame rendering | Limit unnecessary updates while retaining time-of-day lighting |
| Fixed chase-camera offsets | Building edges can enter the camera path when turning or backing up | Obstruction handling and adjustable orbit |

The source supports only a qualitative baseline assessment. GPU limits and actual frame rates require a rendered browser session on known hardware.

The adaptive setting uses frame time after the simulation delta has been capped at 50 ms. A slow frame therefore contributes at most 50 ms to its estimate. Automatic downgrades also write over manually selected resolution and shadow settings in the shared profile. The performance phase should sample raw frame time and keep automatic decisions local to the session.
