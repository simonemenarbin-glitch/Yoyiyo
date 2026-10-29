import { BRAND } from '../data/knowledge'

type Props = {
  onOpenDesk: () => void
}

export function Landing({ onOpenDesk }: Props) {
  return (
    <div>
      <header className="site-nav">
        <div className="brand-mark">
          Yoyiyo <span>Desk AI</span>
        </div>
        <div className="nav-actions">
          <a className="btn btn-ghost" href="#come-funziona">
            Come funziona
          </a>
          <button type="button" className="btn btn-primary" onClick={onOpenDesk}>
            Apri il desk
          </button>
        </div>
      </header>

      <section className="hero" aria-label="Hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-copy">
          <h1>Yoyiyo Desk AI</h1>
          <p>
            L’assistente pensato per agenzie di viaggio e tour operator: programmi,
            risposte e formula giusta — senza mischiare Tour pronti, Su misura e
            Groupage.
          </p>
          <div className="hero-ctas">
            <button type="button" className="btn btn-primary" onClick={onOpenDesk}>
              Prova il desk
            </button>
            <a className="btn btn-ghost" href={BRAND.site} target="_blank" rel="noreferrer">
              Vai a yoyiyo.biz
            </a>
          </div>
        </div>
      </section>

      <section className="section section-narrow" id="come-funziona">
        <h2>Un desk, quattro lavori</h2>
        <p className="lead">
          Stesso tono del banco Yoyiyo: italiano, B2B, operativo. Il brief del
          cliente diventa testo pronto da raffinare.
        </p>
        <ul className="feature-list">
          <li>
            <h3>Programma</h3>
            <p>
              Bozza giorno per giorno su basi FIT reali (Classico, Triangolo
              d’oro, Zhangjiajie, Yunnan…).
            </p>
          </li>
          <li>
            <h3>Email / WhatsApp</h3>
            <p>
              Risposta all’agenzia con formula, scheda e call-to-action verso il
              preventivo.
            </p>
          </li>
          <li>
            <h3>Formula & FAQ</h3>
            <p>
              Qualcuno ogni giorno o muoversi da soli? Visto 2026, prezzi, prima
              volta — risposte da desk.
            </p>
          </li>
        </ul>
      </section>

      <section className="section band">
        <div className="section-narrow">
          <h2>Fatto per chi vende Cina ogni giorno</h2>
          <p className="lead">
            Yoyiyo è DMC e tour operator italiano (MTI SRL, Bologna) con
            operatività diretta in Cina. Desk AI porta quella disciplina prodotto
            nel flusso dell’agenzia.
          </p>
          <button type="button" className="btn btn-primary" onClick={onOpenDesk}>
            Apri Yoyiyo Desk AI
          </button>
        </div>
      </section>

      <footer className="site-footer">
        <strong>Yoyiyo</strong> · {BRAND.legal} · {BRAND.seat} · {BRAND.vat}
        <br />
        Agenzie: {BRAND.emailB2b} · WhatsApp {BRAND.whatsapp}
      </footer>
    </div>
  )
}
