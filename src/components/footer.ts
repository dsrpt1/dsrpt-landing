export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-dsrpt-mute flex items-center justify-between">
        <div>© {new Date().getFullYear()} DSRPT</div>
        <div className="flex gap-4">
          <a href="/quote" className="hover:text-white">Get Quote</a>
          <a href="/policies" className="hover:text-white">Policies</a>
          <a href="mailto:hello@dsrpt.finance" className="hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}
