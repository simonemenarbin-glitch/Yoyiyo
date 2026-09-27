import tempfile
import unittest
from pathlib import Path

from motore.__main__ import esegui, leggi_verifica
from motore.giudizio import Risposta, giudica
from motore.somma import Frammento, netto_accettabile, proponi


def _risposte(**valori: str) -> dict[str, Risposta]:
    base = {
        "V1": "4",
        "V2": "si",
        "V3": "si",
        "V4": "yoyiyo",
        "V5": "si",
        "V6": "no",
        "V7": "no",
        "V8": "si",
        "V9": "no",
    }
    base.update(valori)
    return {
        vid: Risposta(id=vid, testo="", risposta=valore, nota="")
        for vid, valore in base.items()
    }


class SommaTest(unittest.TestCase):
    def test_proposta_e_sotto_soglia_restano_separati(self) -> None:
        pezzi = [
            Frammento("A", "Cina classica", "2026-W42", 4, 1300),
            Frammento("B", "Cina classica", "2026-W42", 3, 1250),
            Frammento("C", "Cina classica", "2026-W42", 4, 1400),
            Frammento("D", "Giappone", "2026-W42", 6, 2000),
        ]
        proposte = {p.corridoio: p for p in proponi(pezzi, 10, 16)}
        cina = proposte["Cina classica"]
        self.assertEqual(cina.stato, "proposta")
        self.assertEqual(cina.persone, 11)
        self.assertEqual(cina.tetto_comune, 1250)
        self.assertTrue(netto_accettabile(cina, 1250))
        self.assertFalse(netto_accettabile(cina, 1251))
        self.assertEqual(proposte["Giappone"].stato, "sotto_soglia")
        self.assertEqual(proposte["Giappone"].manca, 4)

    def test_sopra_massimo(self) -> None:
        pezzi = [
            Frammento("A", "Cina", "2026-W42", 10, 1000),
            Frammento("B", "Cina", "2026-W42", 9, 1000),
        ]
        [proposta] = proponi(pezzi, 10, 16)
        self.assertEqual(proposta.stato, "sopra_massimo")
        self.assertEqual(proposta.eccedenza, 3)

    def test_rifiuta_pax_zero(self) -> None:
        with self.assertRaises(ValueError):
            Frammento("A", "Cina", "2026-W42", 0, 1000)


class GiudizioTest(unittest.TestCase):
    def test_pilota(self) -> None:
        esito = giudica(_risposte())
        self.assertEqual(esito.stato, "pilota")
        self.assertEqual(esito.organizzatore, "yoyiyo")
        self.assertEqual(esito.b2c, "aperto_dopo_conferma")

    def test_in_attesa_se_manca_v4(self) -> None:
        esito = giudica(_risposte(V4=""))
        self.assertEqual(esito.stato, "in_attesa")

    def test_muore_se_il_fornitore_parte_in_due(self) -> None:
        esito = giudica(_risposte(V9="si"))
        self.assertEqual(esito.stato, "morta")

    def test_si_rifa_se_esiste_gia(self) -> None:
        esito = giudica(_risposte(V6="sì"))
        self.assertEqual(esito.stato, "da_rifare")

    def test_domanda_zero_uccide(self) -> None:
        esito = giudica(_risposte(V1="0"))
        self.assertEqual(esito.stato, "morta")

    def test_una_volta_al_mese_e_un_pilota_debole(self) -> None:
        esito = giudica(_risposte(V1="circa 1"))
        self.assertEqual(esito.stato, "pilota_debole")

    def test_sgarbo_alle_agenzie_chiude_il_pubblico(self) -> None:
        esito = giudica(_risposte(V7="si"))
        self.assertEqual(esito.stato, "pilota")
        self.assertEqual(esito.b2c, "chiuso")

    def test_non_so_tiene_fermo_il_pilota(self) -> None:
        esito = giudica(_risposte(V3="non-so"))
        self.assertEqual(esito.stato, "in_attesa")


class EseguiTest(unittest.TestCase):
    def test_non_sovrascrive_le_risposte(self) -> None:
        with tempfile.TemporaryDirectory() as cartella:
            root = Path(cartella)
            self.assertEqual(esegui(root), "in_attesa")
            percorso = root / "verifica" / "ciclo-001.md"
            originale = percorso.read_text(encoding="utf-8")
            testo = percorso.read_text(encoding="utf-8")
            self.assertEqual(testo, originale)
            testo = re_sub_risposta(testo, "V6", "no")
            percorso.write_text(testo, encoding="utf-8")
            self.assertEqual(esegui(root), "in_attesa")
            riletto = leggi_verifica(percorso.read_text(encoding="utf-8"))
            self.assertEqual(riletto["V6"].risposta, "no")
            self.assertEqual(riletto["V2"].risposta, "")
            dossier = (root / "dossier" / "ciclo-001.md").read_text(encoding="utf-8")
            self.assertIn("Soglia", dossier)
            self.assertIn("V4", dossier)
            ciclo_2 = (root / "dossier" / "ciclo-002.md").read_text(encoding="utf-8")
            self.assertIn("**in_attesa**", ciclo_2)

    def test_ciclo_2_quando_il_verificatore_compila(self) -> None:
        with tempfile.TemporaryDirectory() as cartella:
            root = Path(cartella)
            esegui(root)
            percorso = root / "verifica" / "ciclo-001.md"
            testo = percorso.read_text(encoding="utf-8")
            for vid, valore in {
                "V1": "4",
                "V2": "si",
                "V3": "si",
                "V4": "yoyiyo",
                "V6": "no",
                "V9": "no",
            }.items():
                testo = re_sub_risposta(testo, vid, valore)
            percorso.write_text(testo, encoding="utf-8")
            self.assertEqual(esegui(root), "pilota")
            ciclo_2 = (root / "dossier" / "ciclo-002.md").read_text(encoding="utf-8")
            self.assertIn("**pilota**", ciclo_2)
            self.assertIn("yoyiyo", ciclo_2)


def re_sub_risposta(testo: str, vid: str, valore: str) -> str:
    import re

    pattern = rf"(## {vid}\n.*?^risposta:)[ \t]*[^\n]*$"
    return re.sub(pattern, rf"\1 {valore}", testo, count=1, flags=re.M | re.S)


if __name__ == "__main__":
    unittest.main()
