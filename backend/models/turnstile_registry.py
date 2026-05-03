from config import settings


class TurnstileRegistry:
    """Registry that mirrors the frontend TURNSTILE_CONFIG."""

    TYPES = {
        "stable": {
            "count": 5,
            "label": "Dipendenti Stabili",
            "automation": "Totale",
        },
        "nonStable": {
            "count": 2,
            "label": "Personale Non Stabile",
            "automation": "Soglie Conservative",
        },
        "visitor": {
            "count": 1,
            "label": "Visitatori / Eccezioni",
            "automation": "Escalation Frequente",
        },
    }

    # Sample identity pools per type
    IDENTITIES = {
        "stable": [
            "Marco R.", "Laura B.", "Alessandro F.", "Giulia C.", "Francesco M.",
            "Sofia L.", "Andrea P.", "Valentina D.", "Lorenzo T.", "Chiara S.",
        ],
        "nonStable": [
            "Davide M.", "Elena S.", "Paolo V.", "Federica G.",
        ],
        "visitor": [
            "Cliente Alpha", "Manutentore Beta", "Fornitore Gamma",
        ],
    }

    def get_all(self) -> list[dict]:
        result = []
        for ttype, config in self.TYPES.items():
            thresholds = settings.THRESHOLDS[ttype]
            identities = self.IDENTITIES[ttype]
            for i in range(config["count"]):
                tid = self._make_id(ttype, i + 1)
                result.append({
                    "id": tid,
                    "type": ttype,
                    "label": config["label"],
                    "automation": config["automation"],
                    "thresholds": thresholds,
                    "person_name": identities[i % len(identities)],
                    "company": "TechCorp SpA" if ttype == "stable" else "DataSys Srl",
                })
        return result

    def get_by_id(self, turnstile_id: str) -> dict | None:
        for t in self.get_all():
            if t["id"] == turnstile_id:
                return t
        return None

    @staticmethod
    def _make_id(ttype: str, num: int) -> str:
        prefix = {"stable": "STABLE", "nonStable": "NONSTABLE", "visitor": "VISITOR"}
        return f"{prefix[ttype]}-{num}"


turnstile_registry = TurnstileRegistry()
