export default function HomePage() {
  return (
    <main>
      <header className="header">
        <div className="container">
          <strong>GitSignal</strong>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Turn GitHub activity into a developer profile.</h1>

          <p>
            GitSignal connects to GitHub, analyzes repository activity metadata,
            and generates developer scores, repository summaries, and a
            career-ready profile report. It does not read or store source code.
          </p>

          <div style={{ marginTop: 32 }}>
            <a className="button" href="/api/auth/github/start">
              Continue with GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}