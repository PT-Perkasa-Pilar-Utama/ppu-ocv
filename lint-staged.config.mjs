// Runs on staged files only. `oxfmt` is given the staged paths (it writes in
// place by default) and lint-staged re-stages whatever it rewrites — so a
// commit only ever touches the files you staged. Lint and type-check run
// repo-wide (they only read), gating the commit on a clean tree.
export default {
  "*.{js,jsx,ts,tsx,mjs,cjs}": ["oxfmt", () => "bun run lint"],
  "*.{ts,tsx}": () => "bun run type-check",
};
