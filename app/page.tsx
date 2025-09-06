export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">DSRPT</h1>
        <p className="text-neutral-400">Parametric risk pricing & hazard curves.</p>
        <div className="space-x-3">
          <a
            href="/quote"
            className="inline-flex items-center rounded-2xl bg-white/10 hover:bg-white/20 transition px-4 py-2"
          >
            Open Hazard Curve Quote
          </a>
        </div>
      </div>
    </main>
  );
}
