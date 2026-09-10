import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <Link href="/projekter" className="hint">← Projekter</Link>
      <h1 className="page-title">Privatliv</h1>
      <div className="card stack">
        <p className="hint">
          Højfynsspartel behandler fotos og projektdata for at dokumentere håndværksarbejde
          og vise udvalgte før/efter-eksempler offentligt, når et projekt er godkendt og publiceret.
        </p>
        <p className="hint">
          Login-brugere (mester/admin) har adgang til interne projekter. Offentlige sider viser
          kun publicerede projekter markeret til offentlig visning.
        </p>
        <p className="hint">
          Billeder gemmes i appens lagring (lokalt eller Vercel Blob i demo). Kontakt firmaet
          for indsigt, rettelse eller sletning.
        </p>
        <p className="hint">
          Denne app er et separat produktdemo og er ikke den almindelige marketinghjemmeside.
        </p>
      </div>
    </main>
  );
}
