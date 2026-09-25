A tiny public entry for `tests/unit/manifest.test.ts`: the manifest's TypeScript extractor runs over it, so
the test can prove what it reads (props, defaults, literal values, inherited DOM attributes, JSDoc status)
and that `manifestProblems` flags a component whose props accept `className`/`style` (`Leaky`).
