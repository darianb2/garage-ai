# Web Dev Notes

Concepts from the Garage AI build, explained from a Python starting point.

## Two halves: backend and frontend

- **Backend = Flask (Python).** You already know this. It runs on the server, talks to
  databases/APIs, and returns data. In Garage AI it returns JSON (not HTML) from
  routes like `/api/profile`.
- **Frontend = React (JavaScript).** New. It runs in the browser and builds the UI the
  user sees and clicks. It asks the backend for data and renders it.

They are separate programs that talk over HTTP using JSON.

## How they talk: the JSON API + the proxy

- The backend exposes endpoints (`/api/catalog`, `/api/profile`). The frontend calls
  them with `fetch(...)` and gets JSON back (like a Python dict).
- In development they run on two ports (Flask :5000, React :5173). The **Vite proxy**
  forwards `/api/*` from :5173 to :5000 so the browser thinks it's one website.
  (See frontend/vite.config.js.)

## React basics (with Python analogies)

- **Component** = a function that returns UI (JSX). Like a Python function that returns
  a chunk of page. Example: `Landing`, `VehicleHub`.
- **JSX** = HTML written inside JavaScript. `<div className="...">` (note: `className`,
  not `class`).
- **props** = arguments passed into a component, like function parameters:
  `<VehicleHub vehicle={...} />`.
- **state** (`useState`) = a variable React watches; when it changes, the UI re-renders.
  `const [tab, setTab] = useState("profile")` — `tab` is the value, `setTab` updates it.
- **effects** (`useEffect`) = run code after render, e.g. fetch data when a component
  appears. The "fetch the profile when the vehicle changes" logic is an effect.

## The build step (vs pip / venv)

- **npm** is JavaScript's package manager (like pip). **package.json** lists
  dependencies (like requirements.txt). **node_modules/** is where they install
  (like .venv) — it is gitignored, never committed.
- **Vite** is the dev server + bundler. `npm run dev` = live-reloading dev server.
  `npm run build` = compile everything into static files for production.
- **Node.js** runs all of this. Installed locally to ~/.local (no sudo).

## The 3D layer

- **Three.js** is the JavaScript 3D engine. **react-three-fiber (R3F)** lets you write
  Three.js as React components (`<Canvas>`, `<mesh>`). **drei** adds helpers like
  `OrbitControls` (drag to rotate).
- **WebGL** is the browser feature that actually draws 3D using the GPU. If a browser
  can't start WebGL (GPU off, VM, blocklisted), nothing 3D renders — so we check for it
  and show a fallback message (see Viewer3D.jsx + lib/webgl.js).

## Tailwind CSS

- Instead of writing CSS files, you put utility classes on elements:
  `className="rounded-xl bg-zinc-900 p-4"`. Each class is one style. Faster once you
  learn the vocabulary; the dark/amber look is all Tailwind classes.
