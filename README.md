# Token Rush

A 3D endless runner for the browser (three.js + TypeScript). You are a developer running through
construction and infrastructure sites, collecting tokens and dodging tech debt.

> Unaffiliated with any employer or brand. No third-party logos or assets are used.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview
```

## Scripts

`typecheck`, `lint`, `test`, `test:e2e`, `screenshot`, `format`.

## Development process

- `main` is always green. Work happens on branches named `phase-N-short-name`.
- Conventional commits (`feat:`, `fix:`, `chore:` ...), one PR per branch, squash merge after CI passes.
- All gameplay numbers live in `src/data/tuning.ts`.
- 3D objects are modelled in Blender (`art/*.blend`) and exported as `.glb` to `public/models/`.

## License

MIT
