import { APP_NAME } from "@app/shared";
import { Button } from "@/shared/ui/button";
import "./App.css";

function App() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      <Button>Click me</Button>
    </main>
  );
}

export default App;
