import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { APP_NAME } from "@app/shared";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-6">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="h-24 p-6" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="h-24 p-6" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="h-24 p-6" alt="React logo" />
        </a>
      </div>
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      <p className="text-lg text-muted-foreground">Welcome to Tauri + React + TS + Tailwind</p>
      <button
        type="button"
        onClick={() => setCount((count) => count + 1)}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
      >
        count is {count}
      </button>
    </main>
  );
}

export default App;
