import { Route, Router } from '@solidjs/router';

export function App() {
  return (
    <Router>
      <Route path="/" component={HomePage} />
    </Router>
  );
}

function HomePage() {
  return (
    <main class="min-h-screen bg-stone-50 p-8 text-stone-900">
      <h1 class="text-2xl font-bold">JOKGER</h1>
    </main>
  );
}
